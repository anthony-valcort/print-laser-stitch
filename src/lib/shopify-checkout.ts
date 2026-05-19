/**
 * Polls the Shopify draft-order invoice URL until it's actually ready in
 * Shopify's checkout system, then resolves. Without this wait, customers
 * occasionally land on "This invoice is not available yet, please try
 * again later" and have to refresh — Shopify returns the invoice URL
 * synchronously from `draft_orders.json` but the URL takes a moment to
 * propagate through their CDN.
 *
 * Polls every 400ms (HEAD request, redirect: manual) for up to 5 seconds.
 * When ready, Shopify responds with a 3xx redirect to `/checkouts/cn/<id>`.
 * Falls through silently if the timeout hits — better to redirect a possibly-
 * not-ready URL than to block forever.
 */
/**
 * Force the draft-order invoice/checkout onto the Shopify checkout domain.
 *
 * Architecture: `www.printlaserstitch.com` serves the headless storefront
 * (Vercel), while the apex `printlaserstitch.com` points to Shopify and is
 * the store's primary domain. Shopify-native accelerated wallets (Apple Pay,
 * Shop Pay) are registered/verified against that primary domain, so checkout
 * must run there — not on `www` (Vercel → 404) and not on `*.myshopify.com`
 * (works for cards but Apple Pay/Shop Pay fail off the verified domain).
 *
 * Override with SHOPIFY_CHECKOUT_DOMAIN if the primary domain ever changes.
 */
const CHECKOUT_DOMAIN =
  process.env.SHOPIFY_CHECKOUT_DOMAIN || "printlaserstitch.com";

export function normalizeInvoiceUrl(invoiceUrl: string): string {
  try {
    const u = new URL(invoiceUrl);
    if (u.host === CHECKOUT_DOMAIN) return invoiceUrl;
    u.protocol = "https:";
    u.host = CHECKOUT_DOMAIN;
    return u.toString();
  } catch {
    return invoiceUrl;
  }
}

export async function waitForInvoiceReady(invoiceUrl: string): Promise<void> {
  const startedAt = Date.now();
  const maxWaitMs = 5000;
  const pollIntervalMs = 400;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const resp = await fetch(invoiceUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
      });
      // Ready: Shopify 3xx-redirects to the actual checkout page.
      if (resp.status >= 300 && resp.status < 400) return;
      // Not ready: 200 with an HTML "not available yet" error page. Continue.
    } catch {
      // Transient fetch error — retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
