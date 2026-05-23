"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readGuestOrders,
  removeGuestOrder,
  type GuestOrder,
} from "@/lib/guest-orders";

/**
 * Shows draft orders this device created (via /api/checkout-cart) for the
 * given email. Useful in two places:
 *  - Logged-in customers: short "Recent activity" list of orders that may
 *    not yet appear in Shopify's customer.orders query (drafts pending
 *    payment).
 *  - Guests: the only way they can find their orders on this device after
 *    leaving the checkout page.
 *
 * If `filterByEmail` is set we only show matching ones (used for logged-in
 * customers so they don't see other family-member orders saved on the same
 * browser). For guests we pass null and show everything.
 */
export default function GuestOrdersList({
  filterByEmail,
}: {
  filterByEmail: string | null;
}) {
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = readGuestOrders();
    setOrders(
      filterByEmail
        ? all.filter(
            (o) => o.email.toLowerCase() === filterByEmail.toLowerCase(),
          )
        : all,
    );
    setHydrated(true);
  }, [filterByEmail]);

  if (!hydrated || orders.length === 0) return null;

  function handleForget(draftOrderId: number) {
    if (
      !confirm(
        "Remove this order from this device's history? It will still exist in Shopify, but you won't see it here.",
      )
    )
      return;
    removeGuestOrder(draftOrderId);
    setOrders((prev) => prev.filter((o) => o.draftOrderId !== draftOrderId));
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {filterByEmail ? "Recent activity (this device)" : "Your recent orders"}
        </h2>
        <span className="text-sm text-foreground-muted">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {!filterByEmail && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">⚠ Saved only on this device</p>
          <p className="mt-1 text-xs text-amber-200/80">
            These orders are saved in this browser. If you clear browser data
            or use another device, you&apos;ll lose access to them here.{" "}
            <Link
              href="/signup"
              className="font-semibold underline hover:no-underline"
            >
              Create an account
            </Link>{" "}
            with the same email to keep them permanently.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <article
            key={o.draftOrderId}
            className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  Draft order #{o.draftOrderId}
                  {o.migrated && (
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Linked to account
                    </span>
                  )}
                </div>
                <div className="text-xs text-foreground-muted">
                  {new Date(o.createdAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {o.email}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">${o.total.toFixed(2)}</div>
                <a
                  href={o.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  View / pay invoice →
                </a>
              </div>
            </header>

            {o.items.length > 0 && (
              <ul className="mt-3 divide-y divide-border-soft text-sm">
                {o.items.slice(0, 6).map((li, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 text-foreground-muted"
                  >
                    <span className="truncate">{li.title}</span>
                    <span>× {li.quantity}</span>
                  </li>
                ))}
                {o.items.length > 6 && (
                  <li className="py-2 text-xs text-foreground-muted">
                    + {o.items.length - 6} more
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => handleForget(o.draftOrderId)}
                className="text-[11px] font-medium text-foreground-muted hover:text-red-300"
              >
                Hide from this device
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
