import { type NextRequest, NextResponse } from "next/server";
import { sha256, getAdminPasswordHash } from "@/lib/vehicle-shopify";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const inputHash = sha256(password);
  const storedHash = await getAdminPasswordHash();

  if (inputHash !== storedHash) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Token = SHA-256 hash of the password
  return NextResponse.json({ token: inputHash });
}
