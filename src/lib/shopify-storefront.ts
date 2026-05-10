/**
 * Shopify Storefront API client — used for customer-facing auth and order
 * lookups. This is separate from the Admin API client because it uses a
 * different (public) access token. The token has minimal permissions and is
 * safe to expose in API responses, though we keep it server-side here.
 *
 * Anthony needs to create a Storefront API access token in Shopify admin:
 *   Settings → Apps and sales channels → Develop apps → [App] → API credentials
 *   → "Storefront API access tokens" → Generate token
 *
 * Required scopes: unauthenticated_read_customers, unauthenticated_write_customers
 *
 * Add to .env.local + Vercel env:
 *   SHOPIFY_STOREFRONT_TOKEN=...
 */

import { SHOPIFY_API_VERSION, ShopifyError } from "./shopify";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
};

export async function shopifyStorefrontFetch<T>(
  query: string,
  variables: object = {},
): Promise<T> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!STORE || !TOKEN) {
    throw new ShopifyError(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_TOKEN env var. Anthony needs to create a Storefront API access token in Shopify admin.",
      500,
    );
  }

  const resp = await fetch(
    `https://${STORE}/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Storefront-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new ShopifyError(
      `Shopify Storefront HTTP ${resp.status}`,
      resp.status,
      text.slice(0, 500),
    );
  }

  const json = (await resp.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new ShopifyError(
      json.errors[0]?.message ?? "Shopify Storefront error",
      502,
      json.errors,
    );
  }
  if (!json.data) {
    throw new ShopifyError("Shopify Storefront returned no data", 502);
  }
  return json.data;
}

export function isStorefrontConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN,
  );
}
