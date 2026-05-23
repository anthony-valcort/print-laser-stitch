/**
 * Server-side discount-code lookup against the Shopify Admin GraphQL API.
 *
 * Used by both `/api/discount/validate` (cart UI apply) and
 * `/api/checkout-cart` (re-validate at order creation so the client can't
 * forge a discount). Returns either a usable `CartDiscount` or a reason
 * string explaining why the code isn't usable.
 */

import { shopifyAdminFetch } from "./shopify";
import type { CartDiscount } from "./discount-types";

type DiscountLookupSuccess = {
  ok: true;
  discount: CartDiscount;
};

type DiscountLookupFailure = {
  ok: false;
  error: string;
  /** HTTP status the caller should map to (404 = not found, 400 = bad, 502 = upstream). */
  status: 400 | 404 | 502;
};

export type DiscountLookupResult = DiscountLookupSuccess | DiscountLookupFailure;

type Resp = {
  codeDiscountNodeByCode: {
    id: string;
    codeDiscount: {
      __typename: string;
      title?: string;
      status?: "ACTIVE" | "EXPIRED" | "SCHEDULED";
      startsAt?: string;
      endsAt?: string | null;
      customerGets?: {
        value: {
          __typename: string;
          percentage?: number;
          amount?: { amount: string; currencyCode: string };
        };
      };
      minimumRequirement?: {
        __typename: string;
        greaterThanOrEqualToSubtotal?: {
          amount: string;
          currencyCode: string;
        };
        greaterThanOrEqualToQuantity?: number;
      } | null;
    };
  } | null;
};

const DISCOUNT_QUERY = `
  query getDiscount($code: String!) {
    codeDiscountNodeByCode(code: $code) {
      id
      codeDiscount {
        __typename
        ... on DiscountCodeBasic {
          title
          status
          startsAt
          endsAt
          customerGets {
            value {
              __typename
              ... on DiscountPercentage { percentage }
              ... on DiscountAmount {
                amount { amount currencyCode }
              }
            }
          }
          minimumRequirement {
            __typename
            ... on DiscountMinimumSubtotal {
              greaterThanOrEqualToSubtotal { amount currencyCode }
            }
            ... on DiscountMinimumQuantity {
              greaterThanOrEqualToQuantity
            }
          }
        }
        ... on DiscountCodeFreeShipping {
          title
          status
          startsAt
          endsAt
        }
      }
    }
  }
`;

export async function lookupDiscountCode(
  code: string,
  cartSubtotal: number,
): Promise<DiscountLookupResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a discount code.", status: 400 };
  }

  let data: Resp;
  try {
    data = await shopifyAdminFetch<Resp>(
      DISCOUNT_QUERY,
      { code: trimmed },
      { revalidate: 0 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not look up code";
    return {
      ok: false,
      error:
        msg.includes("Access denied") || msg.includes("permission")
          ? "Discount lookup is not enabled on the store. Ask the admin to grant read_discounts to the app."
          : "Could not check that code right now. Try again in a moment.",
      status: 502,
    };
  }

  const node = data.codeDiscountNodeByCode;
  if (!node) {
    return { ok: false, error: "That code doesn't exist.", status: 404 };
  }

  const cd = node.codeDiscount;
  const kind = cd.__typename;
  if (kind !== "DiscountCodeBasic" && kind !== "DiscountCodeFreeShipping") {
    return {
      ok: false,
      error:
        "This type of discount isn't supported in cart — try entering it at payment instead.",
      status: 400,
    };
  }

  const now = new Date();
  const startsAt = cd.startsAt ? new Date(cd.startsAt) : null;
  const endsAt = cd.endsAt ? new Date(cd.endsAt) : null;
  if (cd.status === "EXPIRED" || (endsAt && endsAt < now)) {
    return { ok: false, error: "This code has expired.", status: 400 };
  }
  if (cd.status === "SCHEDULED" || (startsAt && startsAt > now)) {
    return { ok: false, error: "This code isn't active yet.", status: 400 };
  }
  if (cd.status !== "ACTIVE") {
    return { ok: false, error: "This code is currently disabled.", status: 400 };
  }

  if (kind === "DiscountCodeFreeShipping") {
    return {
      ok: true,
      discount: {
        code: trimmed.toUpperCase(),
        title: cd.title || trimmed.toUpperCase(),
        valueType: "shipping",
        value: 0,
      },
    };
  }

  // DiscountCodeBasic from here on.
  let valueType: CartDiscount["valueType"];
  let value: number;
  const cg = cd.customerGets?.value;
  if (!cg) {
    return {
      ok: false,
      error: "This discount has no value configured in Shopify.",
      status: 400,
    };
  }
  if (cg.__typename === "DiscountPercentage" && typeof cg.percentage === "number") {
    valueType = "percentage";
    // Shopify returns 0.1 for 10%; we store the human form (10) which is also
    // what the draft-order applied_discount API wants.
    value = Math.round(cg.percentage * 100 * 100) / 100;
  } else if (cg.__typename === "DiscountAmount" && cg.amount) {
    valueType = "fixed_amount";
    value = Number(cg.amount.amount);
  } else {
    return {
      ok: false,
      error: "This discount type isn't supported yet.",
      status: 400,
    };
  }

  let minimumSubtotal: number | undefined;
  if (
    cd.minimumRequirement?.__typename === "DiscountMinimumSubtotal" &&
    cd.minimumRequirement.greaterThanOrEqualToSubtotal
  ) {
    minimumSubtotal = Number(
      cd.minimumRequirement.greaterThanOrEqualToSubtotal.amount,
    );
    if (cartSubtotal < minimumSubtotal) {
      return {
        ok: false,
        error: `This code requires a minimum subtotal of $${minimumSubtotal.toFixed(2)}.`,
        status: 400,
      };
    }
  }

  return {
    ok: true,
    discount: {
      code: trimmed.toUpperCase(),
      title: cd.title || trimmed.toUpperCase(),
      valueType,
      value,
      minimumSubtotal,
    },
  };
}
