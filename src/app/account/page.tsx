import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import EditableProfile from "@/components/EditableProfile";
import GuestOrderMigrator from "@/components/GuestOrderMigrator";
import GuestOrdersList from "@/components/GuestOrdersList";
import {
  getCurrentCustomer,
  getCurrentCustomerOrders,
} from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "My Account · Print Laser Stitch",
  description: "View your orders and account details.",
};

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  // Guest view — no profile/Shopify orders, but they can still see anything
  // saved locally on this device, with a clear migration CTA.
  if (!customer) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              My Account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              You&apos;re shopping as a guest
            </h1>
            <p className="mt-2 max-w-xl text-sm text-foreground-muted">
              Any orders you placed on this device are shown below.{" "}
              <Link
                href="/login?redirect=/account"
                className="font-semibold text-accent hover:underline"
              >
                Log in
              </Link>{" "}
              or{" "}
              <Link
                href="/signup?redirect=/account"
                className="font-semibold text-accent hover:underline"
              >
                create an account
              </Link>{" "}
              with the same email to keep them in your history forever and
              access them from any device.
            </p>
          </div>

          <GuestOrdersList filterByEmail={null} />
        </main>
        <Footer />
      </>
    );
  }

  const orders = await getCurrentCustomerOrders();

  const fullName =
    customer.displayName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        {/* Side-effect only: links any guest orders saved locally on this
            device whose email matches the customer's, to their Shopify
            record. Renders nothing. */}
        <GuestOrderMigrator customerEmail={customer.email} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              My Account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Hi, {fullName}
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {customer.email}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Profile card — inline editable */}
        <EditableProfile
          initial={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
          }}
        />

        {/* Recent local activity — drafts not yet appearing in Shopify's
            customer.orders (paid orders only). Filtered to this customer's
            email so a shared device doesn't leak other accounts' orders. */}
        <GuestOrdersList filterByEmail={customer.email} />

        {/* Orders */}
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Order history</h2>
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
              <a
                href="/"
                className="mt-4 inline-flex rounded-md accent-gradient px-5 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black"
              >
                Browse products
              </a>
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
                      <StatusPill
                        kind="financial"
                        status={o.financialStatus}
                      />
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
                      <a
                        href={o.statusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
                      >
                        View order →
                      </a>
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
                </article>
              ))}
            </div>
          )}
        </section>
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
