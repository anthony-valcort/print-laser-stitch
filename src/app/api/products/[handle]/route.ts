import { NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify-products";
import { getTemplateFitOverrides } from "@/lib/product-template-fit-overrides";

/** Public read-only product detail (incl. variants/options) — used by the
 * mobile app's product page, mirroring the collections API. Also includes
 * `templateFitOverrides`, the same per-product Fit Studio overrides
 * (sizeUnit/showBleedTrim/fixedSizeInches) the website's own product pages
 * pass to GenericProductConfigurator — computed here from the single shared
 * map in product-template-fit-overrides.ts so the mobile app never has to
 * duplicate (and risk drifting from) that business logic. */
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
    return NextResponse.json({
      ...product,
      templateFitOverrides: getTemplateFitOverrides(handle),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
