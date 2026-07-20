import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderClearCartOnPaid from "@/components/OrderClearCartOnPaid";

/**
 * Order detail page for a draft order created via /api/checkout-cart. We
 * hit Shopify Admin server-side, so the page is always up-to-date — no
 * client polling needed beyond the cart-store's hydration check that
 * auto-clears the cart when the customer pays.
 *
 * Status meanings (Shopify Draft Order API):
 *   - "open"          → draft saved, customer has not paid yet
 *   - "invoice_sent"  → we sent them an invoice link, still unpaid
 *   - "completed"     → customer paid; Shopify converted it to a real Order
 */

export const metadata: Metadata = {
  title: "Your Order · Print Laser Stitch",
};

type Params = Promise<{ id: string }>;

type OrderStatus = {
  id: number;
  status: "open" | "invoice_sent" | "completed";
  isPaid: boolean;
  orderId: number | null;
  invoiceUrl: string | null;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ title: string; quantity: number }>;
};

async function fetchOrderStatus(id: string): Promise<OrderStatus | null> {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!STORE || !TOKEN) return null;
  if (!/^\d+$/.test(id)) return null;

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
    if (!resp.ok) return null;
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
    return {
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
    };
  } catch {
    return null;
  }
}

export default async function OrderPage({ params }: { params: Params }) {
  const { id } = await params;
  const order = await fetchOrderStatus(id);
  if (!order) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        {/* When the order has been paid, ask the cart store (client-side) to
            drop the items the customer just bought. Renders nothing. */}
        {order.isPaid && <OrderClearCartOnPaid draftOrderId={order.id} />}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Order
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {order.isPaid
              ? "Thank you — your order is confirmed"
              : "Your order is pending payment"}
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Draft order #{order.id}
            {order.orderId ? ` · Order #${order.orderId}` : ""} ·{" "}
            {new Date(order.createdAt).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div
          className={`mt-6 rounded-2xl border p-5 text-sm ${
            order.isPaid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {order.isPaid ? (
            <p className="flex items-start gap-2">
              <span className="mt-0.5 text-lg">✓</span>
              <span>
                Payment received. Anthony has been notified and will start
                production shortly. We&apos;ll email you when it ships.
              </span>
            </p>
          ) : (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-lg">⏳</span>
              <div className="flex-1">
                <p>
                  We&apos;re still waiting for your payment. If you closed the
                  checkout window, you can resume here:
                </p>
                {order.invoiceUrl && (
                  <a
                    href={order.invoiceUrl}
                    className="mt-3 inline-flex rounded-md accent-gradient px-5 py-2 font-headline text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
                  >
                    Resume payment →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-border-soft bg-surface">
          <header className="border-b border-border-soft px-5 py-4">
            <h2 className="text-base font-semibold">Order summary</h2>
          </header>
          <ul className="divide-y divide-border-soft">
            {order.items.map((li, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{li.title}</span>
                <span className="shrink-0 text-foreground-muted">
                  × {li.quantity}
                </span>
              </li>
            ))}
          </ul>
          <footer className="flex items-baseline justify-between gap-3 border-t border-border-soft px-5 py-4">
            <span className="text-sm font-medium text-foreground-muted">
              {order.isPaid ? "Total paid" : "Order total"}
            </span>
            <span className="text-xl font-bold">
              ${order.total.toFixed(2)}{" "}
              <span className="text-xs font-medium text-foreground-muted">
                {order.currency}
              </span>
            </span>
          </footer>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md border border-border-soft bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
          >
            ← Continue shopping
          </Link>
          <Link
            href="/account/orders"
            className="rounded-md border border-border-soft bg-white/5 px-5 py-2.5 text-sm font-medium hover:bg-white/10"
          >
            View all orders
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
