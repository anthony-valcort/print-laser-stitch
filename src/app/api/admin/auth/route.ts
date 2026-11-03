import { type NextRequest, NextResponse } from "next/server";
import { sha256, getAdminPasswordHash, safeEqual } from "@/lib/vehicle-shopify";

// Slows down password guessing: every failed attempt waits before answering.
const FAIL_DELAY_MS = 1500;

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const inputHash = sha256(password);
  const storedHash = await getAdminPasswordHash();

  if (!storedHash || !safeEqual(inputHash, storedHash)) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Token = SHA-256 hash of the password
  return NextResponse.json({ token: inputHash });
}
