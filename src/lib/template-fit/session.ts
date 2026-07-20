export type TemplateFitSide = "front" | "back";

export type TemplateFitVariant = {
  id: string;
  price: string;
  selectedOptions: Record<string, string>;
};

export type TemplateFitPayload = {
  productHandle: string;
  productTitle: string;
  widthIn: number;
  heightIn: number;
  uploadLabel: string;
  effectiveUploadMode: "single" | "front-back";
  sides: Partial<
    Record<TemplateFitSide, { fileUrl: string; fileName: string | null }>
  >;
  /** The Shopify option that controls size (e.g. "Size"), if one was found. */
  sizeOptionName: string | null;
  /** Dimension-shaped values of that option, e.g. ["4 Inch x 6 Inch", "5 Inch x 7 Inch"]. */
  sizeChoices: string[];
  /** Every variant, so picking a new size can re-resolve price + variant id. */
  variants: TemplateFitVariant[];
  cartItem: {
    title: string;
    thumbnail: string;
    unitPrice: number;
    qty: number;
    variantId: string;
    productTitle: string;
    selectedOptions: Record<string, string>;
    extraProperties: Record<string, string>;
    editHref: string;
  };
};

const KEY = "pls_template_fit";

/** Handed off from the product configurator to the template-fit page across
 * a full navigation — sessionStorage survives the redirect but stays
 * same-tab/same-origin, unlike a query string (no size limit, no encoding of
 * nested objects needed). */
export function saveTemplateFitPayload(payload: TemplateFitPayload): void {
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function readTemplateFitPayload(): TemplateFitPayload | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TemplateFitPayload;
  } catch {
    return null;
  }
}

export function clearTemplateFitPayload(): void {
  sessionStorage.removeItem(KEY);
}
