/**
 * Mix & Match apparel rules.
 *
 * Anthony's minimums exist because of per-run setup (screens, digitizing),
 * not per product — so a customer mixing polos and tees with ONE logo is a
 * single setup for the shop. These rules let the whole apparel order share
 * one minimum and one bulk tier instead of each style standing alone:
 *
 *   - 12 pieces across any mix of garments (was: 12 tees OR 6 polos alone)
 *   - at least 2 of any single style, so a mix stays practical to produce
 *   - the bulk tiers (24 / 48 / 100) count the combined apparel total
 *   - one logo across the mix — different artwork means separate setups,
 *     so those orders don't share a minimum
 *
 * Shared by the cart, the product pages and the checkout API. Checkout
 * recomputes everything from real Shopify titles and quantities, so the
 * browser can never talk its way past a minimum or into a discount.
 */

import {
  GARMENT_VOLUME_TIERS,
mix-and-match  type VolumeTier,
} from "@/lib/volume-discounts";

/** Pieces required across the whole apparel mix. */
export const MIX_MINIMUM = 12;

/** Fewest pieces of any one style within a mix. */
export const MIX_MIN_PER_STYLE = 2;

/** One decorated garment line already in the cart. */
export type MixLine = {
  /** Shopify product title — decides whether it's a garment. */
  productTitle: string;
  /** Pieces on this line (summed across sizes/colors). */
  quantity: number;
};

/** Keeps only the garment lines — print products never join the mix. */
export function garmentLines<T extends MixLine>(lines: T[]): T[] {
  return lines.filter(
    (l) => hasVolumePricing(l.productTitle) && l.quantity > 0,
  );
}

/** Total decorated garment pieces across every style. */
export function mixPieceCount(lines: MixLine[]): number {
  return garmentLines(lines).reduce(
    (sum, l) => sum + Math.max(0, Math.floor(l.quantity)),
    0,
  );
}

/** Bulk percent (0/10/15/20) for a combined apparel count. */
export function mixDiscountPercent(totalPieces: number): number {
  const tier = GARMENT_VOLUME_TIERS.find((t) => totalPieces >= t.minQty);
  return tier ? tier.percent : 0;
}

/** Next bulk tier the mix could reach, for "add N more to save X%". */
export function nextMixTier(
  totalPieces: number,
): (VolumeTier & { qtyNeeded: number }) | null {
  const upcoming = [...GARMENT_VOLUME_TIERS]
    .reverse()
    .find((t) => totalPieces < t.minQty);
  return upcoming
    ? { ...upcoming, qtyNeeded: upcoming.minQty - totalPieces }
    : null;
}

export type MixStatus = {
  /** Garment pieces already counted (cart + the line being built). */
  pieces: number;
  /** Distinct garment styles in the mix. */
  styles: number;
  /** True once the mix clears the shared minimum. */
  qualifies: boolean;
  /** Pieces still needed to clear the minimum (0 once qualified). */
  shortBy: number;
  /** Bulk percent earned by the combined count. */
  discountPercent: number;
  /** Next bulk tier, or null at the top tier. */
  nextTier: (VolumeTier & { qtyNeeded: number }) | null;
};

/**
 * Where an apparel order stands against the shared minimum and bulk tiers.
 * Pass every garment line in play — what's in the cart plus whatever the
 * customer is building right now.
 */
export function mixStatus(lines: MixLine[]): MixStatus {
  const garments = garmentLines(lines);
  const pieces = mixPieceCount(garments);
  return {
    pieces,
    styles: new Set(garments.map((l) => l.productTitle)).size,
    qualifies: pieces >= MIX_MINIMUM,
    shortBy: Math.max(0, MIX_MINIMUM - pieces),
    discountPercent: mixDiscountPercent(pieces),
    nextTier: nextMixTier(pieces),
  };
}

/**
 * Whether the style being configured can be added. A style below its own
 * minimum is fine as long as the rest of the mix carries the order to 12 —
 * that's the whole point of mixing — but it still needs MIX_MIN_PER_STYLE
 * pieces of its own, and the combined total has to clear the minimum.
 */
export function canAddToMix({
  thisStyleQty,
  otherGarmentPieces,
  productTitle,
  ownMinimum,
}: {
  thisStyleQty: number;
  otherGarmentPieces: number;
  productTitle: string;
  /** The style's own standalone minimum (12 for tees, 6 for polos). */
  ownMinimum: number;
}): { ok: boolean; reason: string | null; usingMix: boolean } {
  if (thisStyleQty <= 0) {
    return { ok: false, reason: "Add a quantity to continue.", usingMix: false };
  }
  // Non-garments (print products) keep their own rules untouched.
  if (!hasVolumePricing(productTitle)) {
    return thisStyleQty >= ownMinimum
      ? { ok: true, reason: null, usingMix: false }
      : {
          ok: false,
          reason: `Minimum ${ownMinimum} required.`,
          usingMix: false,
        };
  }
  if (thisStyleQty >= ownMinimum) {
    return { ok: true, reason: null, usingMix: false };
  }
  // Below its own minimum — the mix has to carry it.
  if (thisStyleQty < MIX_MIN_PER_STYLE) {
    return {
      ok: false,
      reason: `Add at least ${MIX_MIN_PER_STYLE} of this style to mix it with others.`,
      usingMix: true,
    };
  }
  const combined = thisStyleQty + Math.max(0, otherGarmentPieces);
  if (combined >= MIX_MINIMUM) {
    return { ok: true, reason: null, usingMix: true };
  }
  return {
    ok: false,
    reason: `${combined} of ${MIX_MINIMUM} pieces — add ${MIX_MINIMUM - combined} more from any garment to mix and match.`,
    usingMix: true,
  };
}
