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
} from "@/lib/vehicle-shopify";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const currentHash = sha256(body.currentPassword);
  const storedHash = await getAdminPasswordHash();

  // Also accept legacy base64 token format during transition
  const legacyOk =
    body.currentPassword === (process.env.ADMIN_PASSWORD ?? "admin123");

  if (currentHash !== storedHash && !legacyOk) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = sha256(body.newPassword);
  await setAdminPasswordHash(newHash);

  return NextResponse.json({ token: newHash });
}
