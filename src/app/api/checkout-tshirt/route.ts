import { type NextRequest, NextResponse } from "next/server";
import { gidToNumericId, shopifyAdminFetch } from "@/lib/shopify";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
  calcTShirtPrice,
} from "@/lib/tshirt-pricing";

type CheckoutRequest = {
  variantId: string;
  selectedOptions: Record<string, string>;
  printLocation: PrintLocationKey;
  quantity: number;
  instructions?: string;
  phone?: string;
  shirtColor?: string;
  frontFileUrl?: string;
  frontFileName?: string;
  backFileUrl?: string;
  backFileName?: string;
};

const VALID_PRINT_LOCATIONS = new Set<PrintLocationKey>(
  PRINT_LOCATIONS.map((p) => p.key),
);

const VARIANT_PRICE_QUERY = `
  query GetVariantPrice($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        price
        availableForSale
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
    product: { title: string };
  } | null;
};

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

  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.variantId || !body.variantId.startsWith("gid://shopify/")) {
    return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
  }
  if (!VALID_PRINT_LOCATIONS.has(body.printLocation)) {
    return NextResponse.json({ error: "Invalid printLocation" }, { status: 400 });
  }
  const qty = Number(body.quantity);
  if (!Number.isFinite(qty) || qty < TSHIRT_MIN_QUANTITY) {
    return NextResponse.json(
      { error: `Minimum order quantity is ${TSHIRT_MIN_QUANTITY}` },
      { status: 400 },
    );
  }
  const phone = body.phone?.trim() ?? "";

  // Each enabled print side must have a Shopify CDN URL — never trust unverified
  // file URLs.
  const needsFront =
    body.printLocation === "front" || body.printLocation === "both";
  const needsBack =
    body.printLocation === "back" || body.printLocation === "both";
  if (needsFront && !body.frontFileUrl) {
    return NextResponse.json(
      { error: "Front design file is required for the chosen print location" },
      { status: 400 },
    );
  }
  if (needsBack && !body.backFileUrl) {
    return NextResponse.json(
      { error: "Back design file is required for the chosen print location" },
      { status: 400 },
    );
  }
  for (const url of [body.frontFileUrl, body.backFileUrl]) {
    if (url && !url.startsWith("https://cdn.shopify.com/")) {
      return NextResponse.json(
        { error: "Design URLs must come from Shopify Files" },
        { status: 400 },
      );
    }
  }

  // Look up the variant on Shopify so we never trust the browser's claimed
  // price.
  let variantPrice: number;
  let productTitle: string;
  try {
    const variantResp = await shopifyAdminFetch<VariantPriceResp>(
      VARIANT_PRICE_QUERY,
      { id: body.variantId },
      { revalidate: 0 },
    );
    if (!variantResp.node) {
      return NextResponse.json(
        { error: "Variant not found in Shopify" },
        { status: 404 },
      );
    }
    if (!variantResp.node.availableForSale) {
      return NextResponse.json(
        { error: "Variant is not available for sale" },
        { status: 400 },
      );
    }
    variantPrice = Number(variantResp.node.price);
    productTitle = variantResp.node.product.title;
  } catch (err) {
    console.error("[checkout-tshirt] variant fetch failed:", err);
    return NextResponse.json(
      { error: "Could not look up variant on Shopify" },
      { status: 502 },
    );
  }

  const price = calcTShirtPrice({
    variantPrice,
    printLocation: body.printLocation,
    quantity: qty,
  });

  const printLocationLabel =
    PRINT_LOCATIONS.find((p) => p.key === body.printLocation)?.label ??
    body.printLocation;

  const properties: { name: string; value: string }[] = [];
  if (body.selectedOptions) {
    for (const [name, value] of Object.entries(body.selectedOptions)) {
      properties.push({ name, value });
    }
  }
  if (body.shirtColor?.trim()) {
    properties.push({ name: "Shirt Color", value: body.shirtColor.trim() });
  }
  properties.push({ name: "Print Location", value: printLocationLabel });
  if (phone) {
    properties.push({ name: "Phone Number", value: phone });
  }

  if (body.frontFileUrl) {
    properties.push({ name: "Front Design", value: body.frontFileUrl });
    if (body.frontFileName) {
      properties.push({
        name: "Front Design Filename",
        value: body.frontFileName,
      });
    }
  }
  if (body.backFileUrl) {
    properties.push({ name: "Back Design", value: body.backFileUrl });
    if (body.backFileName) {
      properties.push({
        name: "Back Design Filename",
        value: body.backFileName,
      });
    }
  }

  if (body.instructions?.trim()) {
    properties.push({
      name: "Instructions",
      value: body.instructions.trim().slice(0, 2000),
    });
  }

  const numericVariantId = gidToNumericId(body.variantId);
  const optsSummary = body.selectedOptions
    ? Object.entries(body.selectedOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "";

  const draftOrder = {
    draft_order: {
      line_items: [
        {
          variant_id: Number(numericVariantId),
          quantity: qty,
          price: price.perUnit.toFixed(2),
          properties,
        },
      ],
      tags: "tshirts,custom-configurator",
      note: `${productTitle} · ${optsSummary}${
      body.shirtColor ? ` · Color: ${body.shirtColor}` : ""
    } · ${printLocationLabel}${phone ? ` · Phone: ${phone}` : ""} · Per-unit: $${price.perUnit.toFixed(2)}`,
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
      `[checkout-tshirt] Shopify ${shopifyResp.status}:`,
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
    perUnit: price.perUnit,
    total: price.total,
  });
}
