import { type NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE_PREFIX } from "@/lib/portal-store";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith(PORTAL_COOKIE_PREFIX)) res.cookies.delete(c.name);
  }
  return res;
}
