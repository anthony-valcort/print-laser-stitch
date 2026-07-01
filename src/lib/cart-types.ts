/**
 * Cart item types — discriminated union covering every product family in the
 * shop. The cart is held in localStorage and posted whole to /api/checkout-cart
 * which expands each item into one or more Shopify draft-order line items.
 */

export type CartItemKind =
  | "vinyl-sticker"
  | "tshirt"
  | "product"
  | "signage"
  | "decal"
  | "vehicle-sticker";

export interface CartItemBase {
  /** Unique cart-line id — used for remove/edit. */
  id: string;
  /** ms since epoch when added. */
  addedAt: number;
  /** Shown as the line title in cart. */
  title: string;
  /** Short summary of options (e.g. "3″ Square · Glossy"). */
  subtitle: string;
  /** Emoji or image URL for the cart row icon. */
  thumbnail: string;
  /** Display-only per-unit label, e.g. "$0.40 / sticker" or "$25 / shirt". */
  unitLabel: string;
  /** Total price in dollars (per-unit × qty). */
  totalPrice: number;
  /** Total quantity across this line. For T-shirts this is the sum of every size. */
  quantity: number;
  /** Optional return path so the user can edit and re-add. */
  editHref?: string;
}

export interface VinylStickerCartItem extends CartItemBase {
  kind: "vinyl-sticker";
  shape: string;
  material: string;
  size: string;
  customWidth?: number;
  customHeight?: number;
  roundedCorners: boolean | null;
  /** Snapped tier (50, 100, 250…) used for pricing. */
  tierQty: number;
  perUnit: number;
  fileUrl?: string;
  fileName?: string;
  instructions?: string;
  /** Preflight proof (set once the customer reviews & approves a proof). */
  proof?: {
    status: "approved" | "changes-requested";
    /** Shopify Files URL of the flattened proof preview. */
    proofUrl?: string;
    /** Shopify Files URL of the production cutline SVG. */
    cutlineUrl?: string;
    shape: string;
    borderThickness: string;
    roundedCorners: string;
    removedBackground: boolean;
    lowResolution: boolean;
    /** Customer note when they asked for changes instead of approving. */
    changeNote?: string;
  };
}

export interface TShirtSizeLine {
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  /** Set when the product has a Shopify Color option and the customer mixes
   * colors within one order (per-color size matrix). */
  color?: string;
}

export interface TShirtCartItem extends CartItemBase {
  kind: "tshirt";
  productTitle: string;
  selectedOptions: Record<string, string>;
  /** When the underlying product exposes a print location. */
  printLocation?: string;
  /** When there's no print location, label the single design file (e.g. "Embroidery Artwork"). */
  uploadLabel?: string;
  shirtColor?: string;
  sizeVariants: TShirtSizeLine[];
  frontFileUrl?: string;
  frontFileName?: string;
  backFileUrl?: string;
  backFileName?: string;
  phone?: string;
  instructions?: string;
}

export interface ProductCartItem extends CartItemBase {
  kind: "product";
  /** Shopify variant GID. */
  variantId: string;
  productTitle: string;
  selectedOptions: Record<string, string>;
  qty: number;
  unitPrice: number;
  /** Design URLs, phone, instructions — name → value. */
  extraProperties?: Record<string, string>;
}

/**
 * Decal Signage Calculator (service-plan-based). Single rectangle × qty, one
 * of three service tiers, optional discount. No tax, no material.
 */
export interface SignageCartItem extends CartItemBase {
  kind: "signage";
  /** Width in the chosen unit. */
  width: number;
  /** Length in the chosen unit. */
  length: number;
  /** Whether width/length are feet or inches. */
  unit: "ft" | "in";
  qty: number;
  servicePlan: string;
  servicePlanLabel: string;
  pricePerSqFt: number;
  unitAreaSqFt: number;
  totalAreaSqFt: number;
  discountPercent: number;
  subtotal: number;
  notes?: string;
}

export interface DecalPanelLine {
  type: string;
  typeLabel: string;
  /** Width in inches. */
  width: number;
  /** Height in inches. */
  height: number;
  description?: string;
}

/**
 * Quick Quote calculator (multi-panel + material). Material's $/sqft × total
 * area, optional discount, 7% Martin County tax always on top.
 */
export interface DecalCartItem extends CartItemBase {
  kind: "decal";
  panels: DecalPanelLine[];
  material: string;
  materialLabel: string;
  discountPercent: number;
  pricePerSqFt: number;
  totalAreaSqFt: number;
  /** Subtotal before discount + tax. */
  subtotal: number;
  /** Tax amount (7% Martin County, already baked into totalPrice). */
  taxAmount: number;
  notes?: string;
}

export interface VehicleStickerCartItem extends CartItemBase {
  kind: "vehicle-sticker";
  make: string;
  model: string;
  year: number;
  part: string;
  partLabel: string;
}

export type CartItem =
  | VinylStickerCartItem
  | TShirtCartItem
  | ProductCartItem
  | SignageCartItem
  | DecalCartItem
  | VehicleStickerCartItem;

// Distributive Omit — correctly narrows each union member separately.
// `Omit<CartItem, K>` collapses the union to only shared properties,
// which is why `make`, `model`, etc. disappear. This preserves the full union.
type DistributiveOmit<T, K extends keyof any> = T extends T ? Omit<T, K> : never;
export type NewCartItem = DistributiveOmit<CartItem, "id" | "addedAt"> &
  Partial<Pick<CartItemBase, "id" | "addedAt">>;
