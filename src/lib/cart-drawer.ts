"use client";

/**
 * Tiny event bus for the slide-out cart.
 *
 * The drawer lives in the root layout while the things that open it (the
 * header cart icon, every "add to cart" button) are scattered across the
 * tree. A DOM event keeps them decoupled — no extra provider, and nothing
 * to thread through components that don't otherwise care about the cart.
 */

export const CART_DRAWER_OPEN = "pls:cart-drawer-open";

export function openCartDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_DRAWER_OPEN));
}
