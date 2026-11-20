import { type NextRequest, NextResponse } from "next/server";
import {
  PORTAL_SESSION_DAYS,
  getCompanyBySlug,
  portalCookieName,
  signPortalToken,
  verifyPassword,
} from "@/lib/portal-store";

export async function POST(req: NextRequest) {
  let body: { slug?: string; password?: string };
  try {
    body = (await req.json()) as { slug?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const slug = String(body.slug ?? "").slice(0, 80);
  const password = String(body.password ?? "").slice(0, 200);
  const company = slug ? await getCompanyBySlug(slug) : null;
  const ok =
    !!company &&
    company.active &&
    !!password &&
    verifyPassword(password, company.passwordHash);
  if (!ok || !company) {
    await new Promise((r) => setTimeout(r, 1200)); // slow down guessing
    return NextResponse.json(
      { error: "Wrong password. Try again." },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(portalCookieName(company.id), await signPortalToken(company), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PORTAL_SESSION_DAYS * 86400,
  });
  return res;
}
