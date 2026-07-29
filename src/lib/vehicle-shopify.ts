/**
 * Vehicle + admin data — stored as Shop metafields in Shopify.
 * Namespace: "pls_data"
 * Keys: "vehicles" (json), "admin_hash" (single_line_text_field)
 *
 * Required scopes: read_metafields, write_metafields
 */

import { createHash } from "crypto";
import { shopifyAdminFetch } from "./shopify";
import { SEED_VEHICLES, type PartKey, type StickerPart, type VehicleSticker } from "./vehicle-sticker-data";

const NS = "pls_data";

// ─── Shop GID (cached per process) ───────────────────────────────────────────
let _shopId: string | null = null;
async function getShopId(): Promise<string> {
  if (_shopId) return _shopId;
  const d = await shopifyAdminFetch<{ shop: { id: string } }>(`query { shop { id } }`);
  _shopId = d.shop.id;
  return _shopId;
}

// ─── Low-level metafield helpers ──────────────────────────────────────────────
async function readMetafield(key: string, revalidate?: number | false): Promise<string | null> {
  const d = await shopifyAdminFetch<{
    shop: { metafield: { value: string } | null };
  }>(
    `query GetMeta($ns: String!, $key: String!) {
      shop { metafield(namespace: $ns, key: $key) { value } }
    }`,
    { ns: NS, key },
    revalidate !== undefined ? { revalidate } : {},
  );
  return d.shop.metafield?.value ?? null;
}

async function writeMetafield(
  key: string,
  type: string,
  value: string,
): Promise<void> {
  const ownerId = await getShopId();
  const d = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: { field: string; message: string }[] };
  }>(
    `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    { metafields: [{ ownerId, namespace: NS, key, type, value }] },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}

// ─── Vehicle CRUD ─────────────────────────────────────────────────────────────
/**
 * Shopify's Admin GraphQL API has been intermittently slow/hanging for this
 * particular metafield read (observed 20s+ stalls in production, not just a
 * cold start), which left the mobile app's Vehicle Sticker Kits screen stuck
 * on a spinner forever. The catalog barely changes, so cache the public read
 * for 5 minutes — most requests now never touch Shopify at all. Admin
 * writes (below) always read fresh so they never clobber another edit with
 * stale cached data.
 */
export async function getAllVehicles(opts: { fresh?: boolean } = {}): Promise<VehicleSticker[]> {
  try {
    const raw = await readMetafield("vehicles", opts.fresh ? 0 : 300);
    if (!raw) return SEED_VEHICLES;
    const list = JSON.parse(raw) as VehicleSticker[];
    return list.length ? list : SEED_VEHICLES;
  } catch {
    return SEED_VEHICLES;
  }
}

async function saveVehicles(list: VehicleSticker[]): Promise<void> {
  await writeMetafield("vehicles", "json", JSON.stringify(list));
}

export async function createVehicle(
  v: Omit<VehicleSticker, "id">,
): Promise<VehicleSticker> {
  const current = await getAllVehicles({ fresh: true });
  const isSeedOnly = current.every((c) => SEED_VEHICLES.some((s) => s.id === c.id));
  const base = isSeedOnly ? [] : current;
  const vehicle: VehicleSticker = { ...v, id: `v${Date.now()}` };
  await saveVehicles([...base, vehicle]);
  return vehicle;
}

export async function updateVehicle(
  id: string,
  patch: Omit<VehicleSticker, "id">,
): Promise<VehicleSticker> {
  const list = await getAllVehicles({ fresh: true });
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error(`Vehicle ${id} not found`);
  list[idx] = { ...patch, id };
  await saveVehicles(list);
  return list[idx];
}

export async function deleteVehicle(id: string): Promise<void> {
  const list = await getAllVehicles({ fresh: true });
  await saveVehicles(list.filter((v) => v.id !== id));
}

// ─── Admin password hash ──────────────────────────────────────────────────────
export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function getAdminPasswordHash(): Promise<string> {
  try {
    const hash = await readMetafield("admin_hash");
    if (hash) return hash;
  } catch {}
  return sha256(process.env.ADMIN_PASSWORD ?? "admin123");
}

export async function setAdminPasswordHash(newHash: string): Promise<void> {
  await writeMetafield("admin_hash", "single_line_text_field", newHash);
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
export async function isAdminAuthorized(
  authHeader: string | null,
): Promise<boolean> {
  const token = (authHeader ?? "").replace("Bearer ", "");
  if (!token) return false;
  const stored = await getAdminPasswordHash();
  if (token === stored) return true;
  const legacy = Buffer.from(
    `admin:${process.env.ADMIN_PASSWORD ?? "admin123"}`,
  ).toString("base64");
  return token === legacy;
}
