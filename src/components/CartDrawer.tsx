"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { CART_DRAWER_OPEN } from "@/lib/cart-drawer";
import { mixStatus, type MixLine } from "@/lib/apparel-mix";
import { tapFeedback } from "@/lib/interactions";

/**
 * Slide-out cart.
 *
 * Adding something shouldn't cost the customer their place on the page, so
 * the cart comes to them: the drawer opens from the right, they can change
 * quantities or remove lines in place, and closing it puts them back where
 * they were. The full /cart page is still there for checkout, and is where
 * the drawer sends them.
 */
export default function CartDrawer() {
  const { items, lineCount, itemCount, subtotal, removeItem, updateQty, isHydrated } =
    useCart();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Opened by the header cart icon and by every add-to-cart button.
  useEffect(() => {
    const onOpen = () => {
      lastFocused.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener(CART_DRAWER_OPEN, onOpen);
    return () => window.removeEventListener(CART_DRAWER_OPEN, onOpen);
  }, []);

  // Escape closes; focus moves into the panel and back out again after.
  useEffect(() => {
    if (!open) {
      lastFocused.current?.focus?.();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    // Stop the page behind from scrolling while the drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  // Apparel minimums are shared across the whole order, so the drawer shows
  // where the mix stands rather than letting them find out at checkout.
  const apparelLines: MixLine[] = items
    .filter((i) => i.kind === "tshirt")
    .map((i) => ({
      productTitle: i.productTitle,
      quantity: i.sizeVariants.reduce(
        (a, sv) => a + Math.max(0, Math.floor(Number(sv.quantity) || 0)),
        0,
      ),
    }));
  const mix = mixStatus(apparelLines);
  const apparelBlocked = mix.pieces > 0 && !mix.qualifies;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label="Your cart"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[61] flex h-dvh w-full max-w-[26rem] flex-col border-l border-border-soft bg-background shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg">
              🛒
            </span>
            <h2 className="font-headline text-sm font-bold uppercase tracking-[0.16em]">
              Your cart
            </h2>
            {isHydrated && lineCount > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-foreground-muted">
                {itemCount} {itemCount === 1 ? "piece" : "pieces"}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close cart"
            tabIndex={open ? 0 : -1}
            className="rounded-full border border-border-soft bg-white/5 p-2 text-foreground-muted transition hover:bg-white/10 hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!isHydrated || lineCount === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div aria-hidden className="text-4xl opacity-60">
                  🧺
                </div>
                <p className="mt-3 text-sm text-foreground-muted">
                  Your cart is empty.
                </p>
                <Link
                  href="/collections/custom-apparel"
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                  className="mt-4 inline-flex rounded-xl accent-gradient px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black"
                >
                  Start shopping
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const isImage =
                  item.thumbnail.startsWith("http") ||
                  item.thumbnail.startsWith("/");
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-2xl border border-border-soft bg-white/[0.03] p-3"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">
                      {isImage ? (
                        <Image
                          src={item.thumbnail}
                          alt=""
                          width={56}
                          height={56}
                          className="h-14 w-14 object-cover"
                        />
                      ) : (
                        <span aria-hidden className="text-xl">
                          {item.thumbnail}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold leading-snug">
                        {item.title}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">
                        {item.subtitle}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* T-shirt lines carry a whole size matrix, so their
                            quantity is edited on the product page, not here. */}
                        {item.kind === "tshirt" ? (
                          <span className="text-[11px] text-foreground-muted">
                            {item.quantity} pcs
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 rounded-lg border border-border-soft">
                            <button
                              type="button"
                              tabIndex={open ? 0 : -1}
                              aria-label="Decrease quantity"
                              onClick={() => {
                                tapFeedback();
                                updateQty(item.id, Math.max(1, item.quantity - 1));
                              }}
                              className="px-2 py-1 text-sm text-foreground-muted hover:text-foreground"
                            >
                              −
                            </button>
                            <span className="min-w-6 text-center text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              tabIndex={open ? 0 : -1}
                              aria-label="Increase quantity"
                              onClick={() => {
                                tapFeedback();
                                updateQty(item.id, item.quantity + 1);
                              }}
                              className="px-2 py-1 text-sm text-foreground-muted hover:text-foreground"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <span className="text-sm font-bold tabular-nums">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-3">
                        {item.editHref && (
                          <Link
                            href={item.editHref}
                            onClick={close}
                            tabIndex={open ? 0 : -1}
                            className="text-[11px] font-medium text-[#18d3e8] hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                        <button
                          type="button"
                          tabIndex={open ? 0 : -1}
                          onClick={() => removeItem(item.id)}
                          className="text-[11px] font-medium text-foreground-muted hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isHydrated && lineCount > 0 && (
          <footer className="border-t border-border-soft px-4 py-4">
            {apparelBlocked && mix.message && (
              <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-snug text-amber-200">
                {mix.message}
              </p>
            )}
            {!apparelBlocked && mix.discountPercent > 0 && (
              <p className="mb-3 rounded-xl border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-2 text-[11px] font-semibold leading-snug text-[#d9f000]">
                Bulk pricing applied — {mix.discountPercent}% off your apparel at
                checkout.
              </p>
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground-muted">Subtotal</span>
              <span className="font-display text-2xl font-black tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-foreground-muted">
              Shipping and any bulk discount are calculated at checkout.
            </p>

            <Link
              href="/cart"
              onClick={close}
              tabIndex={open ? 0 : -1}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl accent-gradient px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110 active:scale-[0.99]"
            >
              Go to checkout
              <span aria-hidden>→</span>
            </Link>
            <button
              type="button"
              onClick={close}
              tabIndex={open ? 0 : -1}
              className="mt-2 w-full rounded-xl border border-border-soft px-6 py-2.5 text-xs font-semibold text-foreground-muted transition hover:bg-white/5 hover:text-foreground"
            >
              Keep shopping
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
