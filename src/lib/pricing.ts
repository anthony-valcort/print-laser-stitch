export type SizeKey = "2x2" | "3x3" | "4x4" | "5x5";

export type QuantityKey = 50 | 100 | 200 | 300 | 500 | 1000 | 2500;

export const SHAPE_OPTIONS = [
  { key: "custom", label: "Custom Shape" },
  { key: "circle", label: "Circle" },
  { key: "oval", label: "Oval" },
  { key: "square", label: "Square" },
  { key: "rectangle", label: "Rectangle" },
] as const;

export type ShapeKey = (typeof SHAPE_OPTIONS)[number]["key"];

export const MATERIAL_OPTIONS = [
  { key: "matte", label: "Matte" },
  { key: "gloss", label: "Gloss" },
] as const;

export type MaterialKey = (typeof MATERIAL_OPTIONS)[number]["key"];

export const SIZE_OPTIONS: {
  key: SizeKey;
  label: string;
  sublabel: string;
  inches: number;
}[] = [
  { key: "2x2", label: 'Small (2")', sublabel: "2\" × 2\"", inches: 2 },
  { key: "3x3", label: 'Medium (3")', sublabel: "3\" × 3\"", inches: 3 },
  { key: "4x4", label: 'Large (4")', sublabel: "4\" × 4\"", inches: 4 },
  { key: "5x5", label: 'X-Large (5")', sublabel: "5\" × 5\"", inches: 5 },
];

export const QUANTITY_OPTIONS: QuantityKey[] = [
  50, 100, 200, 300, 500, 1000, 2500,
];

// Per-unit price at qty=50 for each standard size (USD)
const BASE_UNIT_AT_50: Record<SizeKey, number> = {
  "2x2": 1.17,
  "3x3": 1.35,
  "4x4": 1.62,
  "5x5": 1.91,
};

// Quantity discount factor — multiplied against the qty=50 per-unit price.
// E.g. discount=0.6 at qty=100 means each sticker costs 60% of the qty=50 unit price.
const QTY_DISCOUNT: Record<QuantityKey, number> = {
  50: 1.0,
  100: 0.6,
  200: 0.38,
  300: 0.3,
  500: 0.24,
  1000: 0.19,
  2500: 0.12,
};

// Linear fit to BASE_UNIT_AT_50 by area (sq in):
//   perUnit_qty50 ≈ CUSTOM_BASE + CUSTOM_PER_SQ_IN × (W × H)
// Used for custom sizes only.
const CUSTOM_BASE_PRICE = 1.04;
const CUSTOM_PRICE_PER_SQ_IN = 0.035;
const CUSTOM_MIN_AREA_SQ_IN = 1; // 1"×1" minimum

const MATERIAL_MULTIPLIER: Record<MaterialKey, number> = {
  matte: 1.0,
  gloss: 1.0,
};

const SHAPE_MULTIPLIER: Record<ShapeKey, number> = {
  custom: 1.0,
  circle: 1.0,
  oval: 1.0,
  square: 1.0,
  rectangle: 1.0,
};

export const STORE_CREDIT_RATE = 0.02; // 2% back as store credit
export const RUSH_FEE_RATE = 0.25;

export type PriceResult = {
  perUnit: number;
  total: number;
  savingsPercent: number;
  storeCredit: number;
};

function baseUnitPriceAt50({
  size,
  customWidth,
  customHeight,
}: {
  size: SizeKey | "custom";
  customWidth?: number;
  customHeight?: number;
}): number {
  if (size === "custom") {
    const area = Math.max(
      (customWidth ?? 3) * (customHeight ?? 3),
      CUSTOM_MIN_AREA_SQ_IN,
    );
    return CUSTOM_BASE_PRICE + CUSTOM_PRICE_PER_SQ_IN * area;
  }
  return BASE_UNIT_AT_50[size];
}

export function calcPrice({
  size,
  qty,
  shape,
  material,
  customWidth,
  customHeight,
}: {
  size: SizeKey | "custom";
  qty: QuantityKey;
  shape: ShapeKey;
  material: MaterialKey;
  customWidth?: number;
  customHeight?: number;
}): PriceResult {
  const baseUnit = baseUnitPriceAt50({ size, customWidth, customHeight });
  const sizeShapeMaterial =
    baseUnit * MATERIAL_MULTIPLIER[material] * SHAPE_MULTIPLIER[shape];

  const perUnit = sizeShapeMaterial * QTY_DISCOUNT[qty];
  const total = perUnit * qty;

  // Savings vs the same per-unit price at qty=50 (no quantity discount).
  const savingsPercent = Math.max(
    0,
    Math.round((1 - QTY_DISCOUNT[qty]) * 100),
  );

  const storeCredit = total * STORE_CREDIT_RATE;

  return {
    perUnit: round2(perUnit),
    total: round2(total),
    savingsPercent,
    storeCredit: round2(storeCredit),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
