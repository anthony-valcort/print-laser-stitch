"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

/**
 * Side-effect-only component rendered on the order page when Shopify says
 * the draft has been paid. Tells the cart store to drop its items and any
 * matching pending-checkout marker, so the customer doesn't see the items
 * they just bought sitting in their cart afterwards.
 *
 * Why a separate component: `OrderPage` is a server component (so it can
 * read Shopify Admin), but `useCart` is a client hook — this component
 * bridges the two.
 */
export default function OrderClearCartOnPaid({
  draftOrderId,
}: {
  draftOrderId: number;
}) {
  const { pendingCheckout, clearCart, clearPendingCheckout } = useCart();

  useEffect(() => {
    // Only clear if this paid order matches the customer's in-flight
    // checkout — guards against accidentally wiping a cart they've started
    // building for a *new* order.
    if (pendingCheckout?.draftOrderId === draftOrderId) {
      clearCart();
    } else {
      // Stale marker for a different draft — drop just the marker.
      clearPendingCheckout();
    }
  }, [draftOrderId, pendingCheckout, clearCart, clearPendingCheckout]);

  return null;
}
