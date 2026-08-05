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
import { cookies, headers } from "next/headers";
import { shopifyStorefrontFetch } from "./shopify-storefront";

export const SESSION_COOKIE = "pls_customer";

export type CustomerSession = {
  token: string;
  /** ISO timestamp string when the token expires. */
  expiresAt: string;
};

/**
 * Resolve the current session token from either source:
 *   1. The httpOnly `pls_customer` cookie (web).
 *   2. An `Authorization: Bearer <token>` header (mobile app — no cookie jar
 *      shared with the site, so it stores the Shopify customerAccessToken
 *      itself after login/signup and sends it back on every request).
 * Cookie wins if both are somehow present. Purely additive — web requests
 * never send the header, so their behavior is unchanged.
 */
async function resolveSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const session = JSON.parse(raw) as CustomerSession;
      if (session.token && new Date(session.expiresAt) >= new Date()) {
        return session.token;
      }
    } catch {
      // fall through to header check
    }
  }

  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim() || null;
  }
  return null;
}

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
  subtotalPrice: { amount: string; currencyCode: string } | null;
  totalTax: { amount: string; currencyCode: string } | null;
  totalShippingPrice: { amount: string; currencyCode: string } | null;
  shippingAddress: {
    name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
  } | null;
  statusUrl: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    variantTitle: string | null;
    originalTotalPrice: { amount: string; currencyCode: string };
  }>;
};

/**
 * Read the current customer from the session cookie. Returns null if no
 * session, expired, or invalid. Validated against Shopify on every call —
 * cheap because Shopify caches it server-side.
 */
export const getCurrentCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const token = await resolveSessionToken();
  if (!token) return null;

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
      { token },
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
  const token = await resolveSessionToken();
  if (!token) return [];

  try {
    type Money = { amount: string; currencyCode: string };
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
              totalPrice: Money;
              subtotalPrice: Money | null;
              totalTax: Money | null;
              totalShippingPrice: Money | null;
              shippingAddress: {
                name: string | null;
                address1: string | null;
                address2: string | null;
                city: string | null;
                province: string | null;
                zip: string | null;
                country: string | null;
              } | null;
              statusUrl: string;
              lineItems: {
                edges: Array<{
                  node: {
                    title: string;
                    quantity: number;
                    variant: { title: string } | null;
                    originalTotalPrice: Money;
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
                subtotalPrice { amount currencyCode }
                totalTax { amount currencyCode }
                totalShippingPrice { amount currencyCode }
                shippingAddress {
                  name
                  address1
                  address2
                  city
                  province
                  zip
                  country
                }
                statusUrl
                lineItems(first: 25) {
                  edges {
                    node {
                      title
                      quantity
                      variant { title }
                      originalTotalPrice { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { token },
    );

    const orders = data.customer?.orders.edges ?? [];
    return orders.map((e) => ({
      id: e.node.id,
      orderNumber: e.node.orderNumber,
      processedAt: e.node.processedAt,
      financialStatus: e.node.financialStatus,
      fulfillmentStatus: e.node.fulfillmentStatus,
      totalPrice: e.node.totalPrice,
      subtotalPrice: e.node.subtotalPrice,
      totalTax: e.node.totalTax,
      totalShippingPrice: e.node.totalShippingPrice,
      shippingAddress: e.node.shippingAddress,
      statusUrl: e.node.statusUrl,
      lineItems: e.node.lineItems.edges.map((li) => ({
        title: li.node.title,
        quantity: li.node.quantity,
        variantTitle: li.node.variant?.title ?? null,
        originalTotalPrice: li.node.originalTotalPrice,
      })),
    }));
  } catch {
    return [];
  }
}

/**
 * For API route handlers that need to call Shopify on behalf of the customer
 * (e.g. customerUpdate). Returns the access token from the session cookie,
 * or null if no valid session.
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  return resolveSessionToken();
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
  if (raw) {
    try {
      return (JSON.parse(raw) as CustomerSession).token;
    } catch {
      // fall through to header check
    }
  }
  // No cookie (mobile client) — invalidate the token it sent us instead.
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim() || null;
  }
  return null;
}
