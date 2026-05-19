import { type NextRequest, NextResponse } from "next/server";
import { gidToNumericId, shopifyAdminFetch } from "@/lib/shopify";
import { detectMinQuantityFromTitle } from "@/lib/shopify-products";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { normalizeInvoiceUrl, waitForInvoiceReady } from "@/lib/shopify-checkout";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
} from "@/lib/tshirt-pricing";

type SizeVariant = {
  variantId: string;
  size: string;
  quantity: number;
};

type CheckoutRequest = {
  sizeVariants: SizeVariant[];
  selectedOptions: Record<string, string>;
  /** Optional — only relevant for products that expose a print location. */
  printLocation?: PrintLocationKey;
  /** When printLocation is missing, label the single upload (e.g. "Embroidery Artwork"). */
  uploadLabel?: string;
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

const VARIANT_LOOKUP_QUERY = `
  query GetVariantPrices($ids: [ID!]!) {
    nodes(ids: $ids) {
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

type VariantLookupResp = {
  nodes: Array<{
    id: string;
    price: string;
    availableForSale: boolean;
    title: string;
    product: { title: string };
  } | null>;
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

  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;
  const customer = customerOr401;

  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate the size matrix.
  if (!Array.isArray(body.sizeVariants) || body.sizeVariants.length === 0) {
    return NextResponse.json(
      { error: "At least one size with a quantity is required" },
      { status: 400 },
    );
  }
  for (const sv of body.sizeVariants) {
    if (!sv.variantId || !sv.variantId.startsWith("gid://shopify/")) {
      return NextResponse.json(
        { error: "Invalid variantId in sizeVariants" },
        { status: 400 },
      );
    }
    const q = Number(sv.quantity);
    if (!Number.isFinite(q) || q < 1) {
      return NextResponse.json(
        { error: "Each size quantity must be at least 1" },
        { status: 400 },
      );
    }
  }

  const totalQty = body.sizeVariants.reduce(
    (a, b) => a + Number(b.quantity),
    0,
  );
  // The per-product minimum is enforced after the variant lookup below,
  // once we know the real Shopify product title (the source of truth for
  // the min — never trust a client-sent value).

  // Print location only required when explicitly provided (T-shirt). For
  // embroidered apparel (polo) we skip the location entirely.
  const hasPrintLocation = !!body.printLocation;
  if (hasPrintLocation && !VALID_PRINT_LOCATIONS.has(body.printLocation!)) {
    return NextResponse.json({ error: "Invalid printLocation" }, { status: 400 });
  }

  // Validate file requirements:
  //   - With print location: front/back uploads keyed by the chosen side
  //   - Without print location: a single front upload represents the artwork
  const needsFront = hasPrintLocation
    ? body.printLocation === "front" || body.printLocation === "both"
    : true;
  const needsBack = hasPrintLocation
    ? body.printLocation === "back" || body.printLocation === "both"
    : false;
  if (needsFront && !body.frontFileUrl) {
    return NextResponse.json(
      { error: "Design file is required" },
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

  // Look up every variant in one round-trip — server-side price source of
  // truth, never trust whatever the browser sent.
  const ids = body.sizeVariants.map((sv) => sv.variantId);
  let priced: Array<{
    sv: SizeVariant;
    price: number;
    title: string;
  }>;
  let productTitle = "T-Shirts";
  try {
    const resp = await shopifyAdminFetch<VariantLookupResp>(
      VARIANT_LOOKUP_QUERY,
      { ids },
      { revalidate: 0 },
    );

    priced = body.sizeVariants.map((sv, i) => {
      const node = resp.nodes[i];
      if (!node) {
        throw new Error(`Variant not found: ${sv.size}`);
      }
      if (!node.availableForSale) {
        throw new Error(`Sold out: ${sv.size}`);
      }
      productTitle = node.product.title;
      return {
        sv,
        price: Number(node.price),
        title: node.title,
      };
    });
  } catch (err) {
    console.error("[checkout-tshirt] variant lookup failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Variant lookup on Shopify failed",
      },
      { status: 502 },
    );
  }

  // Enforce the per-product minimum. Anthony encodes it in the product title
  // (e.g. "… – 6 Piece Minimum"); if the title has none, fall back to the
  // T-shirt default of 12. productTitle came from Shopify above, so it can't
  // be spoofed by the client.
  const minQty = detectMinQuantityFromTitle(productTitle) ?? TSHIRT_MIN_QUANTITY;
  if (totalQty < minQty) {
    return NextResponse.json(
      { error: `Minimum order quantity is ${minQty}` },
      { status: 400 },
    );
  }

  const printLocationLabel = hasPrintLocation
    ? PRINT_LOCATIONS.find((p) => p.key === body.printLocation)?.label ??
      body.printLocation!
    : null;
  const uploadLabel = body.uploadLabel?.trim() || "Design";

  // These properties get attached to every line item so Anthony can see the
  // full order context when looking at any size.
  const sharedProperties: { name: string; value: string }[] = [];
  if (body.selectedOptions) {
    for (const [name, value] of Object.entries(body.selectedOptions)) {
      sharedProperties.push({ name, value });
    }
  }
  if (body.shirtColor?.trim()) {
    sharedProperties.push({
      name: "Shirt Color",
      value: body.shirtColor.trim(),
    });
  }
  if (printLocationLabel) {
    sharedProperties.push({
      name: "Print Location",
      value: printLocationLabel,
    });
  }
  if (body.frontFileUrl) {
    // When there's no print location, the file is the single design.
    const frontKey = hasPrintLocation ? "Front Design" : `${uploadLabel} File`;
    const frontNameKey = hasPrintLocation
      ? "Front Design Filename"
      : `${uploadLabel} Filename`;
    sharedProperties.push({ name: frontKey, value: body.frontFileUrl });
    if (body.frontFileName) {
      sharedProperties.push({
        name: frontNameKey,
        value: body.frontFileName,
      });
    }
  }
  if (body.backFileUrl) {
    sharedProperties.push({ name: "Back Design", value: body.backFileUrl });
    if (body.backFileName) {
      sharedProperties.push({
        name: "Back Design Filename",
        value: body.backFileName,
      });
    }
  }
  const phone = body.phone?.trim() ?? "";
  if (phone) {
    sharedProperties.push({ name: "Phone Number", value: phone });
  }
  if (body.instructions?.trim()) {
    sharedProperties.push({
      name: "Instructions",
      value: body.instructions.trim().slice(0, 2000),
    });
  }

  // Build one line item per size. variant_id keeps Anthony's inventory
  // tracking accurate; price defaults to the Shopify variant price (no
  // separate print fee).
  const lineItems = priced.map(({ sv, price }) => ({
    variant_id: Number(gidToNumericId(sv.variantId)),
    quantity: Number(sv.quantity),
    price: price.toFixed(2),
    properties: sharedProperties,
  }));

  const totalAmount = priced.reduce(
    (sum, { sv, price }) => sum + price * Number(sv.quantity),
    0,
  );

  const optsSummary = body.selectedOptions
    ? Object.entries(body.selectedOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "";
  const sizeBreakdown = priced
    .map(({ sv }) => `${sv.quantity} × ${sv.size}`)
    .join(", ");

  const draftOrder = {
    draft_order: {
      email: customer.email,
      line_items: lineItems,
      tags: "tshirts,custom-configurator",
      note: `${productTitle}${optsSummary ? ` · ${optsSummary}` : ""}${
        body.shirtColor ? ` · Color: ${body.shirtColor}` : ""
      }${printLocationLabel ? ` · ${printLocationLabel}` : ""} · Sizes: ${sizeBreakdown}${
        phone ? ` · Phone: ${phone}` : ""
      } · Total: $${totalAmount.toFixed(2)} (${totalQty} shirts)`,
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

  const invoiceUrl = normalizeInvoiceUrl(data.draft_order.invoice_url);
  await waitForInvoiceReady(invoiceUrl);

  return NextResponse.json({
    invoiceUrl,
    draftOrderId: data.draft_order.id,
    totalQuantity: totalQty,
    totalAmount,
  });
}
