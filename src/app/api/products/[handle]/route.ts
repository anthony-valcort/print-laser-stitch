import { NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify-products";

/** Public read-only product detail (incl. variants/options) — used by the
 * mobile app's product page, mirroring the collections API. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  try {
    const product = await getProductByHandle(handle);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
