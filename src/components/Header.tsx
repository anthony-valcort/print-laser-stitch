/**
 * Server-side Header wrapper.
 *
 * Reads the current customer session and forwards to the client-side
 * <HeaderClient /> with the customer prop. Pages keep using `<Header />` —
 * no per-page changes needed when adding new auth-aware navigation pieces.
 *
 * If the Storefront API isn't configured (Anthony hasn't created the token
 * yet) we silently degrade to the unauthenticated header rather than crashing.
 */

import HeaderClient from "./HeaderClient";
import { getCurrentCustomer } from "@/lib/customer-session";
import type { Category } from "@/lib/categories";

export default async function Header({
  categories,
}: {
  categories?: Category[];
}) {
  let customer = null;
  try {
    customer = await getCurrentCustomer();
  } catch {
    // Storefront API not configured or failed — show signed-out header.
  }

  return (
    <HeaderClient
      categories={categories}
      customer={
        customer
          ? {
              firstName: customer.firstName,
              displayName: customer.displayName,
              email: customer.email,
            }
          : null
      }
    />
  );
}
