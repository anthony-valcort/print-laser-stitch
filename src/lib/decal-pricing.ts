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
  | "floor-vinyl"
  | "banner"
  | "frosted-labels"
  | "canvas"
  | "armor-frosted"
  | "black-vinyl"
  | "white-vinyl"
  | "fabric-vinyl"
  | "special-vinyl";

/** How a material is drawn in the live preview. */
export type MaterialLook =
  | "perforated"
  | "vinyl"
  | "tint"
  | "wall"
  | "floor"
  | "banner"
  | "frosted"
  | "canvas"
  | "armor"
  | "cutblack"
  | "cutwhite"
  | "fabric"
  | "special";

export type DecalMaterial = {
  key: MaterialKey;
  label: string;
  pricePerSqFt: number;
  blurb: string;
  /** When true, switches to quote-only mode (no instant cart). */
  quoteOnly?: boolean;
  /** The shortest side may not be wider than this (inches) — roll width. */
  maxSideIn?: number;
  look: MaterialLook;
};

/** Banner rolls are 5 ft wide. */
export const BANNER_MAX_SIDE_IN = 60;

export const DECAL_MATERIALS: DecalMaterial[] = [
  {
    key: "perforated-film",
    label: "Perforated Window Film",
    pricePerSqFt: 18.0,
    blurb: "One-way visibility",
    look: "perforated",
  },
  {
    key: "full-vinyl",
    label: "Full Vinyl",
    pricePerSqFt: 16.0,
    blurb: "Complete privacy",
    look: "vinyl",
  },
  {
    key: "window-tint",
    label: "Window Tint",
    pricePerSqFt: 12.0,
    blurb: "UV protection",
    look: "tint",
  },
  {
    key: "wall-vinyl",
    label: "Wall Vinyl",
    pricePerSqFt: 13.0,
    blurb: "Interior walls",
    look: "wall",
  },
  {
    key: "floor-vinyl",
    label: "Floor Vinyl",
    pricePerSqFt: 9.0,
    blurb: "Walk-on floor graphics",
    look: "floor",
  },
  {
    key: "banner",
    label: "Vinyl Banner",
    pricePerSqFt: 13.0,
    blurb: "Up to 5 ft wide",
    maxSideIn: BANNER_MAX_SIDE_IN,
    look: "banner",
  },
  {
    key: "frosted-labels",
    label: "Frosted Labels",
    pricePerSqFt: 23.0,
    blurb: "Frosted glass look",
    look: "frosted",
  },
  {
    key: "canvas",
    label: "Canvas (not laminated)",
    pricePerSqFt: 10.0,
    blurb: "Matte canvas, no laminate",
    look: "canvas",
  },
  {
    key: "armor-frosted",
    label: "Armor Frosted Vinyl",
    pricePerSqFt: 46.0,
    blurb: "Extreme-duty frosted. Grease-proof, waterproof",
    look: "armor",
  },
  {
    key: "black-vinyl",
    label: "Black Adhesive Vinyl + Transfer Tape",
    pricePerSqFt: 10.0,
    blurb: "Cut black vinyl, transfer tape included",
    look: "cutblack",
  },
  {
    key: "white-vinyl",
    label: "White Adhesive Vinyl + Transfer Tape",
    pricePerSqFt: 12.0,
    blurb: "Cut white vinyl, transfer tape included",
    look: "cutwhite",
  },
  {
    key: "fabric-vinyl",
    label: "Printable Fabric Adhesive Vinyl",
    pricePerSqFt: 22.0,
    blurb: "Printed, fabric-feel, sticks on",
    look: "fabric",
  },
  {
    key: "special-vinyl",
    label: "Special Vinyl",
    pricePerSqFt: 0,
    blurb: "Custom job — we'll quote you",
    quoteOnly: true,
    look: "special",
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

/* ------------------------------------------------------------------ */
/* Multi-item jobs — each item has its own size, quantity and material */
/* ------------------------------------------------------------------ */

/** Bundle deal: the more square feet in one job, the lower the price. */
export const BUNDLE_TIERS: { minSqFt: number; pct: number }[] = [
  { minSqFt: 10, pct: 5 },
  { minSqFt: 25, pct: 10 },
  { minSqFt: 50, pct: 15 },
  { minSqFt: 100, pct: 20 },
];

export function bundlePercentFor(areaSqFt: number): number {
  let pct = 0;
  for (const t of BUNDLE_TIERS) if (areaSqFt >= t.minSqFt) pct = t.pct;
  return pct;
}

export type JobItemInput = {
  material: MaterialKey;
  /** Inches. */
  width: number;
  /** Inches. */
  height: number;
  quantity: number;
  /** Only honored when the caller allows it (signed-in shop admin). */
  customPricePerSqFt?: number;
};

export type JobLine = {
  areaEachSqFt: number;
  totalAreaSqFt: number;
  rate: number;
  amount: number;
  /** Plain-English reason this item can't be ordered yet. */
  problem: string | null;
  /** Special Vinyl with no rate: needs a quote from the shop. */
  callForQuote: boolean;
  /** True when the bundle deal applies to this line (not a shop custom rate). */
  discountable: boolean;
};

/** Returns a message when the size doesn't work for the material. */
export function sizeError(
  material: MaterialKey,
  width: number,
  height: number,
): string | null {
  const m = DECAL_MATERIALS.find((x) => x.key === material);
  if (!m) return "Pick a material.";
  if (!(width > 0) || !(height > 0)) return "Enter a width and a height.";
  if (m.maxSideIn && Math.min(width, height) > m.maxSideIn) {
    return `${m.label} is up to ${m.maxSideIn / 12} ft wide. One side must be ${m.maxSideIn / 12} ft (${m.maxSideIn} in) or less.`;
  }
  return null;
}

export function calcJob(
  items: JobItemInput[],
  opts: { allowCustom: boolean },
): {
  lines: JobLine[];
  totalAreaSqFt: number;
  /** Before the bundle deal. */
  gross: number;
  bundlePercent: number;
  bundleDiscount: number;
  /** Next bundle tier and how many more sq ft it needs. */
  nextTier: { minSqFt: number; pct: number; moreSqFt: number } | null;
  /** After the bundle deal, before tax. */
  subtotal: number;
  taxAmount: number;
  total: number;
  blocked: boolean;
} {
  const lines: JobLine[] = items.map((it) => {
    const m = DECAL_MATERIALS.find((x) => x.key === it.material);
    const w = Math.max(0, Number(it.width) || 0);
    const h = Math.max(0, Number(it.height) || 0);
    const qty = Math.min(999, Math.max(1, Math.floor(Number(it.quantity) || 1)));
    const areaEach = (w * h) / 144;
    const totalArea = areaEach * qty;
    const custom = opts.allowCustom
      ? Math.max(0, Number(it.customPricePerSqFt) || 0)
      : 0;
    const rate = custom > 0 ? custom : m && !m.quoteOnly ? m.pricePerSqFt : 0;
    const callForQuote = !!m?.quoteOnly && rate <= 0;
    const problem = sizeError(it.material, w, h);
    return {
      areaEachSqFt: Math.round(areaEach * 100) / 100,
      totalAreaSqFt: Math.round(totalArea * 100) / 100,
      rate,
      amount: round2(totalArea * rate),
      problem,
      callForQuote,
      discountable: custom <= 0 && rate > 0,
    };
  });
  const gross = round2(lines.reduce((a, l) => a + l.amount, 0));
  const bundleArea = lines
    .filter((l) => l.discountable)
    .reduce((a, l) => a + l.totalAreaSqFt, 0);
  const bundlePercent = bundlePercentFor(bundleArea);
  const bundleBase = lines
    .filter((l) => l.discountable)
    .reduce((a, l) => a + l.amount, 0);
  const bundleDiscount = round2((bundleBase * bundlePercent) / 100);
  const subtotal = round2(gross - bundleDiscount);
  const nextTier = BUNDLE_TIERS.find((t) => t.minSqFt > bundleArea) ?? null;
  const taxAmount = round2(subtotal * TAX_RATE);
  return {
    lines,
    totalAreaSqFt:
      Math.round(lines.reduce((a, l) => a + l.totalAreaSqFt, 0) * 100) / 100,
    gross,
    bundlePercent,
    bundleDiscount,
    nextTier: nextTier
      ? {
          minSqFt: nextTier.minSqFt,
          pct: nextTier.pct,
          moreSqFt: Math.round((nextTier.minSqFt - bundleArea) * 100) / 100,
        }
      : null,
    subtotal,
    taxAmount,
    total: round2(subtotal + taxAmount),
    blocked:
      lines.length === 0 ||
      lines.some((l) => l.problem !== null || l.callForQuote),
  };
}
