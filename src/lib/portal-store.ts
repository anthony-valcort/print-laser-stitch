/**
 * Customer portals: one private page per company, with its own products,
 * mockups and prices. Stored as one JSON Shop metafield in Shopify (same
 * pattern as the gallery), so no new database is needed.
 *
 * Namespace "pls_portal", key "companies".
 */

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { shopifyAdminFetch } from "./shopify";
import { getAdminPasswordHash } from "./vehicle-shopify";
import {
  PORTAL_MAX_QTY,
  quotePortalLine,
  unitPriceFor,
  type PortalProduct,
  type PortalQuote,
  type PortalTier,
} from "./portal-pricing";

export { PORTAL_MAX_QTY, PORTAL_TAX_RATE, quotePortalLine, unitPriceFor } from "./portal-pricing";
export type { PortalProduct, PortalQuote, PortalTier } from "./portal-pricing";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const NS = "pls_portal";
const KEY = "companies";

export const PORTAL_COOKIE_PREFIX = "pls_portal_";
export const PORTAL_SESSION_DAYS = 14;
/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PortalCompany = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  welcome: string;
  active: boolean;
  /** "salt:hash" (scrypt). Never sent to a browser. */
  passwordHash: string;
  products: PortalProduct[];
  /** Saved by the customer: who to contact, ship-to, notes. */
  info?: PortalInfo;
  /** Custom requests sent from the portal. Newest first. */
  requests?: PortalRequest[];
  /** Shopify order ids an admin linked to this company (past orders). */
  orderIds?: string[];
  /** Trade, like "HVAC, Plumbing & Electric". Admin-set. */
  category?: string;
  /** The matching customer in the Team Hub (Base44). Never sent to browsers. */
  customerId?: string;
  /** Private notes for us. Never sent to customers. */
  adminNotes?: string;
  /** "partner" = yearly Partner member. */
  plan?: "" | "partner";
  createdAt: string;
  updatedAt: string;
};

export type PortalInfo = {
  contact: string;
  phone: string;
  email: string;
  shipTo: string;
  poNumber: string;
  notes: string;
};

export type PortalRequest = {
  id: string;
  title: string;
  details: string;
  qty: string;
  needBy: string;
  contact: string;
  phone: string;
  email: string;
  status: "new" | "quoted" | "done";
  createdAt: string;
};

export const EMPTY_INFO: PortalInfo = {
  contact: "",
  phone: "",
  email: "",
  shipTo: "",
  poNumber: "",
  notes: "",
};

export function cleanInfo(raw: unknown): PortalInfo {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    contact: s(o.contact, 80),
    phone: s(o.phone, 40),
    email: s(o.email, 160),
    shipTo: s(o.shipTo, 300),
    poNumber: s(o.poNumber, 60),
    notes: s(o.notes, 600),
  };
}

/** Checks the portal cookie for this company. Returns it, or null. */
export async function authedCompany(
  companyId: string,
  cookieValue: string | undefined,
): Promise<PortalCompany | null> {
  const c = await getCompanyById(companyId.slice(0, 40));
  if (!c) return null;
  return (await verifyPortalToken(cookieValue, c)) ? c : null;
}

/** What a browser is allowed to see. */
export type PortalCompanyPublic = Omit<
  PortalCompany,
  "passwordHash" | "adminNotes" | "customerId"
>;

export function toPublic(c: PortalCompany): PortalCompanyPublic {
  const { passwordHash: _a, adminNotes: _b, customerId: _c, ...rest } = c;
  void _a;
  void _b;
  void _c;
  return rest;
}

/** Same company name written differently ("Acme, LLC" vs "ACME") matches. */
export function normName(n: string): string {
  return n
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(llc|inc|corp|corporation|co|company|ltd|the|of|and)\b/g, "")
    .replace(/\s+/g, "");
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

let shopId: string | null = null;
async function getShopId(): Promise<string> {
  if (shopId) return shopId;
  const d = await shopifyAdminFetch<{ shop: { id: string } }>(
    `query { shop { id } }`,
    {},
    { revalidate: 0 },
  );
  const id = d.shop.id;
  shopId = id;
  return id;
}

/* Shopify caps a JSON metafield at 131072 bytes, so the list is split
   across several metafields: "companies", "companies_1", "companies_2"... */
const MAX_SHARDS = 24;
const SHARD_BYTES = 110000;
const shardKey = (i: number) => (i === 0 ? KEY : `${KEY}_${i}`);

export async function getAllCompanies(): Promise<PortalCompany[]> {
  try {
    const d = await shopifyAdminFetch<{
      shop: { metafields: { nodes: { key: string; value: string }[] } };
    }>(
      `query PortalMeta($ns: String!) {
        shop { metafields(namespace: $ns, first: 50) { nodes { key value } } }
      }`,
      { ns: NS },
      { revalidate: 0 },
    );
    const byKey = new Map(d.shop.metafields.nodes.map((n) => [n.key, n.value]));
    const out: PortalCompany[] = [];
    for (let i = 0; i < MAX_SHARDS; i++) {
      const raw = byKey.get(shardKey(i));
      if (!raw) continue;
      const list = JSON.parse(raw) as PortalCompany[];
      if (Array.isArray(list)) out.push(...list);
    }
    return out;
  } catch (err) {
    console.error("[portal] read failed:", err);
    return [];
  }
}

export async function saveAllCompanies(list: PortalCompany[]): Promise<void> {
  const ownerId = await getShopId();
  const shards: PortalCompany[][] = [[]];
  let size = 2;
  for (const c of list) {
    const n = Buffer.byteLength(JSON.stringify(c)) + 1;
    if (size + n > SHARD_BYTES && shards[shards.length - 1].length) {
      shards.push([]);
      size = 2;
    }
    shards[shards.length - 1].push(c);
    size += n;
  }
  if (shards.length > MAX_SHARDS) throw new Error("Portal list is too big");
  const metafields = [];
  for (let i = 0; i < MAX_SHARDS; i++) {
    metafields.push({
      ownerId,
      namespace: NS,
      key: shardKey(i),
      type: "json",
      value: JSON.stringify(shards[i] ?? []),
    });
  }
  const d = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: { message: string }[] };
  }>(
    `mutation PortalSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    { metafields },
    { revalidate: 0 },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}

export async function getCompanyBySlug(
  slug: string,
): Promise<PortalCompany | null> {
  const list = await getAllCompanies();
  return list.find((c) => c.slug === slug) ?? null;
}

export async function getCompanyById(id: string): Promise<PortalCompany | null> {
  const list = await getAllCompanies();
  return list.find((c) => c.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Passwords + sign-in cookie                                          */
/* ------------------------------------------------------------------ */

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(scryptSync(pw, salt, 32).toString("hex"));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function secret(): Promise<string> {
  return (
    process.env.PORTAL_SECRET ||
    (await getAdminPasswordHash()) ||
    "pls-portal-fallback-secret"
  );
}

export function portalCookieName(companyId: string): string {
  return `${PORTAL_COOKIE_PREFIX}${companyId}`;
}

/** Signed token: "<base64url payload>.<hmac>". Ties to the password hash,
 * so changing a company's password signs everyone out. */
export async function signPortalToken(c: PortalCompany): Promise<string> {
  const exp = Date.now() + PORTAL_SESSION_DAYS * 86400_000;
  const payload = Buffer.from(JSON.stringify({ c: c.id, e: exp })).toString(
    "base64url",
  );
  const sig = createHmac("sha256", (await secret()) + c.passwordHash)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export async function verifyPortalToken(
  token: string | undefined | null,
  company: PortalCompany,
): Promise<boolean> {
  if (!token || !company.active) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const want = createHmac("sha256", (await secret()) + company.passwordHash)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      c?: string;
      e?: number;
    };
    return p.c === company.id && typeof p.e === "number" && p.e > Date.now();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Pricing (the checkout uses this too, so the browser can't change it) */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Cleaning what the admin sends                                       */
/* ------------------------------------------------------------------ */

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function n(v: unknown, min: number, max: number, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
}
function url(v: unknown): string {
  const x = s(v, 800);
  return /^https:\/\//i.test(x) ? x : "";
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return base || "company";
}

export function cleanProduct(raw: unknown): PortalProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = s(o.name, 80);
  if (!name) return null;
  const sizes = Array.isArray(o.sizes)
    ? Array.from(
        new Set(
          o.sizes
            .map((x) => s(x, 12))
            .filter(Boolean),
        ),
      ).slice(0, 14)
    : [];
  const upcharge: Record<string, number> = {};
  if (o.upcharge && typeof o.upcharge === "object") {
    for (const [k, v] of Object.entries(o.upcharge as Record<string, unknown>)) {
      const amt = n(v, 0, 1000);
      if (amt > 0 && sizes.includes(k)) upcharge[k] = round2(amt);
    }
  }
  const tiers: PortalTier[] = Array.isArray(o.tiers)
    ? o.tiers
        .map((t) => {
          const r = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
          return {
            minQty: Math.floor(n(r.minQty, 1, PORTAL_MAX_QTY)),
            price: round2(n(r.price, 0, 100000)),
          };
        })
        .filter((t) => t.minQty > 1 && t.price > 0)
        .slice(0, 8)
    : [];
  return {
    id: s(o.id, 40) || `p_${randomBytes(4).toString("hex")}`,
    name,
    category: s(o.category, 40),
    description: s(o.description, 400),
    imageUrl: url(o.imageUrl),
    price: round2(n(o.price, 0, 100000)),
    tiers,
    sizes,
    upcharge,
    minQty: Math.max(1, Math.floor(n(o.minQty, 1, PORTAL_MAX_QTY, 1))),
    note: s(o.note, 200),
    active: o.active !== false,
  };
}
