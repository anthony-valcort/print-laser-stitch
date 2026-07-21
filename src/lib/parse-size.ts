export type SizeInches = { width: number; height: number };

// A number token — "4", "4.25", or ".6" (a leading-dot decimal, as seen in
// Anthony's "8x5x.6"" cutting-board depth).
const NUM = /(?:\d+(?:\.\d+)?|\.\d+)/.source;
// An inch marker — the word "in"/"inch"/"inches", or the typographic
// double-quote/double-prime symbols Shopify size labels use ("12" x 18"",
// "12” x 60”").
const UNIT_WORD = /(?:in(?:ch(?:es)?)?\.?|["″”])?/.source;

// Three chained numbers ("8x5x.6"", "16 x 11 x 1\"") means width × height ×
// depth — a physical 3D product (e.g. a cutting board), not a flat sheet
// with a print bleed. Reject those before attempting the 2D match below.
const THREE_DIM_PATTERN = new RegExp(
  `${NUM}\\s*${UNIT_WORD}\\s*[x×]\\s*${NUM}\\s*${UNIT_WORD}\\s*[x×]\\s*${NUM}`,
  "i",
);

/**
 * Extracts width × height in inches from a Shopify size-option value like
 * "4x6", "4.25x5.5", "5 x 7", "5×7", Anthony's "4 Inch x 6 Inch" format, or
 * the quoted "12" x 18"" format. Returns null for non-dimensional labels
 * (e.g. "Small", "100 pcs") and for width×height×depth labels (3D products)
 * so callers can gracefully hide dimension-based features (template-fit,
 * blank template PDF) for those variants.
 */
export function parseSizeInches(label: string): SizeInches | null {
  if (THREE_DIM_PATTERN.test(label)) return null;
  const pattern = new RegExp(
    `(${NUM})\\s*${UNIT_WORD}\\s*[x×]\\s*(${NUM})\\s*${UNIT_WORD}`,
    "i",
  );
  const match = label.match(pattern);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { width, height };
}

/** The unit a product's Size option numbers are actually written in. Most
 * print products (Flyers, Posters, Car Magnets…) use inches, but Banners'
 * "2 x 1" .. "8 x 4" are feet (a 2ft × 1ft banner), same as the printing
 * industry usually quotes them — the raw numbers look identical to inches,
 * so this has to be told per-product, not inferred from the string. */
export type SizeUnit = "in" | "ft";

/** Like parseSizeInches, but converts to inches when the label's numbers are
 * actually in feet (see SizeUnit). */
export function parseSizeInchesWithUnit(
  label: string,
  unit: SizeUnit = "in",
): SizeInches | null {
  const parsed = parseSizeInches(label);
  if (!parsed) return null;
  return unit === "ft"
    ? { width: parsed.width * 12, height: parsed.height * 12 }
    : parsed;
}

/** First dimension-shaped value among the customer's current selections. */
export function selectedSizeInches(
  selectedOptions: Record<string, string>,
  unit: SizeUnit = "in",
): SizeInches | null {
  for (const value of Object.values(selectedOptions)) {
    const parsed = parseSizeInchesWithUnit(value, unit);
    if (parsed) return parsed;
  }
  return null;
}

/** The Shopify product option whose values look like dimensions (e.g. the
 * "Size" option on Flyers: "4x6", "5x7", …) — used to build a size dropdown
 * for the blank-template PDF download, independent of whatever the customer
 * currently has selected. */
export function findDimensionOption<T extends { values: string[] }>(
  options: T[],
): T | undefined {
  return options.find((o) => o.values.some((v) => parseSizeInches(v) !== null));
}
