/**
 * Automatic volume (bulk) discounts.
 *
 * Shared by the product page (to show the customer their savings) and the
 * checkout API (which re-applies them server-side from the real Shopify
 * product title, so the browser can never choose its own discount).
 *
 * Currently applies to polos only. Tiers match Anthony's walk-in pricing.
 */

export type VolumeTier = { minQty: number; percent: number };

/** Highest tier first. */
export const POLO_VOLUME_TIERS: VolumeTier[] = [
  { minQty: 100, percent: 20 },
  { minQty: 48, percent: 15 },
  { minQty: 24, percent: 10 },
];

/** True when the product (by its Shopify title) gets polo volume pricing. */
export function hasVolumePricing(productTitle: string): boolean {
  return /\bpolos?\b/i.test(productTitle);
}

/** Tiers for a product, or an empty list if it has no volume pricing. */
export function volumeTiersFor(productTitle: string): VolumeTier[] {
  return hasVolumePricing(productTitle) ? POLO_VOLUME_TIERS : [];
}

/** Discount percent (0, 10, 15 or 20) for this product at this quantity. */
export function volumeDiscountPercent(
  productTitle: string,
  totalQty: number,
): number {
  const tier = volumeTiersFor(productTitle).find((t) => totalQty >= t.minQty);
  return tier ? tier.percent : 0;
}

/** The next tier the customer could reach, for "add N more to save X%". */
export function nextVolumeTier(
  productTitle: string,
  totalQty: number,
): (VolumeTier & { qtyNeeded: number }) | null {
  const upcoming = [...volumeTiersFor(productTitle)]
    .reverse()
    .find((t) => totalQty < t.minQty);
  return upcoming ? { ...upcoming, qtyNeeded: upcoming.minQty - totalQty } : null;
}
