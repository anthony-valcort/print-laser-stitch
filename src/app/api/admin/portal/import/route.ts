import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import {
  cleanInfo,
  getAllCompanies,
  normName,
  saveAllCompanies,
  slugify,
  type PortalCompany,
} from "@/lib/portal-store";

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Brings Team Hub customers in as portal companies. It only ADDS and FILLS
 * BLANKS: nothing you already typed is replaced, and nobody gets a live
 * portal (new ones start switched off, with no password).
 * Body: { customers: [{ customerId, name, contact, phone, email, shipTo, category, notes }] }
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { customers?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad file." }, { status: 400 });
  }
  const incoming = (Array.isArray(body.customers) ? body.customers : []).slice(0, 3000);
  if (incoming.length === 0) {
    return NextResponse.json({ error: "No customers in that file." }, { status: 400 });
  }

  const list = await getAllCompanies();
  const byName = new Map<string, PortalCompany>();
  const byId = new Map<string, PortalCompany>();
  for (const c of list) {
    byName.set(normName(c.name), c);
    if (c.customerId) byId.set(c.customerId, c);
  }

  let created = 0;
  let merged = 0;
  const now = new Date().toISOString();
  const fresh: PortalCompany[] = [];

  for (const raw of incoming) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const name = s(r.name, 80);
    const key = normName(name);
    if (!name || !key) continue;
    const customerId = s(r.customerId, 40);
    const info = cleanInfo({
      contact: r.contact,
      phone: r.phone,
      email: r.email,
      shipTo: r.shipTo,
    });
    const category = s(r.category, 60);
    const notes = s(r.notes, 1500);

    const hit = (customerId && byId.get(customerId)) || byName.get(key);
    if (hit) {
      const cur = hit.info ?? cleanInfo({});
      hit.info = {
        ...cur,
        contact: cur.contact || info.contact,
        phone: cur.phone || info.phone,
        email: cur.email || info.email,
        shipTo: cur.shipTo || info.shipTo,
      };
      if (!hit.customerId && customerId) hit.customerId = customerId;
      if (!hit.category && category) hit.category = category;
      if (!hit.adminNotes && notes) hit.adminNotes = notes;
      hit.updatedAt = now;
      merged++;
      continue;
    }
    const company: PortalCompany = {
      id: `co_${randomBytes(5).toString("hex")}`,
      slug: `${slugify(name)}-${randomBytes(3).toString("hex")}`,
      name,
      logoUrl: "",
      welcome: "",
      active: false,
      passwordHash: "",
      products: [],
      info,
      category,
      customerId,
      adminNotes: notes,
      createdAt: now,
      updatedAt: now,
    };
    fresh.push(company);
    byName.set(key, company);
    if (customerId) byId.set(customerId, company);
    created++;
  }

  try {
    await saveAllCompanies([...list, ...fresh]);
  } catch (err) {
    console.error("[admin/portal/import] save failed:", err);
    return NextResponse.json(
      {
        error: `Couldn't save to Shopify. Nothing was changed. (${
          err instanceof Error ? err.message.slice(0, 200) : "unknown"
        })`,
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, created, merged, total: list.length + created });
}
