import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import {
  cleanProduct,
  getAllCompanies,
  hashPassword,
  saveAllCompanies,
  slugify,
  toPublic,
  type PortalCompany,
} from "@/lib/portal-store";
import { randomBytes } from "node:crypto";

async function guard(req: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** GET: every company (no password hashes). */
export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const list = await getAllCompanies();
  return NextResponse.json({
    companies: list.map((c) => ({ ...toPublic(c), hasPassword: !!c.passwordHash })),
  });
}

/** POST: create or update one company. Body: { company, password? } */
export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  let body: { company?: Record<string, unknown>; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const raw = body.company ?? {};
  const name = str(raw.name, 80);
  if (!name) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  const list = await getAllCompanies();
  const id = str(raw.id, 40);
  const existing = id ? list.find((c) => c.id === id) : undefined;
  if (!existing && !password) {
    return NextResponse.json(
      { error: "Set a password for the new company." },
      { status: 400 },
    );
  }

  const logo = str(raw.logoUrl, 800);
  const products = (Array.isArray(raw.products) ? raw.products : [])
    .slice(0, 80)
    .map(cleanProduct)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const now = new Date().toISOString();
  const saved: PortalCompany = {
    id: existing?.id ?? `co_${randomBytes(5).toString("hex")}`,
    slug:
      existing?.slug ??
      `${slugify(name)}-${randomBytes(3).toString("hex")}`,
    name,
    logoUrl: /^https:\/\//i.test(logo) ? logo : "",
    welcome: str(raw.welcome, 300),
    active: raw.active !== false,
    passwordHash: password ? hashPassword(password) : (existing?.passwordHash ?? ""),
    products,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const next = existing
    ? list.map((c) => (c.id === saved.id ? saved : c))
    : [saved, ...list];
  try {
    await saveAllCompanies(next);
  } catch (err) {
    console.error("[admin/portal] save failed:", err);
    return NextResponse.json(
      { error: "Couldn't save to Shopify. Try again." },
      { status: 502 },
    );
  }
  return NextResponse.json({
    company: { ...toPublic(saved), hasPassword: true },
  });
}

/** DELETE ?id=co_xxx */
export async function DELETE(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const list = await getAllCompanies();
  if (!list.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await saveAllCompanies(list.filter((c) => c.id !== id));
  } catch {
    return NextResponse.json({ error: "Couldn't delete. Try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
