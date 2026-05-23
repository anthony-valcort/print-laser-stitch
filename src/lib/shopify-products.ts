import { unstable_cache } from "next/cache";
import { shopifyAdminFetch } from "./shopify";
import { shopifyStorefrontFetch } from "./shopify-storefront";

export type ShopifyImage = {
  url: string;
  altText: string | null;
};

export type ShopifySelectedOption = {
  name: string;
  value: string;
};

export type ShopifyVariant = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  sku: string | null;
  selectedOptions: ShopifySelectedOption[];
  image: ShopifyImage | null;
};

export type ShopifyOption = {
  id: string;
  name: string;
  values: string[];
};

/**
 * Colours pulled from Shopify's standard product taxonomy metafield
 * (`shopify.color-pattern`). Anthony populates these in the product's
 * "Category metafields" section. We surface them as a fallback colour
 * picker for apparel products that hit Shopify's 3-options-per-product
 * limit and therefore can't add Color as a real variant option.
 */
export type TaxonomyColor = {
  /** Display name, e.g. "Royal Blue". */
  name: string;
  /** Shopify-provided hex like "#005BD3", or null if not set. */
  hex: string | null;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  options: ShopifyOption[];
  variants: ShopifyVariant[];
  /** Colours from `shopify.color-pattern` metafield — empty if not set. */
  taxonomyColors: TaxonomyColor[];
};

const PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      featuredImage { url altText }
      images(first: 20) {
        nodes { url altText }
      }
      options {
        id
        name
        values
      }
      variants(first: 100) {
        nodes {
          id
          title
          price
          compareAtPrice
          availableForSale
          sku
          selectedOptions { name value }
          image { url altText }
        }
      }
    }
  }
`;

type RawProductByHandleResp = {
  productByHandle: {
    id: string;
    handle: string;
    title: string;
    descriptionHtml: string;
    featuredImage: ShopifyImage | null;
    images: { nodes: ShopifyImage[] };
    options: ShopifyOption[];
    variants: {
      nodes: Array<Omit<ShopifyVariant, "image"> & { image: ShopifyImage | null }>;
    };
  } | null;
};

/**
 * Look at a Shopify product title for "Min N" / "Minimum N purchase" / "N min"
 * patterns and return the bulk-order minimum if present.
 *
 * Anthony's apparel listings encode this in the title — e.g. "T-Shirts
 * (Minimum purchase 12)" or "Custom Embroidered Polo (6 Minimum purchase)".
 * The dynamic catch-all route uses this to auto-switch to the size-matrix
 * configurator without needing a per-product page file.
 */
export function detectMinQuantityFromTitle(title: string): number | null {
  // "Min 12", "Minimum 12", "Min purchase 12", "Minimum purchase 12"
  const a = title.match(/\bmin(?:imum)?(?:\s+purchase)?\s+(\d+)/i);
  if (a) {
    const n = Number(a[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  // "12 Min", "12 Minimum", "12 Minimum purchase",
  // "6 Piece Minimum", "6 pcs minimum", "6-unit minimum" — i.e. a number
  // optionally followed by a unit word (piece/pcs/unit/pack/qty) then "min".
  const b = title.match(
    /\b(\d+)[-\s]+(?:pcs?|pieces?|units?|packs?|qty)?[-\s]*min(?:imum)?(?:\s+purchase)?/i,
  );
  if (b) {
    const n = Number(b[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  return null;
}

// Storefront-only — the Admin API returns null when resolving
// `shopify.color-pattern` references (those metaobjects live in Shopify's
// standard taxonomy and the Admin token can't read them), but the
// Storefront API can. We use this as a *separate* lookup so the main
// Admin query stays untouched.
const PRODUCT_COLOR_METAFIELD_STOREFRONT = `
  query GetProductColorMetafield($handle: String!) {
    product(handle: $handle) {
      colorMeta: metafield(namespace: "shopify", key: "color-pattern") {
        references(first: 50) {
          nodes {
            ... on Metaobject {
              type
              fields { key value }
            }
          }
        }
      }
    }
  }
`;

type RawColorMetafieldResp = {
  product: {
    colorMeta: {
      references: {
        nodes: Array<{
          type: string;
          fields: Array<{ key: string; value: string }>;
        } | null>;
      };
    } | null;
  } | null;
};

async function fetchTaxonomyColors(handle: string): Promise<TaxonomyColor[]> {
  try {
    const data = await shopifyStorefrontFetch<RawColorMetafieldResp>(
      PRODUCT_COLOR_METAFIELD_STOREFRONT,
      { handle },
    );
    const nodes = data.product?.colorMeta?.references.nodes ?? [];
    const colors: TaxonomyColor[] = [];
    for (const node of nodes) {
      if (!node || node.type !== "shopify--color-pattern") continue;
      const label = node.fields.find((f) => f.key === "label")?.value;
      const hex = node.fields.find((f) => f.key === "color")?.value ?? null;
      if (label) colors.push({ name: label, hex });
    }
    return colors;
  } catch {
    // Metafield missing or scope issue — degrade silently to "no colours".
    return [];
  }
}

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  // Run the full Admin product query and the Storefront colour-metafield
  // resolve in parallel — the colour fallback adds zero latency unless the
  // Storefront call is the slower of the two.
  const [data, taxonomyColors] = await Promise.all([
    shopifyAdminFetch<RawProductByHandleResp>(
      PRODUCT_BY_HANDLE,
      { handle },
      { tags: [`product:${handle}`], revalidate: 300 },
    ),
    fetchTaxonomyColors(handle),
  ]);

  const p = data.productByHandle;
  if (!p) return null;

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    featuredImage: p.featuredImage,
    images: p.images.nodes,
    options: p.options,
    variants: p.variants.nodes,
    taxonomyColors,
  };
}

export type ShopifyProductSummary = {
  id: string;
  handle: string;
  title: string;
  description: string;
  featuredImage: ShopifyImage | null;
  productType: string;
};

const ALL_ACTIVE_PRODUCTS = `
  query GetAllActiveProducts {
    products(first: 50, query: "status:active") {
      nodes {
        id
        handle
        title
        description
        productType
        featuredImage { url altText }
      }
    }
  }
`;

type RawAllProductsResp = {
  products: {
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      description: string;
      productType: string;
      featuredImage: ShopifyImage | null;
    }>;
  };
};

/**
 * Fetch every active product summary for the navbar / home page. Cached
 * server-side and revalidated every 5 minutes — when Anthony adds a product
 * in Shopify, it shows up site-wide within ~5 min.
 */
export async function getAllActiveProducts(): Promise<ShopifyProductSummary[]> {
  const data = await shopifyAdminFetch<RawAllProductsResp>(
    ALL_ACTIVE_PRODUCTS,
    {},
    { tags: ["products:all"], revalidate: 300 },
  );
  return data.products.nodes;
}

export type BestSellingProduct = {
  handle: string;
  title: string;
  featuredImage: ShopifyImage | null;
  minPrice: string | null;
  currencyCode: string | null;
};

// BEST_SELLING is only supported by the Storefront API products query (the
// Admin API's ProductSortKeys has no such value). Shopify maintains this
// ranking internally from real order/sales data, so we don't aggregate
// orders ourselves.
const BEST_SELLING_PRODUCTS = `
  query BestSellers($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        handle
        title
        featuredImage { url altText }
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }
`;

type RawBestSellersResp = {
  products: {
    nodes: Array<{
      handle: string;
      title: string;
      featuredImage: ShopifyImage | null;
      priceRange: {
        minVariantPrice: { amount: string; currencyCode: string } | null;
      } | null;
    }>;
  };
};

async function fetchBestSellingProducts(
  limit: number,
): Promise<BestSellingProduct[]> {
  const data = await shopifyStorefrontFetch<RawBestSellersResp>(
    BEST_SELLING_PRODUCTS,
    { first: limit },
  );
  return data.products.nodes.map((p) => {
    const min = p.priceRange?.minVariantPrice ?? null;
    const hasRealPrice = !!min && Number(min.amount) > 0;
    return {
      handle: p.handle,
      title: p.title,
      featuredImage: p.featuredImage,
      minPrice: hasRealPrice ? min.amount : null,
      currencyCode: hasRealPrice ? min.currencyCode : null,
    };
  });
}

/**
 * Top-selling products by Shopify's own sales ranking. Wrapped in
 * `unstable_cache` (the Storefront fetch is POST + `no-store`, so it would
 * otherwise hit Shopify on every render). Best sellers don't shift minute to
 * minute, so we refresh hourly. Bust on demand via `revalidateTag`.
 */
export const getBestSellingProducts = unstable_cache(
  fetchBestSellingProducts,
  ["pls-best-sellers"],
  { revalidate: 3600, tags: ["products:bestsellers"] },
);
