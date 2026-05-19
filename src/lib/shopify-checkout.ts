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
 * Shopify generates the draft-order invoice URL on the store's *primary*
 * domain. In this headless setup that domain (www.printlaserstitch.com)
 * resolves to Vercel — which has no Shopify checkout/invoice pages, so the
 * customer hits a 404. Rewrite the host to the myshopify domain, which
 * Shopify always serves checkout & invoices on regardless of the storefront's
 * primary domain.
 */
export function normalizeInvoiceUrl(invoiceUrl: string): string {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!storeDomain) return invoiceUrl;
  try {
    const u = new URL(invoiceUrl);
    if (u.host === storeDomain) return invoiceUrl;
    u.protocol = "https:";
    u.host = storeDomain;
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
