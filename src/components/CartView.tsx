"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import type { CartItem } from "@/lib/cart-types";

export default function CartView() {
  const { isHydrated, items, itemCount, lineCount, subtotal, removeItem, updateQty, clearCart } =
    useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avoid SSR/CSR mismatch — show empty until hydrated.
  if (!isHydrated) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-32" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm text-foreground-muted">
          Looks like you haven&apos;t added anything yet. Start by browsing our
          products.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
        >
          Browse products
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </section>
    );
  }

  async function handleCheckout() {
    setIsCheckingOut(true);
    setError(null);
    try {
      const resp = await fetch("/api/checkout-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (resp.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/cart")}`;
        return;
      }

      const data = (await resp.json()) as {
        invoiceUrl?: string;
        error?: string;
      };

      if (!resp.ok || !data.invoiceUrl) {
        throw new Error(data.error ?? "Checkout failed");
      }

      // Cart contents are now committed to a Shopify draft order. Clear the
      // local cart so the user doesn't double-submit if they navigate back.
      clearCart();
      window.location.href = data.invoiceUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsCheckingOut(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Cart
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Your items
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {lineCount} {lineCount === 1 ? "product" : "products"} ·{" "}
            {itemCount} {itemCount === 1 ? "piece" : "pieces"} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Remove all items from your cart?")) clearCart();
          }}
          className="text-xs font-medium text-foreground-muted hover:text-red-300"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Item list */}
        <div className="space-y-4">
          {items.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onQtyChange={(newQty) => updateQty(item.id, newQty)}
            />
          ))}
        </div>

        {/* Sticky checkout sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border-soft bg-surface p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Subtotal</dt>
                <dd className="font-medium">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Shipping</dt>
                <dd className="text-xs text-foreground-muted">
                  Calculated at checkout
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-foreground-muted">Tax</dt>
                <dd className="text-xs text-foreground-muted">
                  Calculated at checkout
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border-soft pt-4">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Estimated total</span>
                <span className="text-xl font-bold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="mt-6 w-full rounded-md accent-gradient px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110 disabled:opacity-60"
            >
              {isCheckingOut
                ? "Preparing checkout…"
                : `Checkout · $${subtotal.toFixed(2)}`}
            </button>
            <Link
              href="/"
              className="mt-3 block text-center text-xs font-medium text-foreground-muted hover:text-foreground"
            >
              ← Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CartRow({
  item,
  onRemove,
  onQtyChange,
}: {
  item: CartItem;
  onRemove: () => void;
  onQtyChange: (newQty: number) => void;
}) {
  const isQtyEditable = item.kind === "product" || item.kind === "signage";

  return (
    <article className="flex gap-4 rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5 text-3xl sm:h-24 sm:w-24 sm:text-4xl">
        {item.thumbnail.startsWith("http") ||
        item.thumbnail.startsWith("/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span>{item.thumbnail}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold sm:text-base">{item.title}</div>
            <div className="mt-0.5 text-xs text-foreground-muted">
              {item.subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove from cart"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-foreground-muted hover:bg-red-500/10 hover:text-red-300"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          <div className="text-xs text-foreground-muted">{item.unitLabel}</div>
          <div className="flex items-center gap-3">
            {isQtyEditable ? (
              <div className="flex items-center gap-1 rounded-full border border-border-soft bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => onQtyChange(item.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-sm font-semibold">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQtyChange(item.quantity + 1)}
                  aria-label="Increase quantity"
                  className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"
                >
                  +
                </button>
              </div>
            ) : (
              <span className="rounded-full border border-border-soft bg-white/5 px-3 py-1 text-xs font-medium">
                Qty {item.quantity}
              </span>
            )}
            <div className="text-base font-bold sm:text-lg">
              ${item.totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
