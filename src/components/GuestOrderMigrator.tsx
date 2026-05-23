"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markGuestOrdersMigrated,
  readGuestOrders,
} from "@/lib/guest-orders";

/**
 * Runs once on mount when the customer is logged in: scans localStorage for
 * any un-migrated guest orders that match this customer's email and asks the
 * server to attach them to the customer's Shopify record. Successfully
 * migrated orders are marked locally so we don't try again next visit.
 *
 * Renders nothing — this is just a side-effect component intended to live on
 * `/account` (where the customer always lands post-login).
 */
export default function GuestOrderMigrator({
  customerEmail,
}: {
  customerEmail: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const all = readGuestOrders();
    const candidates = all.filter(
      (o) =>
        !o.migrated &&
        o.email.toLowerCase() === customerEmail.toLowerCase(),
    );
    if (candidates.length === 0) {
      setDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/auth/migrate-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftOrderIds: candidates.map((o) => o.draftOrderId),
          }),
        });
        const data = (await resp.json()) as {
          ok?: boolean;
          migratedIds?: number[];
        };
        if (cancelled) return;
        if (resp.ok && data.ok && data.migratedIds?.length) {
          markGuestOrdersMigrated(data.migratedIds);
          // Re-render the server component so any newly-attached completed
          // orders appear in the Shopify order history list.
          router.refresh();
        }
      } catch {
        // Soft-fail: we'll try again on the next visit. The customer can
        // still see their orders via the localStorage list.
      } finally {
        if (!cancelled) setDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerEmail, done, router]);

  return null;
}
