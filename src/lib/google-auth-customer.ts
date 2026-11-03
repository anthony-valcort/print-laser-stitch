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

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { shopifyAdminFetch } from "./shopify";

const NS = "pls_auth";
const KEY = "google_pw";

// Passwords are stored encrypted (AES-256-GCM) so anyone who can read
// customer records in Shopify admin can't read them. The key is derived from
// the server-only Shopify admin token. Older plain-text values are still
// accepted and re-saved encrypted the next time that customer signs in.
// NOTE: if SHOPIFY_ADMIN_TOKEN is ever rotated, existing Google-login
// customers will need to use "Forgot password" once.
const ENC_PREFIX = "enc:v1:";

function encKey(): Buffer {
  const secret = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!secret) throw new Error("Server not configured: missing SHOPIFY_ADMIN_TOKEN");
  return createHash("sha256").update(`pls-google-pw-v1:${secret}`).digest();
}

function encryptPw(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString("base64url");
}

function decryptPw(stored: string): string | null {
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

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
  const stored = d.customer?.metafield?.value ?? null;
  if (!stored) return null;
  if (stored.startsWith(ENC_PREFIX)) return decryptPw(stored);
  // Legacy plain-text value: upgrade it to encrypted storage.
  try {
    await setGoogleManagedPassword(customerId, stored);
  } catch {}
  return stored;
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
          value: encryptPw(password),
        },
      ],
    },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}
