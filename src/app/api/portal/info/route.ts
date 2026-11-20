import { type NextRequest, NextResponse } from "next/server";
import {
  authedCompany,
  cleanInfo,
  getAllCompanies,
  portalCookieName,
  saveAllCompanies,
} from "@/lib/portal-store";

/** Customer saves their contact + ship-to info. */
export async function POST(req: NextRequest) {
  let b: { companyId?: string; info?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const id = typeof b.companyId === "string" ? b.companyId : "";
  const co = await authedCompany(id, req.cookies.get(portalCookieName(id))?.value);
  if (!co) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const info = cleanInfo(b.info);
  if (info.email && !/^\S+@\S+\.\S+$/.test(info.email)) {
    return NextResponse.json({ error: "That email looks wrong." }, { status: 400 });
  }
  const list = await getAllCompanies();
  const next = list.map((c) =>
    c.id === co.id ? { ...c, info, updatedAt: new Date().toISOString() } : c,
  );
  try {
    await saveAllCompanies(next);
  } catch {
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, info });
}
