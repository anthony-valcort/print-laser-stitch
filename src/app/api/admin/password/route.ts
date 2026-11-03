/**
 * POST /api/admin/password
 * Body: { currentPassword: string; newPassword: string }
 * Verifies the current password, then stores the SHA-256 hash of the new
 * password in Shopify's admin_config metaobject.
 * Returns { token } — the new session token the client should store.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  sha256,
  getAdminPasswordHash,
  setAdminPasswordHash,
  safeEqual,
} from "@/lib/vehicle-shopify";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.newPassword.length < 12) {
    return NextResponse.json(
      { error: "New password must be at least 12 characters" },
      { status: 400 },
    );
  }

  const currentHash = sha256(body.currentPassword);
  const storedHash = await getAdminPasswordHash();

  if (!storedHash || !safeEqual(currentHash, storedHash)) {
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = sha256(body.newPassword);
  await setAdminPasswordHash(newHash);

  return NextResponse.json({ token: newHash });
}
