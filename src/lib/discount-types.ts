/**
 * Discount/coupon types — shared between cart-store, CartView, the validate
 * API, and the checkout-cart route.
 *
 * We store just the *rule* in localStorage (code, value type, value, minimum)
 * and recompute the dollar `amount` every time the cart subtotal changes,
 * so the discount stays in sync as the customer adds or removes items.
 */

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
