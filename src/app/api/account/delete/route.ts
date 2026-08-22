import { NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { requireCustomerOr401, clearCustomerSession } from "@/lib/customer-session";

/**
 * Permanently deletes the logged-in customer's account (Apple Guideline
 * 5.1.1(v) — apps that support account creation must also support in-app
 * account deletion).
 *
 * Shopify's Admin API `customerDelete` mutation only succeeds for customers
 * with no order history — this print shop's whole point is customers placing
 * orders, so most real accounts can't be hard-deleted. When Shopify refuses,
 * we anonymize instead: scramble the email/name/phone and purge our custom
 * metafields (saved QR codes, the Google-login password) so no PII or way to
 * log back in survives, even though Shopify keeps the record itself for the
 * order ledger. Either way the session/token is revoked at the end.
 */
export async function POST() {
  const result = await requireCustomerOr401();
  if (result instanceof NextResponse) return result;
  const customer = result;

  try {
    const del = await shopifyAdminFetch<{
      customerDelete: {
        deletedCustomerId: string | null;
        userErrors: { field: string[]; message: string }[];
      };
    }>(
      `mutation DeleteCustomer($input: CustomerDeleteInput!) {
        customerDelete(input: $input) {
          deletedCustomerId
          userErrors { field message }
        }
      }`,
      { input: { id: customer.id } },
    );

    const hardDeleted = !!del.customerDelete.deletedCustomerId;

    if (!hardDeleted) {
      const anonEmail = `deleted-${customer.id.split("/").pop()}-${Date.now()}@deleted.printlaserstitch.com`;
      const update = await shopifyAdminFetch<{
        customerUpdate: {
          userErrors: { field: string[]; message: string }[];
        };
      }>(
        `mutation AnonymizeCustomer($input: CustomerInput!) {
          customerUpdate(input: $input) {
            userErrors { field message }
          }
        }`,
        {
          input: {
            id: customer.id,
            email: anonEmail,
            firstName: "Deleted",
            lastName: "User",
            phone: null,
          },
        },
      );
      const updateErrors = update.customerUpdate.userErrors;
      if (updateErrors.length) {
        return NextResponse.json(
          { error: updateErrors[0].message },
          { status: 500 },
        );
      }

      await shopifyAdminFetch(
        `mutation PurgeCustomerMeta($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) {
            userErrors { field message }
          }
        }`,
        {
          metafields: [
            { ownerId: customer.id, namespace: "pls_qr", key: "codes" },
            { ownerId: customer.id, namespace: "pls_auth", key: "google_pw" },
          ],
        },
      );
    }

    const token = await clearCustomerSession();
    if (token) {
      try {
        await shopifyStorefrontFetch(
          `mutation logout($token: String!) {
            customerAccessTokenDelete(customerAccessToken: $token) {
              deletedAccessToken
              userErrors { field message }
            }
          }`,
          { token },
        );
      } catch {
        // Session is already cleared locally either way.
      }
    }

    return NextResponse.json({ ok: true, hardDeleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not delete account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
