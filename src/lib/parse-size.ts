export type SizeInches = { width: number; height: number };

const UNIT_WORD = /(?:in(?:ch(?:es)?)?\.?)?/.source;

/**
 * Extracts width × height in inches from a Shopify size-option value like
 * "4x6", "4.25x5.5", "5 x 7", "5×7", or Anthony's actual "4 Inch x 6 Inch"
 * / "4 Inch x 5.5 Inch" format. Returns null for non-dimensional labels
 * (e.g. "Small", "100 pcs") so callers can gracefully hide dimension-based
 * features (template-fit, blank template PDF) for those variants.
 */
export function parseSizeInches(label: string): SizeInches | null {
  const pattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${UNIT_WORD}\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*${UNIT_WORD}`,
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

/** First dimension-shaped value among the customer's current selections. */
export function selectedSizeInches(
  selectedOptions: Record<string, string>,
): SizeInches | null {
  for (const value of Object.values(selectedOptions)) {
    const parsed = parseSizeInches(value);
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
