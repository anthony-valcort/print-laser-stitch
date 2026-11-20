import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  authedCompany,
  getAllCompanies,
  portalCookieName,
  saveAllCompanies,
  type PortalRequest,
} from "@/lib/portal-store";

const BASE44_FN =
  "https://base44.app/api/apps/698a01d9c50002e4d14f9d23/functions/submitOrderRequest";

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Customer asks for something that isn't on their list. */
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const id = s(b.companyId, 40);
  const co = await authedCompany(id, req.cookies.get(portalCookieName(id))?.value);
  if (!co) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const title = s(b.title, 120);
  const details = s(b.details, 2000);
  const phone = s(b.phone, 40);
  const email = s(b.email, 160);
  if (!title) return NextResponse.json({ error: "Tell us what you need." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Add a phone number so we can call you." }, { status: 400 });
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "That email looks wrong." }, { status: 400 });
  }

  const item: PortalRequest = {
    id: `rq_${randomBytes(4).toString("hex")}`,
    title,
    details,
    qty: s(b.qty, 40),
    needBy: s(b.needBy, 40),
    contact: s(b.contact, 80) || co.name,
    phone,
    email,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const list = await getAllCompanies();
  const next = list.map((c) =>
    c.id === co.id
      ? { ...c, requests: [item, ...(c.requests ?? [])].slice(0, 100) }
      : c,
  );
  try {
    await saveAllCompanies(next);
  } catch {
    return NextResponse.json({ error: "Couldn't send. Try again." }, { status: 502 });
  }

  // Also drop it into the Team Hub (Base44) as a new lead. Best effort:
  // the request is already saved above even if this fails.
  try {
    await fetch(BASE44_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        name: item.contact,
        company: co.name,
        phone,
        email,
        category: "other",
        notes: `PORTAL REQUEST from ${co.name}\nWhat: ${title}${item.qty ? `\nHow many: ${item.qty}` : ""}${item.needBy ? `\nNeeded by: ${item.needBy}` : ""}\n\n${details || "(no details)"}`,
      }),
    });
  } catch (err) {
    console.error("[portal] Base44 forward failed:", err);
  }

  return NextResponse.json({ ok: true, request: item });
}
