/**
 * Google Business Profile review summary, shown as a visible badge.
 *
 * Update these when they change (last synced from the Google profile:
 * 2026-11-04). They are deliberately NOT written into the page's structured
 * data: Google does not award star ratings in search for a business's
 * reviews about itself, and marking them up risks a penalty for no gain.
 * The visible badge builds trust with customers; the link lets them verify.
 */
export const GOOGLE_REVIEWS = {
  rating: 5.0,
  count: 117,
  /** Opens the business listing on Google Maps, where the reviews live. */
  url: "https://www.google.com/maps/search/?api=1&query=Print+Laser+Stitch+3153+SE+Dominica+Terrace+Stuart+FL+34997",
} as const;
