/**
 * Guest order tracking — when a checkout completes without a logged-in
 * customer, we stash a lightweight record in localStorage so the buyer can
 * still see their recent orders on this device. When they later log in or
 * sign up, the `GuestOrderMigrator` reassigns any guest orders whose email
 * matches their account to the new customer record in Shopify.
 *
 * Trade-offs (acknowledged in the UX):
 *   - History is per-device. Clearing browser data or switching devices loses it.
 *   - The "guest order" entry is created the moment the draft order is created
 *     (before payment). If the buyer abandons the invoice page, we still have
 *     a row in localStorage; that's fine since it links to the invoice they
 *     can still pay.
 */

export type GuestOrder = {
  /** Numeric Shopify draft-order id (REST). */
  draftOrderId: number;
  /** Email associated with the order — used to match on login for migration. */
  email: string;
  /** Total dollar amount as displayed at checkout time. */
  total: number;
  /** Brief items list for the cart-row summary. */
  items: Array<{ title: string; quantity: number }>;
  /** ms since epoch when the order was placed (locally). */
  createdAt: number;
  /** Shopify-served invoice/checkout URL (already normalized). */
  invoiceUrl: string;
  /**
   * True once we've successfully attached the draft order to a customer in
   * Shopify. We keep the localStorage row around for display continuity but
   * skip re-migrating on subsequent logins.
   */
  migrated?: boolean;
};

const STORAGE_KEY = "pls_guest_orders";

export function readGuestOrders(): GuestOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is GuestOrder =>
        o &&
        typeof o.draftOrderId === "number" &&
        typeof o.email === "string" &&
        typeof o.total === "number" &&
        typeof o.createdAt === "number" &&
        typeof o.invoiceUrl === "string",
    );
  } catch {
    return [];
  }
}

export function writeGuestOrders(orders: GuestOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Quota or privacy mode — silently ignore.
  }
}

export function addGuestOrder(order: GuestOrder): void {
  const existing = readGuestOrders();
  // Dedupe by draftOrderId in case of accidental double-call.
  const filtered = existing.filter((o) => o.draftOrderId !== order.draftOrderId);
  writeGuestOrders([order, ...filtered]);
}

export function markGuestOrdersMigrated(draftOrderIds: number[]): void {
  const existing = readGuestOrders();
  const next = existing.map((o) =>
    draftOrderIds.includes(o.draftOrderId) ? { ...o, migrated: true } : o,
  );
  writeGuestOrders(next);
}

export function removeGuestOrder(draftOrderId: number): void {
  const filtered = readGuestOrders().filter(
    (o) => o.draftOrderId !== draftOrderId,
  );
  writeGuestOrders(filtered);
}
