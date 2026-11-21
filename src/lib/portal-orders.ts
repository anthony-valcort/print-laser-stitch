/**
 * Past orders for a portal company. The orders themselves stay in Shopify
 * (one source of truth). A company's orders are:
 *   1. any order placed through the portal (tagged "pls-co-<companyId>"), and
 *   2. any order an admin linked by hand (ids saved on the company).
 */
import { shopifyAdminFetch } from "./shopify";
import type { PortalCompany } from "./portal-store";

export type OrderItem = {
  title: string;
  qty: number;
  image: string;
  productId: string;
  productName: string;
  qtyBySize: Record<string, number>;
};

export type PortalOrder = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  paid: boolean;
  cancelled: boolean;
  fulfillment: "none" | "partial" | "done";
  statusUrl: string;
  items: OrderItem[];
  /** From the Team Hub job: 1 Received, 2 Design, 3 Being made, 4 Ready, 5 Done. */
  progress?: { step: number; label: string };
};

const HUB_PROGRESS =
  "https://base44.app/api/apps/698a01d9c50002e4d14f9d23/functions/portalOrderProgress";

/** Asks the Team Hub how far along each order's job is. Never throws. */
async function addProgress(orders: PortalOrder[]): Promise<void> {
  const nums = orders.map((o) => o.name.replace(/[^0-9]/g, "")).filter(Boolean);
  if (nums.length === 0) return;
  try {
    const r = await fetch(HUB_PROGRESS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({ orders: nums.slice(0, 50) }),
      cache: "no-store",
    });
    if (!r.ok) return;
    const d = (await r.json()) as {
      progress?: Record<string, { step: number; label: string }>;
    };
    for (const o of orders) {
      const p = d.progress?.[o.name.replace(/[^0-9]/g, "")];
      if (p) o.progress = p;
    }
  } catch (err) {
    console.error("[portal-orders] progress failed:", err);
  }
}

const FIELDS = `
  id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus
  statusPageUrl
  currentTotalPriceSet { shopMoney { amount } }
  lineItems(first: 25) {
    nodes { title quantity image { url } customAttributes { key value } }
  }
`;

type RawOrder = {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  statusPageUrl: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string } };
  lineItems: {
    nodes: {
      title: string;
      quantity: number;
      image: { url: string } | null;
      customAttributes: { key: string; value: string }[];
    }[];
  };
};

function parseQty(attrs: Record<string, string>): Record<string, number> {
  if (attrs["Qty JSON"]) {
    try {
      const o = JSON.parse(attrs["Qty JSON"]) as Record<string, unknown>;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o)) {
        const n = Math.floor(Number(v));
        if (n > 0) out[k] = n;
      }
      return out;
    } catch {
      /* fall through to the text version */
    }
  }
  const out: Record<string, number> = {};
  for (const line of (attrs["Quantities"] ?? "").split("\n")) {
    const m = line.match(/^(?:(.*?):\s*)?(\d+)\s*@/);
    if (m) out[(m[1] ?? "").trim()] = Number(m[2]);
  }
  return out;
}

function shape(o: RawOrder): PortalOrder {
  const f = (o.displayFulfillmentStatus ?? "").toUpperCase();
  return {
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    total: Number(o.currentTotalPriceSet.shopMoney.amount) || 0,
    paid: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(
      (o.displayFinancialStatus ?? "").toUpperCase(),
    ),
    cancelled: !!o.cancelledAt,
    fulfillment:
      f === "FULFILLED" ? "done" : f === "PARTIALLY_FULFILLED" ? "partial" : "none",
    statusUrl: o.statusPageUrl ?? "",
    items: o.lineItems.nodes.map((li) => {
      const attrs: Record<string, string> = {};
      for (const a of li.customAttributes) attrs[a.key] = a.value;
      return {
        title: li.title,
        qty: li.quantity,
        image: attrs["Mockup"] || li.image?.url || "",
        productId: attrs["Product ID"] ?? "",
        productName: attrs["Product"] ?? "",
        qtyBySize: parseQty(attrs),
      };
    }),
  };
}

export async function getCompanyOrders(
  company: PortalCompany,
): Promise<{ orders: PortalOrder[]; error?: string }> {
  try {
    const byTag = await shopifyAdminFetch<{ orders: { nodes: RawOrder[] } }>(
      `query T($q: String!) {
        orders(first: 50, sortKey: CREATED_AT, reverse: true, query: $q) {
          nodes { ${FIELDS} }
        }
      }`,
      { q: `tag:pls-co-${company.id}` },
      { revalidate: 0 },
    );
    const all = new Map<string, RawOrder>();
    for (const o of byTag.orders.nodes) all.set(o.id, o);

    const ids = (company.orderIds ?? []).filter((i) => !all.has(i)).slice(0, 100);
    if (ids.length) {
      const linked = await shopifyAdminFetch<{ nodes: (RawOrder | null)[] }>(
        `query L($ids: [ID!]!) {
          nodes(ids: $ids) { ... on Order { ${FIELDS} } }
        }`,
        { ids },
        { revalidate: 0 },
      );
      for (const o of linked.nodes) if (o?.id) all.set(o.id, o);
    }
    const orders = Array.from(all.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(shape);
    await addProgress(orders);
    return { orders };
  } catch (err) {
    console.error("[portal-orders] failed:", err);
    return { orders: [], error: "Couldn't load orders right now." };
  }
}

/** Admin search over Shopify orders (name, email, customer). */
export async function searchOrders(q: string): Promise<
  {
    id: string;
    name: string;
    createdAt: string;
    total: number;
    who: string;
    email: string;
    summary: string;
  }[]
> {
  const term = q.trim();
  const query = /^#?\d+$/.test(term) ? `name:#${term.replace("#", "")}` : term;
  const d = await shopifyAdminFetch<{
    orders: {
      nodes: {
        id: string;
        name: string;
        createdAt: string;
        email: string | null;
        currentTotalPriceSet: { shopMoney: { amount: string } };
        customer: { displayName: string } | null;
        lineItems: { nodes: { title: string }[] };
      }[];
    };
  }>(
    `query S($q: String) {
      orders(first: 25, sortKey: CREATED_AT, reverse: true, query: $q) {
        nodes {
          id name createdAt email
          currentTotalPriceSet { shopMoney { amount } }
          customer { displayName }
          lineItems(first: 3) { nodes { title } }
        }
      }
    }`,
    { q: query || null },
    { revalidate: 0 },
  );
  return d.orders.nodes.map((o) => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    total: Number(o.currentTotalPriceSet.shopMoney.amount) || 0,
    who: o.customer?.displayName ?? "",
    email: o.email ?? "",
    summary: o.lineItems.nodes.map((l) => l.title).join(", "),
  }));
}
