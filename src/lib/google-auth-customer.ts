/**
 * Support for "Continue with Google" login — Shopify's classic Storefront
 * API has no mutation that logs a customer in without a password, so a
 * Google-authenticated signup gets a strong random password generated
 * server-side, used once to create the real Shopify customer + session,
 * then remembered in a customer metafield (server-only — the customer
 * never sees or needs it) so the *next* Google sign-in can reuse it to log
 * back into the same account via the normal customerAccessTokenCreate flow.
 *
 * Namespace: "pls_auth"
 * Key: "google_pw" (single_line_text_field)
 *
 * Required scopes: read_customers, write_customers, read_metafields, write_metafields
 */

import { randomBytes } from "crypto";
import { shopifyAdminFetch } from "./shopify";

const NS = "pls_auth";
const KEY = "google_pw";

export function generateRandomPassword(): string {
  return randomBytes(24).toString("base64url");
}

export async function findCustomerByEmail(
  email: string,
): Promise<{ id: string } | null> {
  const d = await shopifyAdminFetch<{
    customers: { nodes: Array<{ id: string }> };
  }>(
    `query FindCustomerByEmail($query: String!) {
      customers(first: 1, query: $query) {
        nodes { id }
      }
    }`,
    { query: `email:${email}` },
  );
  return d.customers.nodes[0] ?? null;
}

export async function getGoogleManagedPassword(
  customerId: string,
): Promise<string | null> {
  const d = await shopifyAdminFetch<{
    customer: { metafield: { value: string } | null } | null;
  }>(
    `query GetGooglePw($id: ID!, $ns: String!, $key: String!) {
      customer(id: $id) {
        metafield(namespace: $ns, key: $key) { value }
      }
    }`,
    { id: customerId, ns: NS, key: KEY },
  );
  return d.customer?.metafield?.value ?? null;
}

export async function setGoogleManagedPassword(
  customerId: string,
  password: string,
): Promise<void> {
  const d = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: { field: string[]; message: string }[] };
  }>(
    `mutation SetGooglePw($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          ownerId: customerId,
          namespace: NS,
          key: KEY,
          type: "single_line_text_field",
          value: password,
        },
      ],
    },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}
