import { type NextRequest, NextResponse } from "next/server";
import { gidToNumericId, shopifyAdminFetch } from "@/lib/shopify";
import { requireCustomerOr401 } from "@/lib/customer-session";

type CheckoutRequest = {
  variantId: string;
  quantity: number;
  selectedOptions: Record<string, string>;
  /** Map of property name → value (Phone, Instructions, design URLs, etc.) */
  extraProperties?: Record<string, string>;
};

const VARIANT_PRICE_QUERY = `
  query GetVariantPrice($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        price
        availableForSale
        title
        product { title }
      }
    }
  }
`;

type VariantPriceResp = {
  node: {
    id: string;
    price: string;
    availableForSale: boolean;
    title: string;
    product: { title: string };
  } | null;
};

/**
 * Generic single-line draft order endpoint. Used by Posters, Banners, Flyers,
 * Business Cards, and the three engraving products. Each accepts:
 *   - variantId (Shopify GID)
 *   - quantity (≥ 1)
 *   - selectedOptions (echoed into properties for visibility)
 *   - extraProperties (design URLs, phone, instructions, anything page-specific)
 */
export async function POST(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!STORE || !TOKEN) {
    return NextResponse.json(
      {
        error:
          "Server not configured. Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN env vars.",
      },
      { status: 500 },
    );
  }

  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;
  const customer = customerOr401;

  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.variantId || !body.variantId.startsWith("gid://shopify/")) {
    return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
  }
  const qty = Number(body.quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  // Reject any design URL not from Shopify Files.
  if (body.extraProperties) {
    for (const [name, value] of Object.entries(body.extraProperties)) {
      if (
        /design|file|art/i.test(name) &&
        value.startsWith("http") &&
        !value.startsWith("https://cdn.shopify.com/")
      ) {
        return NextResponse.json(
          { error: "Design URLs must come from Shopify Files" },
          { status: 400 },
        );
      }
    }
  }

  // Server-side variant + price lookup.
  let variantPrice: number;
  let productTitle: string;
  try {
    const resp = await shopifyAdminFetch<VariantPriceResp>(
      VARIANT_PRICE_QUERY,
      { id: body.variantId },
      { revalidate: 0 },
    );
    if (!resp.node) {
      return NextResponse.json(
        { error: "Variant not found in Shopify" },
        { status: 404 },
      );
    }
    // We intentionally don't check availableForSale here — Anthony's
    // print-on-demand shop doesn't keep that flag in sync, and the Draft
    // Order API doesn't enforce stock anyway.
    variantPrice = Number(resp.node.price);
    productTitle = resp.node.product.title;
  } catch (err) {
    console.error("[checkout-product] variant fetch failed:", err);
    return NextResponse.json(
      { error: "Could not look up variant on Shopify" },
      { status: 502 },
    );
  }

  const properties: { name: string; value: string }[] = [];
  if (body.selectedOptions) {
    for (const [name, value] of Object.entries(body.selectedOptions)) {
      properties.push({ name, value });
    }
  }
  if (body.extraProperties) {
    for (const [name, value] of Object.entries(body.extraProperties)) {
      const v = String(value).trim();
      if (v) properties.push({ name, value: v.slice(0, 2000) });
    }
  }

  const optsSummary = body.selectedOptions
    ? Object.entries(body.selectedOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "";

  const draftOrder = {
    draft_order: {
      email: customer.email,
      line_items: [
        {
          variant_id: Number(gidToNumericId(body.variantId)),
          quantity: qty,
          properties,
        },
      ],
      tags: "custom-configurator",
      note: `${productTitle}${optsSummary ? ` · ${optsSummary}` : ""} · Qty: ${qty} · Per-unit: $${variantPrice.toFixed(2)}`,
    },
  };

  const shopifyResp = await fetch(
    `https://${STORE}/admin/api/2026-04/draft_orders.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftOrder),
    },
  );

  if (!shopifyResp.ok) {
    const errorBody = await shopifyResp.text();
    console.error(
      `[checkout-product] Shopify ${shopifyResp.status}:`,
      errorBody.slice(0, 500),
    );
    return NextResponse.json(
      {
        error: "Failed to create Shopify draft order",
        status: shopifyResp.status,
        details: errorBody.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const data = (await shopifyResp.json()) as {
    draft_order: { id: number; invoice_url: string };
  };

  return NextResponse.json({
    invoiceUrl: data.draft_order.invoice_url,
    draftOrderId: data.draft_order.id,
    quantity: qty,
    perUnit: variantPrice,
    total: variantPrice * qty,
  });
}
