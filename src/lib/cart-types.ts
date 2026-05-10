/**
 * Cart item types — discriminated union covering every product family in the
 * shop. The cart is held in localStorage and posted whole to /api/checkout-cart
 * which expands each item into one or more Shopify draft-order line items.
 */

export type CartItemKind = "vinyl-sticker" | "tshirt" | "product" | "signage";

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
}

export interface TShirtSizeLine {
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
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

export interface SignageCartItem extends CartItemBase {
  kind: "signage";
  signageType: string;
  signageTypeLabel: string;
  material: string;
  materialLabel: string;
  width: number;
  height: number;
  sides: "single" | "double";
  addOns: string[];
  qty: number;
  perUnit: number;
  fileUrl?: string;
  fileName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export type CartItem =
  | VinylStickerCartItem
  | TShirtCartItem
  | ProductCartItem
  | SignageCartItem;
