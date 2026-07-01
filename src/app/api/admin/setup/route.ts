/**
 * GET /api/admin/setup
 * Storage is now JSON files on disk — no Shopify setup needed.
 * This endpoint is kept for backward compatibility but does nothing.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Storage uses local JSON files. No setup required.",
  });
}
