/**
 * Signage quote calculator — pricing rules for custom signs.
 *
 * Industry-standard placeholder rates. TODO: confirm exact $/sqft and add-on
 * fees with Anthony — these are reasonable defaults but his real margins may
 * differ.
 */

export type SignageType = {
  key: string;
  label: string;
  icon: string;
  blurb: string;
};

export const SIGNAGE_TYPES: SignageType[] = [
  {
    key: "banner",
    label: "Vinyl Banner",
    icon: "🎯",
    blurb: "Indoor & outdoor printed banners — events, storefronts, trade shows.",
  },
  {
    key: "yard_sign",
    label: "Yard Sign",
    icon: "🪧",
    blurb: "Coroplast lawn signs — political, real estate, garage sales.",
  },
  {
    key: "aluminum",
    label: "Aluminum Sign",
    icon: "🛡️",
    blurb: "Rigid metal signs — parking, traffic, business.",
  },
  {
    key: "acrylic",
    label: "Acrylic Sign",
    icon: "💎",
    blurb: "Premium clear or frosted acrylic — office lobbies, awards.",
  },
  {
    key: "foam",
    label: "Foam Board Sign",
    icon: "📋",
    blurb: "Lightweight indoor display signs — events, presentations.",
  },
];

export type SignageMaterial = {
  key: string;
  label: string;
  pricePerSqFt: number;
  doubleSidedAllowed: boolean;
};

export const SIGNAGE_MATERIALS: Record<string, SignageMaterial[]> = {
  banner: [
    {
      key: "vinyl-13oz",
      label: "13 oz Vinyl (Standard)",
      pricePerSqFt: 4.0,
      doubleSidedAllowed: true,
    },
    {
      key: "vinyl-16oz",
      label: "16 oz Heavy Vinyl",
      pricePerSqFt: 5.0,
      doubleSidedAllowed: true,
    },
    {
      key: "mesh",
      label: "Mesh Banner (wind-resistant)",
      pricePerSqFt: 5.5,
      doubleSidedAllowed: false,
    },
  ],
  yard_sign: [
    {
      key: "coroplast-4mm",
      label: "4 mm Coroplast",
      pricePerSqFt: 4.5,
      doubleSidedAllowed: true,
    },
    {
      key: "coroplast-6mm",
      label: "6 mm Coroplast (Premium)",
      pricePerSqFt: 5.5,
      doubleSidedAllowed: true,
    },
  ],
  aluminum: [
    {
      key: "alum-040",
      label: ".040 Aluminum (Standard)",
      pricePerSqFt: 9.0,
      doubleSidedAllowed: true,
    },
    {
      key: "alum-080",
      label: ".080 Aluminum (Heavy Duty)",
      pricePerSqFt: 14.0,
      doubleSidedAllowed: true,
    },
  ],
  acrylic: [
    {
      key: "acrylic-3mm",
      label: "3 mm Acrylic (Clear)",
      pricePerSqFt: 12.0,
      doubleSidedAllowed: true,
    },
  ],
  foam: [
    {
      key: "foam-3mm",
      label: "3 mm Foam Board",
      pricePerSqFt: 6.0,
      doubleSidedAllowed: false,
    },
  ],
};

export type CommonSize = { w: number; h: number; label: string };

/** Common preset sizes per type (W × H in inches). */
export const COMMON_SIZES: Record<string, CommonSize[]> = {
  banner: [
    { w: 24, h: 48, label: '2′ × 4′' },
    { w: 36, h: 72, label: '3′ × 6′' },
    { w: 48, h: 96, label: '4′ × 8′' },
    { w: 24, h: 72, label: '2′ × 6′' },
    { w: 30, h: 72, label: '2.5′ × 6′' },
    { w: 60, h: 120, label: '5′ × 10′' },
  ],
  yard_sign: [
    { w: 18, h: 24, label: '18″ × 24″' },
    { w: 24, h: 18, label: '24″ × 18″' },
    { w: 12, h: 18, label: '12″ × 18″' },
    { w: 24, h: 36, label: '24″ × 36″' },
  ],
  aluminum: [
    { w: 12, h: 18, label: '12″ × 18″' },
    { w: 18, h: 24, label: '18″ × 24″' },
    { w: 24, h: 36, label: '24″ × 36″' },
    { w: 30, h: 42, label: '30″ × 42″' },
  ],
  acrylic: [
    { w: 12, h: 12, label: '12″ × 12″' },
    { w: 18, h: 24, label: '18″ × 24″' },
    { w: 24, h: 36, label: '24″ × 36″' },
  ],
  foam: [
    { w: 18, h: 24, label: '18″ × 24″' },
    { w: 24, h: 36, label: '24″ × 36″' },
    { w: 36, h: 48, label: '36″ × 48″' },
  ],
};

export type AddOn = {
  key: string;
  label: string;
  description: string;
  flatFee?: number;
  percentMarkup?: number;
  applicableTo: string[];
};

export const ADD_ONS: AddOn[] = [
  {
    key: "grommets",
    label: "Grommets",
    description: "4 brass grommets, one per corner",
    flatFee: 4.0,
    applicableTo: ["banner", "yard_sign", "aluminum"],
  },
  {
    key: "pole_pockets",
    label: "Pole pockets",
    description: "Top + bottom pockets for hanging",
    flatFee: 8.0,
    applicableTo: ["banner"],
  },
  {
    key: "lamination",
    label: "Lamination",
    description: "UV protection + extra durability",
    percentMarkup: 0.2,
    applicableTo: ["banner", "aluminum", "yard_sign"],
  },
  {
    key: "stakes",
    label: "H-stakes",
    description: "Galvanized steel stakes for ground install",
    flatFee: 2.0,
    applicableTo: ["yard_sign"],
  },
  {
    key: "wind_slits",
    label: "Wind slits",
    description: "Reduces wind load on large outdoor banners",
    flatFee: 5.0,
    applicableTo: ["banner"],
  },
];

export const DOUBLE_SIDED_MULTIPLIER = 1.8;
export const MIN_ORDER_PRICE = 25.0;
/** Custom size threshold — anything wider OR taller than this triggers quote-only. */
export const CUSTOM_SIZE_QUOTE_THRESHOLD_INCHES = 120;

export type SignagePriceInput = {
  type: string;
  material: string;
  /** Width in inches. */
  width: number;
  /** Height in inches. */
  height: number;
  sides: "single" | "double";
  addOns: string[];
  quantity: number;
};

export type SignagePriceResult = {
  perUnit: number;
  total: number;
  area: number; // sqft
  breakdown: { label: string; amount: number }[];
};

export function calcSignagePrice(input: SignagePriceInput): SignagePriceResult {
  const materials = SIGNAGE_MATERIALS[input.type] ?? [];
  const material =
    materials.find((m) => m.key === input.material) ?? materials[0];

  // Convert inches to feet for sqft area.
  const area = (input.width * input.height) / 144;
  const breakdown: { label: string; amount: number }[] = [];

  let perUnit = area * material.pricePerSqFt;
  breakdown.push({
    label: `${material.label} · ${area.toFixed(2)} sq ft × $${material.pricePerSqFt.toFixed(2)}/sqft`,
    amount: perUnit,
  });

  if (input.sides === "double" && material.doubleSidedAllowed) {
    const before = perUnit;
    perUnit *= DOUBLE_SIDED_MULTIPLIER;
    breakdown.push({
      label: `Double-sided printing (×${DOUBLE_SIDED_MULTIPLIER})`,
      amount: perUnit - before,
    });
  }

  // Percent markups (e.g. lamination)
  for (const addOnKey of input.addOns) {
    const addOn = ADD_ONS.find((a) => a.key === addOnKey);
    if (addOn?.percentMarkup) {
      const fee = perUnit * addOn.percentMarkup;
      perUnit += fee;
      breakdown.push({
        label: `${addOn.label} (+${(addOn.percentMarkup * 100).toFixed(0)}%)`,
        amount: fee,
      });
    }
  }

  // Flat fees (grommets, stakes, etc.)
  for (const addOnKey of input.addOns) {
    const addOn = ADD_ONS.find((a) => a.key === addOnKey);
    if (addOn?.flatFee) {
      perUnit += addOn.flatFee;
      breakdown.push({
        label: addOn.label,
        amount: addOn.flatFee,
      });
    }
  }

  // Min price floor
  if (perUnit < MIN_ORDER_PRICE) {
    breakdown.push({
      label: `Minimum order adjustment`,
      amount: MIN_ORDER_PRICE - perUnit,
    });
    perUnit = MIN_ORDER_PRICE;
  }

  const qty = Math.max(1, input.quantity);
  const total = perUnit * qty;

  return {
    perUnit: round2(perUnit),
    total: round2(total),
    area: Math.round(area * 100) / 100,
    breakdown: breakdown.map((b) => ({
      ...b,
      amount: round2(b.amount),
    })),
  };
}

/** True when dimensions exceed our auto-quote threshold and require manual quote. */
export function requiresManualQuote(width: number, height: number): boolean {
  return (
    width > CUSTOM_SIZE_QUOTE_THRESHOLD_INCHES ||
    height > CUSTOM_SIZE_QUOTE_THRESHOLD_INCHES
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
