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
  addItem: (item: Omit<CartItem, "id" | "addedAt"> & Partial<Pick<CartItem, "id" | "addedAt">>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, newQty: number) => void;
  clearCart: () => void;
  /** Replace the current discount (cleared when the cart empties or fails the minimum). */
  applyDiscount: (discount: CartDiscount) => void;
  clearDiscount: () => void;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<CartDiscount | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage once mounted. Avoids SSR/CSR hydration mismatch.
  useEffect(() => {
    setItems(safeRead());
    setDiscount(safeReadDiscount());
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

  // Sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setItems(safeRead());
      if (e.key === DISCOUNT_KEY) setDiscount(safeReadDiscount());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
  }, []);

  const applyDiscount = useCallback((d: CartDiscount) => {
    setDiscount(d);
  }, []);

  const clearDiscount = useCallback(() => {
    setDiscount(null);
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
      addItem,
      removeItem,
      updateQty,
      clearCart,
      applyDiscount,
      clearDiscount,
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
      addItem,
      removeItem,
      updateQty,
      clearCart,
      applyDiscount,
      clearDiscount,
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
