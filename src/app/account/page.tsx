import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
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
  if (!customer) {
    redirect("/login?redirect=/account");
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

        {/* Profile card */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="First name" value={customer.firstName} />
            <ProfileField label="Last name" value={customer.lastName} />
            <ProfileField label="Email" value={customer.email} />
            <ProfileField label="Phone" value={customer.phone} />
          </div>
        </section>

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
                className="mt-4 inline-flex rounded-full accent-gradient px-5 py-2.5 text-sm font-semibold text-white"
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

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{value || "—"}</div>
    </div>
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
