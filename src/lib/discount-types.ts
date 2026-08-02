/**
 * Discount/coupon types — shared between cart-store, CartView, the validate
 * API, and the checkout-cart route.
 *
 * We store just the *rule* in localStorage (code, value type, value, minimum)
 * and recompute the dollar `amount` every time the cart subtotal changes,
 * so the discount stays in sync as the customer adds or removes items.
 */

import type { CartItem } from "./cart-types";

export type DiscountValueType = "percentage" | "fixed_amount" | "shipping";

export interface CartDiscount {
  /** Code the customer typed (uppercase as it appears in Shopify). */
  code: string;
  /** Friendly title from Shopify (often equals the code). */
  title: string;
  /** Whether `value` is a percent (0-100), a dollar amount, or shipping. */
  valueType: DiscountValueType;
  /**
   * Raw value from Shopify:
   *  - percentage: 10 means 10% off
   *  - fixed_amount: dollar amount off the subtotal
   *  - shipping: 0 (no numeric impact on subtotal)
   */
  value: number;
  /**
   * Optional minimum subtotal in dollars required for the discount to apply.
   * Re-checked on every cart change.
   */
  minimumSubtotal?: number;
  /**
   * Custom Vinyl Stickers isn't a real Shopify product, so it can't be
   * targeted through Shopify's own "specific products/collections" discount
   * scoping — instead, any code containing "STICKER" (see discount-lookup.ts)
   * is treated as applying only to vinyl-sticker cart items rather than the
   * whole order.
   */
  scope?: "vinyl-sticker";
}

/** The subtotal a discount's value applies against — the whole cart, unless
 * it's sticker-scoped, in which case only vinyl-sticker line items count. */
export function discountEligibleSubtotal(
  items: CartItem[],
  discount: CartDiscount | null,
): number {
  if (!discount) return 0;
  if (discount.scope === "vinyl-sticker") {
    return items
      .filter((i) => i.kind === "vinyl-sticker")
      .reduce((sum, i) => sum + (i.totalPrice || 0), 0);
  }
  return items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
}

/**
 * Apply a discount rule to a numeric subtotal. Returns the dollar amount the
 * customer saves (capped so total never goes below zero).
 */
export function computeDiscountAmount(
  discount: CartDiscount | null,
  subtotal: number,
): number {
  if (!discount || subtotal <= 0) return 0;
  // If the rule has a minimum and we don't meet it, no discount applies.
  if (
    typeof discount.minimumSubtotal === "number" &&
    subtotal < discount.minimumSubtotal
  ) {
    return 0;
  }
  if (discount.valueType === "percentage") {
    return Math.round(((subtotal * discount.value) / 100) * 100) / 100;
  }
  if (discount.valueType === "fixed_amount") {
    return Math.min(discount.value, subtotal);
  }
  // shipping: applied at checkout, no subtotal change here.
  return 0;
}
