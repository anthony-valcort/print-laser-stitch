import { type NextRequest, NextResponse } from "next/server";

/**
 * Lightweight status check for a single draft order. The cart store polls
 * this on hydration to detect "user just paid in another tab / on the
 * Shopify invoice page" and auto-clears the cart when status flips from
 * `open` to `completed`.
 *
 * Public endpoint by draft-order id — IDs are numeric and somewhat
 * guessable, but the response carries no PII (no email, no addresses, no
 * payment data — just status + total + item titles), so the surface is
 * limited to "did this specific draft become a real order yet".
 */
export async function GET(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!STORE || !TOKEN) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "Missing or invalid draft order id" },
      { status: 400 },
    );
  }

  try {
    const resp = await fetch(
      `https://${STORE}/admin/api/2026-04/draft_orders/${id}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
    if (resp.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!resp.ok) {
      return NextResponse.json(
        { error: "Shopify lookup failed" },
        { status: 502 },
      );
    }
    const data = (await resp.json()) as {
      draft_order: {
        id: number;
        status: "open" | "invoice_sent" | "completed";
        invoice_url: string | null;
        total_price: string;
        currency: string;
        created_at: string;
        order_id: number | null;
        line_items: Array<{ title: string; quantity: number }>;
      };
    };
    const d = data.draft_order;
    return NextResponse.json({
      id: d.id,
      status: d.status,
      isPaid: d.status === "completed",
      orderId: d.order_id,
      invoiceUrl: d.invoice_url,
      total: Number(d.total_price),
      currency: d.currency,
      createdAt: d.created_at,
      items: d.line_items.map((li) => ({
        title: li.title,
        quantity: li.quantity,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
