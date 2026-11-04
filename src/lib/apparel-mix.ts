/**
 * Mix & Match apparel rules.
 *
 * Anthony's per-product minimums exist because of setup cost — screens for
 * printing, digitizing for embroidery — not because of the garment itself.
 * So a customer ordering 6 polos and 6 tees is really paying for the same
 * two setups as a larger order, and there's no reason to make each style
 * stand alone. These rules let a whole apparel order share one minimum and
 * one bulk tier:
 *
 *   - 12 pieces across any mix of garments
 *   - at least 6 pieces of each decoration method used, so a mix never
 *     drags a full setup along for two or three pieces
 *   - the bulk tiers (24 / 48 / 100) count the combined apparel total
 *
 * Shared by the product pages, the cart and the checkout API. Checkout
 * recomputes all of it from real Shopify product titles and quantities, so
 * the browser can never talk its way past a minimum or into a discount.
 */

import {
  GARMENT_VOLUME_TIERS,
  hasVolumePricing,
  type VolumeTier,
} from "@/lib/volume-discounts";

/** Pieces required across the whole apparel mix. */
export const MIX_MINIMUM = 12;

/** Pieces required of each decoration method present in the mix. */
export const MIX_MIN_PER_METHOD = 6;

/** Used when a garment's title doesn't state a minimum of its own. */
export const DEFAULT_GARMENT_MINIMUM = 12;

/**
 * Anthony encodes each style's standalone minimum in its Shopify title —
 * "T-Shirts (Minimum purchase 12)", "Custom Embroidered Performance Polo
 * (6-Piece Minimum)". Parsing it here keeps one source of truth for the
 * product page, the cart and the checkout route.
 */
export function detectMinQuantityFromTitle(title: string): number | null {
  // "Min 12", "Minimum 12", "Min purchase 12", "Minimum purchase 12"
  const a = title.match(/\bmin(?:imum)?(?:\s+purchase)?\s+(\d+)/i);
  if (a) {
    const n = Number(a[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  // "12 Min", "6 Piece Minimum", "6 pcs minimum", "6-unit minimum"
  const b = title.match(
    /\b(\d+)[-\s]+(?:pcs?|pieces?|units?|packs?|qty)?[-\s]*min(?:imum)?(?:\s+purchase)?/i,
  );
  if (b) {
    const n = Number(b[1]);
    if (Number.isFinite(n) && n > 1) return n;
  }
  return null;
}

/** A style's own standalone minimum — what it sells at with nothing else. */
export function ownMinimumFor(title: string): number {
  return detectMinQuantityFromTitle(title) ?? DEFAULT_GARMENT_MINIMUM;
}

/**
 * How a garment gets decorated. The minimum is really a setup minimum, so
 * this — not the product — is what the per-method floor counts.
 */
export type DecorationMethod = "embroidery" | "print";

export const METHOD_LABEL: Record<DecorationMethod, string> = {
  embroidery: "embroidered",
  print: "printed",
};

/** Embroidered styles say so in their Shopify title; everything else prints. */
export function decorationMethod(productTitle: string): DecorationMethod {
  return /embroider/i.test(productTitle) ? "embroidery" : "print";
}

/** One decorated garment line already in the cart, or being configured. */
export type MixLine = {
  /** Shopify product title — decides garment status and decoration method. */
  productTitle: string;
  /** Pieces on this line (summed across sizes and colors). */
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

/** Pieces per decoration method, counting only methods actually in use. */
export function piecesByMethod(
  lines: MixLine[],
): Partial<Record<DecorationMethod, number>> {
  const out: Partial<Record<DecorationMethod, number>> = {};
  for (const l of garmentLines(lines)) {
    const m = decorationMethod(l.productTitle);
    out[m] = (out[m] ?? 0) + Math.max(0, Math.floor(l.quantity));
  }
  return out;
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

/** A decoration method that's in the mix but still under its own floor. */
export type MethodShortfall = {
  method: DecorationMethod;
  pieces: number;
  needed: number;
};

export type MixStatus = {
  /** Garment pieces in play (cart plus whatever is being configured). */
  pieces: number;
  /** Distinct garment styles in the mix. */
  styles: number;
  /** Pieces per decoration method in use. */
  byMethod: Partial<Record<DecorationMethod, number>>;
  /** Methods that are present but under MIX_MIN_PER_METHOD. */
  shortfalls: MethodShortfall[];
  /** True once the mix clears the total minimum and every method floor. */
  qualifies: boolean;
  /** Pieces still needed to clear the total minimum (0 once cleared). */
  shortBy: number;
  /** Bulk percent earned by the combined count. */
  discountPercent: number;
  /** Next bulk tier, or null at the top tier. */
  nextTier: (VolumeTier & { qtyNeeded: number }) | null;
  /** One plain-language line for the customer, or null when all good. */
  message: string | null;
};

/** "a" · "a and b" · "a, b and c" */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * Where an apparel order stands against the shared minimum and bulk tiers.
 * Pass every garment line in play — what's in the cart plus whatever the
 * customer is building right now.
 */
export function mixStatus(lines: MixLine[]): MixStatus {
  const garments = garmentLines(lines);
  const pieces = mixPieceCount(garments);
  const byMethod = piecesByMethod(garments);

  const shortfalls: MethodShortfall[] = (
    Object.entries(byMethod) as [DecorationMethod, number][]
  )
    .filter(([, n]) => n > 0 && n < MIX_MIN_PER_METHOD)
    .map(([method, n]) => ({
      method,
      pieces: n,
      needed: MIX_MIN_PER_METHOD - n,
    }));

  const shortBy = Math.max(0, MIX_MINIMUM - pieces);

  // Mixing exists to WAIVE a style's own minimum — it must never impose a
  // higher one. An order where every style already clears its own minimum
  // (6 polos on their own, say) has nothing to be rescued from and sells
  // as it always did.
  const allSelfSufficient =
    garments.length > 0 &&
    garments.every((l) => l.quantity >= ownMinimumFor(l.productTitle));

  const qualifies =
    allSelfSufficient || (pieces >= MIX_MINIMUM && shortfalls.length === 0);

  let message: string | null = null;
  if (pieces > 0 && !qualifies && garments.length === 1) {
    // One style on its own: the shortest path is almost always topping up
    // that style to its own minimum, so quote that number rather than the
    // mix total (5 polos needs 1 more, not 7).
    const only = garments[0];
    const own = ownMinimumFor(only.productTitle);
    const need = own - only.quantity;
    message =
      own < MIX_MINIMUM
        ? `${only.quantity} of ${own} pieces — add ${need} more, or mix in other garments to reach ${MIX_MINIMUM}.`
        : `${only.quantity} of ${own} pieces — add ${need} more.`;
  } else if (pieces > 0 && !qualifies) {
    // Both constraints can bite at once (e.g. 4 printed + 3 embroidered is
    // short on the total AND on both methods). Telling the customer only
    // "add 5 more" would send them back here a second time, so spell out
    // every piece they actually need.
    const parts = shortfalls.map(
      (s) => `${s.needed} more ${METHOD_LABEL[s.method]}`
    );
    const methodNeed = shortfalls.reduce((n, s) => n + s.needed, 0);
    const anyNeed = Math.max(0, shortBy - methodNeed);
    if (anyNeed > 0) {
      parts.push(`${anyNeed} more from any garment`);
    }
    const detail = joinList(parts);
    message =
      shortBy > 0
        ? `${pieces} of ${MIX_MINIMUM} pieces — add ${detail}.`
        : `Add ${detail} — each decoration type needs ${MIX_MIN_PER_METHOD}.`;
  }

  return {
    pieces,
    styles: new Set(garments.map((l) => l.productTitle)).size,
    byMethod,
    shortfalls,
    qualifies,
    shortBy,
    discountPercent: mixDiscountPercent(pieces),
    nextTier: nextMixTier(pieces),
    message,
  };
}

/**
 * Whether the style being configured can be added to the cart. A style below
 * its own standalone minimum is fine as long as the rest of the apparel in
 * the cart carries the order over the shared minimum — that's the point of
 * mixing — but the decoration-method floor still has to hold.
 */
export function canAddToMix({
  thisStyleQty,
  productTitle,
  ownMinimum,
  otherLines,
}: {
  thisStyleQty: number;
  productTitle: string;
  /** The style's own standalone minimum (12 for tees, 6 for polos). */
  ownMinimum: number;
  /** Garment lines already in the cart. */
  otherLines: MixLine[];
}): { ok: boolean; reason: string | null; usingMix: boolean } {
  if (thisStyleQty <= 0) {
    return { ok: false, reason: "Add a quantity to continue.", usingMix: false };
  }
  // Non-garments (print products) keep their own rules untouched.
  if (!hasVolumePricing(productTitle)) {
    return thisStyleQty >= ownMinimum
      ? { ok: true, reason: null, usingMix: false }
      : { ok: false, reason: `Minimum ${ownMinimum} required.`, usingMix: false };
  }
  if (thisStyleQty >= ownMinimum) {
    return { ok: true, reason: null, usingMix: false };
  }
  // Below its own minimum — the rest of the apparel has to carry it.
  const status = mixStatus([...otherLines, { productTitle, quantity: thisStyleQty }]);
  if (status.qualifies) {
    return { ok: true, reason: null, usingMix: true };
  }
  return { ok: false, reason: status.message, usingMix: true };
}
