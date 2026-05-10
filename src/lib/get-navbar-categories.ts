import {
  getAllActiveProducts,
  type ShopifyProductSummary,
} from "./shopify-products";
import { categories as fallbackCategories, type Category } from "./categories";

/**
 * Strip "(Minimum purchase 12)", "(min 6)", trailing punctuation etc. from a
 * Shopify product title so the navbar reads naturally.
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\((?:minimum|min)[^)]*\)\s*$/i, "")
    .replace(/\s*[-—|·]\s*(?:min|minimum)[^/]*$/i, "")
    .trim();
}

function shortDescription(text: string): string {
  const oneLine = text
    .replace(/\s+/g, " ")
    .trim();
  return oneLine.length > 110 ? `${oneLine.slice(0, 107)}…` : oneLine;
}

function summaryToCategory(p: ShopifyProductSummary): Category {
  const cleanedName = cleanTitle(p.title);
  const tagline = p.productType?.trim() || "Custom printed";
  return {
    slug: p.handle,
    name: cleanedName,
    tagline,
    description: shortDescription(p.description),
    imageUrl: p.featuredImage?.url,
    href: `/products/${p.handle}`,
  };
}

/**
 * Returns the categories used by the navbar and home page. Prefers a live
 * Shopify products list so Anthony's new products show up automatically;
 * falls back to the hardcoded list if Shopify is unreachable, mis-scoped, or
 * returns no products.
 */
export async function getNavbarCategories(): Promise<Category[]> {
  try {
    const products = await getAllActiveProducts();
    if (products.length === 0) return fallbackCategories;
    return products.map(summaryToCategory);
  } catch (err) {
    console.error("[getNavbarCategories] Shopify fetch failed:", err);
    return fallbackCategories;
  }
}
