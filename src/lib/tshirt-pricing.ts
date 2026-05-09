export const PRINT_LOCATIONS = [
  { key: "front", label: "Front only", icon: "👕" },
  { key: "back", label: "Back only", icon: "🔄" },
  { key: "both", label: "Front + Back", icon: "✨" },
] as const;

export type PrintLocationKey = (typeof PRINT_LOCATIONS)[number]["key"];

/** Anthony's Shopify listing requires a minimum 12-unit order. */
export const TSHIRT_MIN_QUANTITY = 12;

// Per-shirt printing fee. Anthony's listing on printlaserstitch.com does not
// charge a separate print fee, so all locations are $0 — print location stays
// in the order properties for the production team but doesn't change price.
export const PRINT_LOCATION_FEE: Record<PrintLocationKey, number> = {
  front: 0,
  back: 0,
  both: 0,
};

export type TShirtPriceInput = {
  variantPrice: number;
  printLocation: PrintLocationKey;
  quantity: number;
};

export type TShirtPriceResult = {
  variantPrice: number;
  printFee: number;
  perUnit: number;
  total: number;
};

export function calcTShirtPrice({
  variantPrice,
  printLocation,
  quantity,
}: TShirtPriceInput): TShirtPriceResult {
  const printFee = PRINT_LOCATION_FEE[printLocation];
  const perUnit = round2(variantPrice + printFee);
  const total = round2(perUnit * Math.max(1, quantity));

  return {
    variantPrice: round2(variantPrice),
    printFee: round2(printFee),
    perUnit,
    total,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
