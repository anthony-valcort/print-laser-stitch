import { NextResponse } from "next/server";
import { getCollectionByHandle } from "@/lib/shopify-collections";

/** Public read-only collection detail (incl. its products) — used by the
 * admin Gallery form's sub-category dropdown once a main category is picked. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  try {
    const collection = await getCollectionByHandle(handle);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    return NextResponse.json(collection);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
