/**
 * Pricing for "Quick Quote" — Anthony's material-based, multi-panel calculator
 * from the old site.
 *
 * Customer adds N panels (Door / Window / Wall / Wood / Metal), picks ONE
 * material, gets pricing. Material's $/sqft applies to total area. 7% Martin
 * County sales tax always on top. Discount %.
 *
 * Source of truth: filled-in screenshot from the old site showed
 *   1 panel (12" × 12") = 1.00 sqft × $16/sqft (Full Vinyl) = $16.00
 *   + 7% tax = $1.12 → $17.12 total.
 */

export type PanelType = "door" | "window" | "wall" | "wood" | "metal" | "other";

export const PANEL_TYPES: { key: PanelType; label: string; icon: string }[] = [
  { key: "door", label: "Door", icon: "🚪" },
  { key: "window", label: "Window", icon: "🪟" },
  { key: "wall", label: "Wall", icon: "🧱" },
  { key: "wood", label: "Wood", icon: "🪵" },
  { key: "metal", label: "Metal", icon: "⚙️" },
];

export type MaterialKey =
  | "perforated-film"
  | "full-vinyl"
  | "window-tint"
  | "wall-vinyl"
  | "special-vinyl";

export type DecalMaterial = {
  key: MaterialKey;
  label: string;
  pricePerSqFt: number;
  blurb: string;
  /** When true, switches to quote-only mode (no instant cart). */
  quoteOnly?: boolean;
};

export const DECAL_MATERIALS: DecalMaterial[] = [
  {
    key: "perforated-film",
    label: "Perforated Window Film",
    pricePerSqFt: 18.0,
    blurb: "One-way visibility",
  },
  {
    key: "full-vinyl",
    label: "Full Vinyl",
    pricePerSqFt: 16.0,
    blurb: "Complete privacy",
  },
  {
    key: "window-tint",
    label: "Window Tint",
    pricePerSqFt: 12.0,
    blurb: "UV protection",
  },
  {
    key: "wall-vinyl",
    label: "Wall Vinyl",
    pricePerSqFt: 13.0,
    blurb: "Interior walls",
  },
  {
    key: "special-vinyl",
    label: "Special Vinyl",
    pricePerSqFt: 0,
    blurb: "Custom job — we'll quote you",
    quoteOnly: true,
  },
];

/** Martin County, FL — Anthony's tax rate per the original calculator. */
export const TAX_RATE = 0.07;

export type DecalPanelInput = {
  type: PanelType;
  /** Width in inches. */
  width: number;
  /** Height in inches. */
  height: number;
  description?: string;
};

export type DecalPriceInput = {
  panels: DecalPanelInput[];
  material: MaterialKey;
  /** Percentage 0–100. */
  discountPercent: number;
  /** User-entered $/sqft for quote-only materials (e.g. Special Vinyl). */
  customPricePerSqFt?: number;
};

export type DecalPriceResult = {
  /** Sum of panel areas in square feet. */
  totalAreaSqFt: number;
  pricePerSqFt: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  total: number;
  quoteOnly: boolean;
};

export function calcDecalPrice(input: DecalPriceInput): DecalPriceResult {
  const material =
    DECAL_MATERIALS.find((m) => m.key === input.material) ?? DECAL_MATERIALS[0];

  // Total area across all panels — inches² → sqft.
  const totalAreaSqFt = input.panels.reduce((sum, p) => {
    const w = Math.max(0, Number(p.width) || 0);
    const h = Math.max(0, Number(p.height) || 0);
    return sum + (w * h) / 144;
  }, 0);

  // Special Vinyl (and any other quote-only material) has no fixed rate —
  // the customer enters the $/sqft they were quoted instead.
  const pricePerSqFt = material.quoteOnly
    ? Math.max(0, Number(input.customPricePerSqFt) || 0)
    : material.pricePerSqFt;
  const subtotal = round2(pricePerSqFt * totalAreaSqFt);

  const discountPct = Math.max(
    0,
    Math.min(100, Number(input.discountPercent) || 0),
  );
  const discountAmount = round2((subtotal * discountPct) / 100);
  const afterDiscount = round2(subtotal - discountAmount);
  const taxAmount = round2(afterDiscount * TAX_RATE);
  const total = round2(afterDiscount + taxAmount);

  return {
    totalAreaSqFt: Math.round(totalAreaSqFt * 100) / 100,
    pricePerSqFt,
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    total,
    // Only still "blocked" if this is a quote-only material and no price has
    // been entered yet — once the customer fills in their quoted rate, normal
    // pricing/checkout applies.
    quoteOnly: Boolean(material.quoteOnly) && pricePerSqFt <= 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
