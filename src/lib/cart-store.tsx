"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "./cart-types";
import {
  computeDiscountAmount,
  type CartDiscount,
} from "./discount-types";

const STORAGE_KEY = "pls_cart";
const DISCOUNT_KEY = "pls_discount";
const PENDING_KEY = "pls_pending_checkout";

/**
 * Stored when the customer clicks Checkout — we hand them off to the
 * Shopify-served invoice URL but keep their cart intact in case they hit
 * back to tweak quantities. When they actually pay, the cart auto-clears
 * on the next page load (cart-store polls /api/order-status).
 */
export type PendingCheckout = {
  draftOrderId: number;
  invoiceUrl: string;
  /** ms since epoch — used to auto-expire stale entries (>24h). */
  createdAt: number;
};

type CartContextValue = {
  /** True once we've read from localStorage on the client; until then count is 0. */
  isHydrated: boolean;
  items: CartItem[];
  /** Total pieces across all lines (sum of every quantity). */
  itemCount: number;
  /** Number of distinct products/lines in the cart. */
  lineCount: number;
  /** Sum of every line's totalPrice — before discount. */
  subtotal: number;
  /** Currently-applied discount rule (from Shopify Admin API), or null. */
  discount: CartDiscount | null;
  /** Dollar amount the customer saves with `discount` at the current subtotal. */
  discountAmount: number;
  /** subtotal − discountAmount, never negative. */
  total: number;
  /** Currently-in-flight checkout, if any (cart left intact until paid). */
  pendingCheckout: PendingCheckout | null;
  addItem: (item: Omit<CartItem, "id" | "addedAt"> & Partial<Pick<CartItem, "id" | "addedAt">>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, newQty: number) => void;
  clearCart: () => void;
  /** Replace the current discount (cleared when the cart empties or fails the minimum). */
  applyDiscount: (discount: CartDiscount) => void;
  clearDiscount: () => void;
  /** Mark that a checkout is in progress — call after /api/checkout-cart succeeds. */
  setPendingCheckout: (p: PendingCheckout) => void;
  /** Drop the pending-checkout marker without touching the cart items. */
  clearPendingCheckout: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function safeRead(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function safeWrite(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or privacy mode — silently swallow.
  }
}

function safeReadDiscount(): CartDiscount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartDiscount;
    if (!parsed?.code || !parsed?.valueType) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteDiscount(d: CartDiscount | null) {
  if (typeof window === "undefined") return;
  try {
    if (d) {
      window.localStorage.setItem(DISCOUNT_KEY, JSON.stringify(d));
    } else {
      window.localStorage.removeItem(DISCOUNT_KEY);
    }
  } catch {
    // ignore
  }
}

function safeReadPending(): PendingCheckout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed?.draftOrderId || !parsed?.invoiceUrl) return null;
    // Auto-expire after 24 hours so a long-abandoned cart eventually
    // unblocks the customer.
    if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWritePending(p: PendingCheckout | null): void {
  if (typeof window === "undefined") return;
  try {
    if (p) {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    } else {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Lazy-init from localStorage — runs synchronously on first mount, so
  // there is NO "items briefly empty then populated" gap on client renders.
  // On the server `typeof window === "undefined"`, so each `safe*` helper
  // returns the empty value — the SSR HTML matches the !isHydrated branch
  // (loading skeleton), avoiding any hydration mismatch.
  const [items, setItems] = useState<CartItem[]>(() => safeRead());
  const [discount, setDiscount] = useState<CartDiscount | null>(() =>
    safeReadDiscount(),
  );
  const [pendingCheckout, setPendingCheckoutState] =
    useState<PendingCheckout | null>(() => safeReadPending());
  const [isHydrated, setIsHydrated] = useState(false);

  // Flip hydrated → true after first client commit. Items are already
  // populated from the lazy initializer above, so the very next render
  // shows the cart immediately without an "empty" flash.
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Persist whenever items change (after hydration, so we don't overwrite with []).
  useEffect(() => {
    if (!isHydrated) return;
    safeWrite(items);
  }, [items, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeWriteDiscount(discount);
  }, [discount, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeWritePending(pendingCheckout);
  }, [pendingCheckout, isHydrated]);

  // Sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setItems(safeRead());
      if (e.key === DISCOUNT_KEY) setDiscount(safeReadDiscount());
      if (e.key === PENDING_KEY) setPendingCheckoutState(safeReadPending());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Back-navigation re-sync — re-read localStorage whenever the browser
  // brings our page back to life: pageshow (initial load + bfcache),
  // visibilitychange (tab becomes visible again), and focus (window
  // regains keyboard focus). Together these cover every realistic way the
  // customer returns from the Shopify-served checkout page across all
  // browsers, so the cart never lags behind localStorage.
  useEffect(() => {
    function resync() {
      setItems(safeRead());
      setDiscount(safeReadDiscount());
      setPendingCheckoutState(safeReadPending());
    }
    function onPageShow() {
      resync();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") resync();
    }
    function onFocus() {
      resync();
    }
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Safety net — if React state ever ends up empty but localStorage still
  // has items (out-of-sync edge cases: bfcache restore landing on stale
  // state, devtools cleared React state, an aborted clearCart, etc.),
  // restore the cart from localStorage. Without this, the customer would
  // have to manually refresh to recover.
  useEffect(() => {
    if (!isHydrated) return;
    if (items.length === 0) {
      const localItems = safeRead();
      if (localItems.length > 0) {
        setItems(localItems);
      }
    }
  }, [items, isHydrated]);

  // We deliberately don't poll Shopify on cart-page mount any more — the
  // earlier "auto-clear if paid" check caused the cart to flash empty
  // whenever the customer hit Back from the checkout without paying. The
  // only place we now auto-clear the cart on payment success is the
  // /order/[id] page (OrderClearCartOnPaid), where the customer has
  // explicitly landed to verify their order.

  const addItem = useCallback<CartContextValue["addItem"]>((item) => {
    setItems((prev) => {
      const newItem: CartItem = {
        ...(item as CartItem),
        id: item.id ?? `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        addedAt: item.addedAt ?? Date.now(),
      };
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, newQty: number) => {
    if (newQty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        // Re-scale total price based on new qty for "product" + "signage" + "vinyl-sticker" kinds.
        if (i.kind === "product") {
          const next: CartItem = {
            ...i,
            qty: newQty,
            quantity: newQty,
            totalPrice: i.unitPrice * newQty,
          };
          return next;
        }
        if (i.kind === "signage") {
          // Decal Signage Calculator — total scales linearly with qty.
          // We have pricePerSqFt × unitAreaSqFt × qty (with discount already
          // applied to subtotal). Easiest: recompute from unitAreaSqFt.
          const newTotalArea = i.unitAreaSqFt * newQty;
          const subtotal = i.pricePerSqFt * newTotalArea;
          const afterDiscount =
            subtotal * (1 - (i.discountPercent || 0) / 100);
          const total = Math.round(afterDiscount * 100) / 100;
          const next: CartItem = {
            ...i,
            qty: newQty,
            quantity: newQty,
            totalAreaSqFt: Math.round(newTotalArea * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            totalPrice: total,
          };
          return next;
        }
        // T-shirts, vinyl-stickers, and decal (multi-panel Quick Quote) are
        // not directly qty-editable from cart. Fall through unchanged.
        return i;
      }),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(null);
    setPendingCheckoutState(null);
  }, []);

  const applyDiscount = useCallback((d: CartDiscount) => {
    setDiscount(d);
  }, []);

  const clearDiscount = useCallback(() => {
    setDiscount(null);
  }, []);

  const setPendingCheckout = useCallback((p: PendingCheckout) => {
    setPendingCheckoutState(p);
  }, []);

  const clearPendingCheckout = useCallback(() => {
    setPendingCheckoutState(null);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    [items],
  );

  const lineCount = items.length;

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.totalPrice || 0), 0),
    [items],
  );

  // If the cart no longer meets the applied discount's minimum, drop it so the
  // customer isn't confused at checkout.
  useEffect(() => {
    if (!isHydrated || !discount) return;
    if (
      typeof discount.minimumSubtotal === "number" &&
      subtotal > 0 &&
      subtotal < discount.minimumSubtotal
    ) {
      setDiscount(null);
    }
  }, [subtotal, discount, isHydrated]);

  const discountAmount = useMemo(
    () => computeDiscountAmount(discount, subtotal),
    [discount, subtotal],
  );

  const total = useMemo(
    () => Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100),
    [subtotal, discountAmount],
  );

  const value: CartContextValue = useMemo(
    () => ({
      isHydrated,
      items,
      itemCount,
      lineCount,
      subtotal,
      discount,
      discountAmount,
      total,
      pendingCheckout,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      applyDiscount,
      clearDiscount,
      setPendingCheckout,
      clearPendingCheckout,
    }),
    [
      isHydrated,
      items,
      itemCount,
      lineCount,
      subtotal,
      discount,
      discountAmount,
      total,
      pendingCheckout,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      applyDiscount,
      clearDiscount,
      setPendingCheckout,
      clearPendingCheckout,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
