/**
 * Pricing for window film / wall vinyl / decal jobs — separate from the
 * signage calculator (banners, yard signs, aluminum) which uses its own pricing
 * tables.
 *
 * Logic:
 *   - Customer picks a **service plan** (Print Only / Design + Print /
 *     Full Install) which sets the base $/sqft.
 *   - Customer picks a **material** (5 vinyl types + special) which has its
 *     own $/sqft.
 *   - Final $/sqft = max(service_plan_price, material_price). Whichever is
 *     higher wins. Anthony's stated examples ($10/$12/$18 for standard vinyl)
 *     are consistent with this — and special materials carry their own
 *     premium that overrides cheaper service tiers.
 *   - "Special Vinyl" flips the quote into manual-quote mode.
 *   - Multi-panel: total area = sum of (w × h / 144) per panel.
 *   - Discount applied to subtotal, then Martin County 7% sales tax.
 *
 * All numbers are placeholders — TODO: confirm exact rates with Anthony.
 */

export type PanelType = "door" | "window" | "wall" | "wood" | "metal" | "other";

export const PANEL_TYPES: { key: PanelType; label: string; icon: string }[] = [
  { key: "door", label: "Door", icon: "🚪" },
  { key: "window", label: "Window", icon: "🪟" },
  { key: "wall", label: "Wall", icon: "🧱" },
  { key: "wood", label: "Wood", icon: "🪵" },
  { key: "metal", label: "Metal", icon: "⚙️" },
  { key: "other", label: "Other", icon: "📐" },
];

export type ServicePlanKey = "print-only" | "design-print" | "full-install";

export type ServicePlan = {
  key: ServicePlanKey;
  label: string;
  pricePerSqFt: number;
  description: string;
};

export const SERVICE_PLANS: ServicePlan[] = [
  {
    key: "print-only",
    label: "Print Only",
    pricePerSqFt: 10.0,
    description: "We print it. You handle the rest.",
  },
  {
    key: "design-print",
    label: "Design & Print",
    pricePerSqFt: 12.0,
    description: "We design your artwork and print it.",
  },
  {
    key: "full-install",
    label: "Full Install",
    pricePerSqFt: 18.0,
    description: "Design + print + professional on-site installation.",
  },
];

export type MaterialKey =
  | "standard-vinyl"
  | "window-tint"
  | "wall-vinyl"
  | "full-vinyl"
  | "perforated-film"
  | "special-vinyl";

export type DecalMaterial = {
  key: MaterialKey;
  label: string;
  /** Material's own minimum $/sqft. Final price = max(this, service_plan_price). */
  pricePerSqFt: number;
  blurb: string;
  /** When true, the calculator switches to quote-only mode. */
  quoteOnly?: boolean;
};

export const DECAL_MATERIALS: DecalMaterial[] = [
  {
    key: "standard-vinyl",
    label: "Standard Vinyl",
    pricePerSqFt: 0, // material doesn't add — service plan price applies as-is
    blurb: "Our default printing vinyl",
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
    key: "full-vinyl",
    label: "Full Vinyl",
    pricePerSqFt: 16.0,
    blurb: "Complete privacy",
  },
  {
    key: "perforated-film",
    label: "Perforated Window Film",
    pricePerSqFt: 18.0,
    blurb: "One-way visibility",
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
  /** Panel type — purely descriptive in pricing terms. */
  type: PanelType;
  /** Width in inches. */
  width: number;
  /** Height in inches. */
  height: number;
  description?: string;
};

export type DecalPriceInput = {
  panels: DecalPanelInput[];
  servicePlan: ServicePlanKey;
  material: MaterialKey;
  /** Percentage 0–100. */
  discountPercent: number;
};

export type DecalPriceResult = {
  /** Sum of panel areas in square feet. */
  totalAreaSqFt: number;
  /** Effective per-sqft rate (max of service plan + material). */
  pricePerSqFt: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  total: number;
  quoteOnly: boolean;
};

export function calcDecalPrice(input: DecalPriceInput): DecalPriceResult {
  const plan =
    SERVICE_PLANS.find((p) => p.key === input.servicePlan) ?? SERVICE_PLANS[0];
  const material =
    DECAL_MATERIALS.find((m) => m.key === input.material) ?? DECAL_MATERIALS[0];

  // Total area across all panels — inches² → sqft.
  const totalAreaSqFt = input.panels.reduce((sum, p) => {
    const w = Math.max(0, Number(p.width) || 0);
    const h = Math.max(0, Number(p.height) || 0);
    return sum + (w * h) / 144;
  }, 0);

  // The higher of the two rates wins. Anthony's "Standard Vinyl + Full Install"
  // example ($18) uses the service plan; "Perforated + Print Only" uses the
  // material's $18.
  const pricePerSqFt = Math.max(plan.pricePerSqFt, material.pricePerSqFt);

  const subtotal = round2(pricePerSqFt * totalAreaSqFt);
  const discountPct = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
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
    quoteOnly: Boolean(material.quoteOnly),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
