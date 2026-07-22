// Client-provided "How to Order" walkthrough videos, keyed by the
// product's real Shopify handle. Centralized here so the same video ID
// can be reused by any configurator or route that renders that product
// (friendly static page, raw-handle catch-all, or a collection page),
// without duplicating the ID in multiple places.
export const HOW_TO_ORDER_VIDEO_IDS: Record<string, string> = {
  "cotton-t-shirts": "jlGjde0g60k",
  "custom-embroidered-polo": "jlGjde0g60k",
  "super-soft-style-50-50-tshirt": "jlGjde0g60k",
  "5-panel-with-rope": "jlGjde0g60k",
  "richardson-112fp": "jlGjde0g60k",
};
