import { NextResponse } from "next/server";
import { getAllCollections } from "@/lib/shopify-collections";

/** Public read-only list of real Shopify collections — used by the admin
 * Gallery form's main-category dropdown (needs to run client-side, and
 * getAllCollections() is a server-only function). */
export async function GET() {
  try {
    const collections = await getAllCollections();
    return NextResponse.json(collections);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
