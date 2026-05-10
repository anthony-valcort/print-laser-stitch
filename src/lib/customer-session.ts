/**
 * Customer session management — Shopify Storefront API customer auth.
 *
 * Auth flow:
 *   1. Login/Signup → exchange email+password for `customerAccessToken`
 *   2. Token stored in httpOnly cookie `pls_customer`
 *   3. Server pages/components call `getCurrentCustomer()` to read & validate
 *   4. Logout → invalidate token via API + clear cookie
 *
 * The cookie is httpOnly + sameSite=lax + secure in prod, so it survives
 * normal navigation but is not readable by client JS (XSS-safe).
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { shopifyStorefrontFetch } from "./shopify-storefront";

export const SESSION_COOKIE = "pls_customer";

export type CustomerSession = {
  token: string;
  /** ISO timestamp string when the token expires. */
  expiresAt: string;
};

export type CurrentCustomer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  displayName: string;
};

export type CustomerOrder = {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: { amount: string; currencyCode: string };
  statusUrl: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    variantTitle: string | null;
  }>;
};

/**
 * Read the current customer from the session cookie. Returns null if no
 * session, expired, or invalid. Validated against Shopify on every call —
 * cheap because Shopify caches it server-side.
 */
export const getCurrentCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  let session: CustomerSession;
  try {
    session = JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }

  if (!session.token || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  try {
    type Resp = {
      customer: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        displayName: string;
      } | null;
    };
    const data = await shopifyStorefrontFetch<Resp>(
      `query getCustomer($token: String!) {
        customer(customerAccessToken: $token) {
          id
          email
          firstName
          lastName
          phone
          displayName
        }
      }`,
      { token: session.token },
    );
    return data.customer;
  } catch {
    return null;
  }
});

/**
 * Fetch up to 50 orders for the current customer. Returns empty array if not
 * logged in or on error.
 */
export async function getCurrentCustomerOrders(): Promise<CustomerOrder[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return [];

  let session: CustomerSession;
  try {
    session = JSON.parse(raw) as CustomerSession;
  } catch {
    return [];
  }
  if (!session.token) return [];

  try {
    type Resp = {
      customer: {
        orders: {
          edges: Array<{
            node: {
              id: string;
              orderNumber: number;
              processedAt: string;
              financialStatus: string | null;
              fulfillmentStatus: string | null;
              totalPrice: { amount: string; currencyCode: string };
              statusUrl: string;
              lineItems: {
                edges: Array<{
                  node: {
                    title: string;
                    quantity: number;
                    variantTitle: string | null;
                  };
                }>;
              };
            };
          }>;
        };
      } | null;
    };
    const data = await shopifyStorefrontFetch<Resp>(
      `query getOrders($token: String!) {
        customer(customerAccessToken: $token) {
          orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
            edges {
              node {
                id
                orderNumber
                processedAt
                financialStatus
                fulfillmentStatus
                totalPrice { amount currencyCode }
                statusUrl
                lineItems(first: 25) {
                  edges {
                    node {
                      title
                      quantity
                      variantTitle
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { token: session.token },
    );

    const orders = data.customer?.orders.edges ?? [];
    return orders.map((e) => ({
      id: e.node.id,
      orderNumber: e.node.orderNumber,
      processedAt: e.node.processedAt,
      financialStatus: e.node.financialStatus,
      fulfillmentStatus: e.node.fulfillmentStatus,
      totalPrice: e.node.totalPrice,
      statusUrl: e.node.statusUrl,
      lineItems: e.node.lineItems.edges.map((li) => ({
        title: li.node.title,
        quantity: li.node.quantity,
        variantTitle: li.node.variantTitle,
      })),
    }));
  } catch {
    return [];
  }
}

/** Set the session cookie. Called from API route handlers after a successful
 * login/signup. */
export async function setCustomerSession(session: CustomerSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

/**
 * For API route handlers — returns the current customer or a 401 NextResponse.
 * Usage:
 *   const result = await requireCustomerOr401();
 *   if (result instanceof NextResponse) return result;
 *   const customer = result;
 */
export async function requireCustomerOr401(): Promise<
  CurrentCustomer | import("next/server").NextResponse
> {
  const { NextResponse } = await import("next/server");
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      {
        error: "Login required",
        loginRequired: true,
      },
      { status: 401 },
    );
  }
  return customer;
}

export async function clearCustomerSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as CustomerSession).token;
  } catch {
    return null;
  }
}
