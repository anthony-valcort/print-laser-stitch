import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import GuestOrdersList from "@/components/GuestOrdersList";
import {
  getCurrentCustomer,
  getCurrentCustomerOrders,
} from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Orders · Print Laser Stitch",
  description: "View your order history, download invoices, and track orders.",
};

export default async function OrdersPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/orders");

  const orders = await getCurrentCustomerOrders();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="Orders" />
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <span className="text-sm text-foreground-muted">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-border-soft bg-surface p-8 text-center">
            <div className="text-4xl">🛒</div>
            <p className="mt-3 text-sm text-foreground-muted">
              You haven&apos;t placed any orders yet. Browse our products to
              get started.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-md accent-gradient px-5 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <article
                key={o.id}
                className="overflow-hidden rounded-2xl border border-border-soft bg-surface"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Order #{o.orderNumber}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {new Date(o.processedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill kind="financial" status={o.financialStatus} />
                    <StatusPill
                      kind="fulfillment"
                      status={o.fulfillmentStatus}
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      ${parseFloat(o.totalPrice.amount).toFixed(2)}{" "}
                      <span className="text-xs font-medium text-foreground-muted">
                        {o.totalPrice.currencyCode}
                      </span>
                    </div>
                  </div>
                </header>
                <ul className="divide-y divide-border-soft">
                  {o.lineItems.map((li, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <div>
                        <div className="font-medium">{li.title}</div>
                        {li.variantTitle && (
                          <div className="text-xs text-foreground-muted">
                            {li.variantTitle}
                          </div>
                        )}
                      </div>
                      <div className="text-foreground-muted">
                        × {li.quantity}
                      </div>
                    </li>
                  ))}
                </ul>
                <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border-soft bg-white/2 px-5 py-3">
                  <a
                    href={`/api/account/invoice/${o.orderNumber}`}
                    className="rounded-md border border-border-soft bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                  >
                    Invoice
                  </a>
                  <a
                    href={o.statusUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border-soft bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                  >
                    View details
                  </a>
                </footer>
              </article>
            ))}
          </div>
        )}

        {/* Recent local activity — drafts not yet appearing in Shopify's
            customer.orders (paid orders only). */}
        <GuestOrdersList filterByEmail={customer.email} />
      </main>
      <Footer />
    </>
  );
}

function StatusPill({
  kind,
  status,
}: {
  kind: "financial" | "fulfillment";
  status: string | null;
}) {
  if (!status) return null;
  const label = status.replace(/_/g, " ").toLowerCase();
  const palette =
    kind === "financial"
      ? status.toUpperCase() === "PAID"
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : status.toUpperCase() === "FULFILLED"
        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
        : "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${palette}`}
    >
      {label}
    </span>
  );
}
