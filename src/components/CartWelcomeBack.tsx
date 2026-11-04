"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { openCartDrawer } from "@/lib/cart-drawer";

/** Pages where a "your cart is saved" nudge would be noise. */
const QUIET_PREFIXES = [
  "/cart",
  "/order",
  "/admin",
  "/account",
  "/login",
  "/signup",
  "/forgot-password",
  "/mobile-proof",
];

/** Only people who have been away — not someone refreshing mid-session. */
const AWAY_MS = 20 * 60 * 1000;
const SESSION_KEY = "pls_welcome_back_shown";
const VISIBLE_MS = 9000;

/**
 * Once per visit, tells a returning customer their cart was kept and puts it
 * one tap away. The cart itself is saved in their browser — this just makes
 * that visible, which is most of what makes a store feel like it remembers you.
 */
export default function CartWelcomeBack() {
  const pathname = usePathname() ?? "/";
  const { items, itemCount, isHydrated } = useCart();
  const [visible, setVisible] = useState(false);
  // Refs, not state: deciding must not re-run this effect, or its cleanup
  // would cancel the timer before the note ever appears.
  const decided = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const quiet = QUIET_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isHydrated || decided.current) return;
    // Only the page they landed on counts — someone who opens the cart
    // first already knows it's there.
    decided.current = true;
    if (quiet || items.length === 0) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return; // No session storage: stay quiet rather than nag on every page.
    }
    const newest = Math.max(...items.map((i) => i.addedAt || 0));
    if (!newest || Date.now() - newest < AWAY_MS) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    timer.current = window.setTimeout(() => setVisible(true), 900);
  }, [isHydrated, quiet, items]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible || quiet) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-20 z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#d9f000]/30 bg-background/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-xl">
          🛒
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            Welcome back — your cart is saved
          </div>
          <div className="text-xs text-foreground-muted">
            {itemCount} {itemCount === 1 ? "piece" : "pieces"} waiting for you.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            openCartDrawer();
          }}
          className="shrink-0 rounded-full bg-[#d9f000] px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
        >
          View cart
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-full p-1 text-foreground-muted transition hover:bg-white/10 hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
