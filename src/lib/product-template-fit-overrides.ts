import type { SizeUnit } from "@/lib/parse-size";

/**
 * Per-product overrides for the template-fit flow, keyed by the *real*
 * Shopify product handle. Declared once here and consumed by both the
 * product's own static page (e.g. banners/page.tsx) and the dynamic
 * catch-all route (`products/[handle]/page.tsx`) — a customer can land on
 * the same product either through its friendly static route or directly by
 * its raw Shopify handle (e.g. "/products/custom-banners"), and both must
 * apply the same overrides or the template-fit studio silently reverts to
 * wrong defaults (this happened once: Banners' feet-based sizing and
 * disabled bleed/trim only worked via the friendly URL until this shared
 * map was introduced).
 */
export type TemplateFitOverrides = {
  sizeUnit?: SizeUnit;
  showBleedTrim?: boolean;
  fixedSizeInches?: { width: number; height: number };
  /** Mirrors GenericProductConfigurator's uploadMode prop for products that
   * force a non-"auto" mode on their static page (e.g. Business Cards always
   * requires both sides, no customer choice) — read by the mobile app's
   * product API response so it reaches the same effective upload mode as
   * the matching web page without duplicating that page's JSX props. Not
   * consumed by the web pages themselves (they already pass this prop
   * directly); this field exists purely for the mobile API to expose it. */
  uploadMode?: "single" | "front-back";
  uploadLabel?: string;
};

export const PRODUCT_TEMPLATE_FIT_OVERRIDES: Record<string, TemplateFitOverrides> = {
  "custom-banners": { sizeUnit: "ft", showBleedTrim: false, uploadLabel: "Banner Design" },
  // Standard business cards are landscape (3.5" wide x 2" tall) — this was
  // previously {width: 2, height: 3.5} (portrait), which drew the wrong-shaped
  // print guide in both the Fit Studio canvas and the downloadable blank PDF.
  "2x3-5-standard-business-cards": {
    fixedSizeInches: { width: 3.5, height: 2 },
    uploadMode: "front-back",
  },
};

export function getTemplateFitOverrides(handle: string): TemplateFitOverrides {
  return PRODUCT_TEMPLATE_FIT_OVERRIDES[handle] ?? {};
}
