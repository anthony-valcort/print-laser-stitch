import { unstable_cache } from "next/cache";
import { shopifyAdminFetch } from "./shopify";
import type { ShopifyImage } from "./shopify-products";

export type ShopifyCollectionSummary = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
  productsCount: number;
};

export type ShopifyCollectionProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  featuredImage: ShopifyImage | null;
  /** Lowest variant price as a display string, e.g. "12.00", or null. */
  minPrice: string | null;
  currencyCode: string | null;
};

export type ShopifyCollectionDetail = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
  products: ShopifyCollectionProduct[];
};

/**
 * Shopify auto-generates a few system collections (theme "Home page",
 * "Frontpage", the AVADA app's "Best Sellers", an "uncategorized" bucket,
 * etc.). None of these are real browsable categories, so we never surface
 * them in the menu or on /collections.
 */
const SYSTEM_HANDLE_BLOCKLIST = new Set([
  "frontpage",
  "home-page",
  "homepage",
  "uncategorized",
  "all",
]);

function isSystemCollection(handle: string, title: string): boolean {
  if (SYSTEM_HANDLE_BLOCKLIST.has(handle.toLowerCase())) return true;
  // AVADA app + similar app-generated collections prefix their title.
  if (/^avada\b/i.test(title.trim())) return true;
  return false;
}

const ALL_COLLECTIONS = `
  query GetAllCollections {
    collections(first: 100, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        description
        image { url altText }
        productsCount { count }
      }
    }
  }
`;

type RawAllCollectionsResp = {
  collections: {
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      description: string;
      image: ShopifyImage | null;
      productsCount: { count: number };
    }>;
  };
};

async function fetchAllCollections(): Promise<ShopifyCollectionSummary[]> {
  const data = await shopifyAdminFetch<RawAllCollectionsResp>(
    ALL_COLLECTIONS,
    {},
    { tags: ["collections:all"], revalidate: 300 },
  );

  return data.collections.nodes
    .map((c) => ({
      id: c.id,
      handle: c.handle,
      title: c.title,
      description: c.description ?? "",
      image: c.image,
      productsCount: c.productsCount?.count ?? 0,
    }))
    .filter(
      (c) =>
        c.productsCount > 0 && !isSystemCollection(c.handle, c.title),
    );
}

/**
 * Every browsable collection: published, non-empty, not a system bucket.
 *
 * Wrapped in `unstable_cache` so the result is held in the Next.js Data
 * Cache across requests regardless of HTTP method (the Shopify GraphQL call
 * is a POST, which is not auto-cached). The header renders this on every
 * page, so without this it would hit Shopify on every single page load.
 * Revalidates every 5 min; bust on demand via `revalidateTag`.
 */
export const getAllCollections = unstable_cache(
  fetchAllCollections,
  ["pls-all-collections"],
  { revalidate: 300, tags: ["collections:all"] },
);

const COLLECTION_BY_HANDLE = `
  query GetCollectionByHandle($handle: String!) {
    collectionByHandle(handle: $handle) {
      id
      handle
      title
      description
      image { url altText }
      products(first: 100) {
        nodes {
          id
          handle
          title
          description
          featuredImage { url altText }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

type RawCollectionByHandleResp = {
  collectionByHandle: {
    id: string;
    handle: string;
    title: string;
    description: string;
    image: ShopifyImage | null;
    products: {
      nodes: Array<{
        id: string;
        handle: string;
        title: string;
        description: string;
        featuredImage: ShopifyImage | null;
        priceRangeV2: {
          minVariantPrice: { amount: string; currencyCode: string } | null;
        } | null;
      }>;
    };
  } | null;
};

async function fetchCollectionByHandle(
  handle: string,
): Promise<ShopifyCollectionDetail | null> {
  const data = await shopifyAdminFetch<RawCollectionByHandleResp>(
    COLLECTION_BY_HANDLE,
    { handle },
    { tags: [`collection:${handle}`], revalidate: 300 },
  );

  const c = data.collectionByHandle;
  if (!c) return null;

  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    description: c.description ?? "",
    image: c.image,
    products: c.products.nodes.map((p) => {
      const min = p.priceRangeV2?.minVariantPrice ?? null;
      // A $0 floor means the product is quote-only / has no fixed price —
      // show "View options" instead of "From $0.00".
      const hasRealPrice = !!min && Number(min.amount) > 0;
      return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        description: p.description ?? "",
        featuredImage: p.featuredImage,
        minPrice: hasRealPrice ? min.amount : null,
        currencyCode: hasRealPrice ? min.currencyCode : null,
      };
    }),
  };
}

/**
 * One collection + its products. `unstable_cache` keys automatically by the
 * `handle` argument, so each collection page gets its own cache entry,
 * revalidated every 5 min (POST GraphQL isn't auto-cached otherwise).
 */
export const getCollectionByHandle = unstable_cache(
  fetchCollectionByHandle,
  ["pls-collection-by-handle"],
  { revalidate: 300, tags: ["collections:all"] },
);
