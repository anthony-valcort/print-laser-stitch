import { shopifyAdminFetch } from "./shopify";

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

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  options: ShopifyOption[];
  variants: ShopifyVariant[];
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
  // "12 Min", "12 Minimum", "12 Minimum purchase"
  const b = title.match(/\b(\d+)\s+min(?:imum)?(?:\s+purchase)?/i);
  if (b) {
    const n = Number(b[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  return null;
}

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const data = await shopifyAdminFetch<RawProductByHandleResp>(
    PRODUCT_BY_HANDLE,
    { handle },
    { tags: [`product:${handle}`], revalidate: 300 },
  );

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
