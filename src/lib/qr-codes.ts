/**
 * Customer QR codes — stored as a Customer metafield in Shopify (mirrors the
 * Shop-metafield pattern in vehicle-shopify.ts, but owned by the customer).
 * Namespace: "pls_qr"
 * Key: "codes" (json)
 *
 * Required scopes: read_customers/write_customers (Admin API access to
 * Customer-owned metafields).
 */

import { shopifyAdminFetch } from "./shopify";
import type { QrCodeType } from "./qr-encode";

const NS = "pls_qr";
const KEY = "codes";

export type QrCodeEntry = {
  id: string;
  type: QrCodeType;
  title: string;
  /** The raw string encoded into the QR (tel:, mailto:, WIFI:, vCard, …). */
  payload: string;
  /** Original form field values, kept so the edit form can be repopulated. */
  fields: Record<string, string>;
  createdAt: string;
};

async function readMetafield(customerId: string): Promise<string | null> {
  const d = await shopifyAdminFetch<{
    customer: { metafield: { value: string } | null } | null;
  }>(
    `query GetCustomerMeta($id: ID!, $ns: String!, $key: String!) {
      customer(id: $id) {
        metafield(namespace: $ns, key: $key) { value }
      }
    }`,
    { id: customerId, ns: NS, key: KEY },
  );
  return d.customer?.metafield?.value ?? null;
}

async function writeMetafield(
  customerId: string,
  value: string,
): Promise<void> {
  const d = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: { field: string[]; message: string }[] };
  }>(
    `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        { ownerId: customerId, namespace: NS, key: KEY, type: "json", value },
      ],
    },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}

export async function getCustomerQrCodes(
  customerId: string,
): Promise<QrCodeEntry[]> {
  const raw = await readMetafield(customerId);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as QrCodeEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveCustomerQrCodes(
  customerId: string,
  list: QrCodeEntry[],
): Promise<void> {
  await writeMetafield(customerId, JSON.stringify(list));
}

export async function createQrCode(
  customerId: string,
  entry: Omit<QrCodeEntry, "id" | "createdAt">,
): Promise<QrCodeEntry> {
  const list = await getCustomerQrCodes(customerId);
  const created: QrCodeEntry = {
    ...entry,
    id: `qr${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await saveCustomerQrCodes(customerId, [created, ...list]);
  return created;
}

export async function updateQrCode(
  customerId: string,
  id: string,
  patch: Omit<QrCodeEntry, "id" | "createdAt">,
): Promise<QrCodeEntry> {
  const list = await getCustomerQrCodes(customerId);
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`QR code ${id} not found`);
  const updated: QrCodeEntry = { ...patch, id, createdAt: list[idx].createdAt };
  list[idx] = updated;
  await saveCustomerQrCodes(customerId, list);
  return updated;
}

export async function deleteQrCode(
  customerId: string,
  id: string,
): Promise<void> {
  const list = await getCustomerQrCodes(customerId);
  await saveCustomerQrCodes(
    customerId,
    list.filter((c) => c.id !== id),
  );
}
