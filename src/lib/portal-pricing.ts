/** Pure price rules. Safe to import in the browser and on the server. */

export const PORTAL_TAX_RATE = 0.07; // 7% Martin County, same as the shop
export const PORTAL_MAX_QTY = 10000;

export type PortalTier = { minQty: number; price: number };

export type PortalProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Finished mockup photo with the company's logo on it. */
  imageUrl: string;
  /** Price for one piece (each). */
  price: number;
  /** Volume prices: from this many pieces, each costs this much. */
  tiers: PortalTier[];
  /** Sizes (apparel). Empty = the customer just picks a quantity. */
  sizes: string[];
  /** Extra per piece for a size, for example 2XL +$2. */
  upcharge: Record<string, number>;
  minQty: number;
  note: string;
  active: boolean;
};

export type PortalQuote = {
  ok: boolean;
  error?: string;
  totalQty: number;
  /** Price of one plain piece at this quantity. */
  unit: number;
  subtotal: number;
  tax: number;
  total: number;
  lines: { label: string; qty: number; each: number }[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function unitPriceFor(p: PortalProduct, totalQty: number): number {
  let price = p.price;
  const tiers = [...p.tiers].sort((a, b) => a.minQty - b.minQty);
  for (const t of tiers) if (totalQty >= t.minQty) price = t.price;
  return price;
}

/** qtyBySize: for sized products, { S: 5, M: 10 }. For others, { "": 12 }. */
export function quotePortalLine(
  p: PortalProduct,
  qtyBySize: Record<string, number>,
): PortalQuote {
  const lines: PortalQuote["lines"] = [];
  let totalQty = 0;
  const sized = p.sizes.length > 0;
  for (const [sizeRaw, qRaw] of Object.entries(qtyBySize)) {
    const q = Math.floor(Number(qRaw) || 0);
    if (q <= 0) continue;
    const size = sized ? sizeRaw : "";
    if (sized && !p.sizes.includes(size)) {
      return bad(`Size ${sizeRaw} isn't available.`);
    }
    totalQty += q;
    lines.push({ label: size, qty: q, each: 0 });
  }
  if (totalQty <= 0) return bad("Pick a quantity.");
  if (totalQty > PORTAL_MAX_QTY) return bad("That's a lot! Please call us.");
  if (totalQty < p.minQty) return bad(`Minimum order is ${p.minQty}.`);
  const unit = unitPriceFor(p, totalQty);
  let subtotal = 0;
  for (const l of lines) {
    l.each = round2(unit + (p.upcharge[l.label] ?? 0));
    subtotal += l.each * l.qty;
  }
  subtotal = round2(subtotal);
  const tax = round2(subtotal * PORTAL_TAX_RATE);
  return {
    ok: true,
    totalQty,
    unit,
    subtotal,
    tax,
    total: round2(subtotal + tax),
    lines,
  };
}

function bad(error: string): PortalQuote {
  return { ok: false, error, totalQty: 0, unit: 0, subtotal: 0, tax: 0, total: 0, lines: [] };
}

