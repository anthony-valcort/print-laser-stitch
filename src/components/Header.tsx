/**
 * Server-side Header wrapper.
 *
 * Reads the current customer session + the live Shopify collections and
 * forwards both to the client-side <HeaderClient />. Pages keep using
 * `<Header />` — no per-page changes needed.
 *
 * If the Storefront API isn't configured we silently degrade to the
 * unauthenticated header. If collections can't be fetched the Products
 * dropdown simply links to the /collections page.
 */

import HeaderClient, { type HeaderCollection } from "./HeaderClient";
import { getCurrentCustomer } from "@/lib/customer-session";
import { getAllCollections } from "@/lib/shopify-collections";

export default async function Header() {
  let customer = null;
  try {
    customer = await getCurrentCustomer();
  } catch {
    // Storefront API not configured or failed — show signed-out header.
  }

  let collections: HeaderCollection[] = [];
  try {
    collections = (await getAllCollections()).map((c) => ({
      handle: c.handle,
      title: c.title,
      imageUrl: c.image?.url ?? null,
    }));
  } catch {
    // Shopify unreachable — Products menu falls back to a single link.
  }

  return (
    <HeaderClient
      collections={collections}
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
