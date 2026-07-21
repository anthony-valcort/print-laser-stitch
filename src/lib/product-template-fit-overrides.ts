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
};

export const PRODUCT_TEMPLATE_FIT_OVERRIDES: Record<string, TemplateFitOverrides> = {
  "custom-banners": { sizeUnit: "ft", showBleedTrim: false },
  "2x3-5-standard-business-cards": { fixedSizeInches: { width: 2, height: 3.5 } },
};

export function getTemplateFitOverrides(handle: string): TemplateFitOverrides {
  return PRODUCT_TEMPLATE_FIT_OVERRIDES[handle] ?? {};
}
