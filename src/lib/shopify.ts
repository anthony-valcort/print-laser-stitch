/**
 * Shared Shopify Admin GraphQL client.
 * Reads SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_TOKEN from env. The same token is
 * used by /api/checkout, /api/shopify-upload, etc.
 */

export const SHOPIFY_API_VERSION = "2026-04";

export class ShopifyError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ShopifyError";
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
};

type FetchOptions = {
  /** Tags for Next.js cache invalidation via revalidateTag */
  tags?: string[];
  /** Override revalidate seconds. Omit to let route segment config decide. */
  revalidate?: number | false;
};

export async function shopifyAdminFetch<T>(
  query: string,
  variables: object = {},
  opts: FetchOptions = {},
): Promise<T> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!STORE || !TOKEN) {
    throw new ShopifyError(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN env vars",
      500,
    );
  }

  const next: { tags?: string[]; revalidate?: number | false } = {};
  if (opts.tags) next.tags = opts.tags;
  if (opts.revalidate !== undefined) next.revalidate = opts.revalidate;

  const resp = await fetch(
    `https://${STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next,
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new ShopifyError(
      `Shopify GraphQL HTTP ${resp.status}`,
      resp.status,
      text.slice(0, 500),
    );
  }

  const json = (await resp.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new ShopifyError("Shopify GraphQL error", 502, json.errors);
  }
  if (!json.data) {
    throw new ShopifyError("Shopify GraphQL returned no data", 502);
  }
  return json.data;
}

/** Convert GID (`gid://shopify/ProductVariant/12345`) to numeric ID for REST APIs. */
export function gidToNumericId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1];
}
