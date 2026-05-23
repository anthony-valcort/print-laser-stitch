import { type NextRequest, NextResponse } from "next/server";
import { gidToNumericId } from "@/lib/shopify";
import { getCurrentCustomer } from "@/lib/customer-session";

type MigrateBody = {
  /** Draft order ids the client has stored locally as guest orders. */
  draftOrderIds?: number[];
};

/**
 * Attach guest draft orders to the currently-logged-in customer in Shopify.
 *
 * Security: we ONLY migrate orders whose stored email on Shopify matches the
 * authenticated customer's email — so a malicious client can't claim a
 * stranger's order by guessing draft-order ids. We also skip orders that
 * already have a customer assigned.
 *
 * The client is expected to fire this on login/signup (via
 * `GuestOrderMigrator`) and re-mark its localStorage entries on a successful
 * response so we don't re-process the same orders next time.
 */
export async function POST(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!STORE || !TOKEN) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { error: "Login required", loginRequired: true },
      { status: 401 },
    );
  }

  let body: MigrateBody;
  try {
    body = (await req.json()) as MigrateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (body.draftOrderIds ?? []).filter(
    (id): id is number => Number.isInteger(id) && id > 0,
  );
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, migratedIds: [], skippedIds: [] });
  }

  const customerNumericId = gidToNumericId(customer.id);
  const customerEmailLower = customer.email.toLowerCase();
  const migratedIds: number[] = [];
  const skippedIds: number[] = [];

  // Cap at a reasonable upper bound to keep this request fast; in practice a
  // guest will only have a handful of orders before they log in.
  for (const id of ids.slice(0, 25)) {
    try {
      // 1. Look up the draft order so we can verify email + skip already-assigned.
      const getResp = await fetch(
        `https://${STORE}/admin/api/2026-04/draft_orders/${id}.json`,
        {
          headers: {
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );
      if (!getResp.ok) {
        skippedIds.push(id);
        continue;
      }
      const detail = (await getResp.json()) as {
        draft_order: {
          id: number;
          email: string | null;
          status: string;
          customer: { id: number } | null;
        };
      };
      const draft = detail.draft_order;

      // Skip if the order's email doesn't match — protects against claim attacks.
      if (!draft.email || draft.email.toLowerCase() !== customerEmailLower) {
        skippedIds.push(id);
        continue;
      }
      // Already assigned to this customer — treat as migrated, no-op.
      if (
        draft.customer &&
        String(draft.customer.id) === String(customerNumericId)
      ) {
        migratedIds.push(id);
        continue;
      }

      // 2. Attach the customer to the draft order.
      const putResp = await fetch(
        `https://${STORE}/admin/api/2026-04/draft_orders/${id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            draft_order: {
              id,
              customer: { id: Number(customerNumericId) },
            },
          }),
        },
      );
      if (!putResp.ok) {
        skippedIds.push(id);
        continue;
      }
      migratedIds.push(id);
    } catch {
      skippedIds.push(id);
    }
  }

  return NextResponse.json({
    ok: true,
    migratedIds,
    skippedIds,
  });
}
