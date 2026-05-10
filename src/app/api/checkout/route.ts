import { type NextRequest, NextResponse } from "next/server";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { waitForInvoiceReady } from "@/lib/shopify-checkout";
import {
  QUANTITY_OPTIONS,
  calcPrice,
  type MaterialKey,
  type QuantityKey,
  type ShapeKey,
  type SizeKey,
} from "@/lib/pricing";

const SIZE_LABELS: Record<SizeKey, string> = {
  "2x2": 'Small (2")',
  "3x3": 'Medium (3")',
  "4x4": 'Large (4")',
  "5x5": 'X-Large (5")',
};

const MATERIAL_LABELS: Record<MaterialKey, string> = {
  matte: "Matte",
  gloss: "Gloss",
  holographic: "Holographic",
  silver: "Silver",
};

const SHAPE_LABELS: Record<ShapeKey, string> = {
  custom: "Custom Shape",
  circle: "Circle",
  oval: "Oval",
  square: "Square",
  rectangle: "Rectangle",
};

type CheckoutRequest = {
  shape: ShapeKey;
  roundedCorners: boolean | null;
  material: MaterialKey;
  size: SizeKey | "custom";
  customWidth?: number;
  customHeight?: number;
  quantity: number;
  instructions?: string;
  fileUrl?: string;
  fileName?: string;
};

const SHAPES = new Set<ShapeKey>([
  "custom",
  "circle",
  "oval",
  "square",
  "rectangle",
]);
const MATERIALS = new Set<MaterialKey>([
  "matte",
  "gloss",
  "holographic",
  "silver",
]);
const SIZES = new Set<SizeKey | "custom">([
  "2x2",
  "3x3",
  "4x4",
  "5x5",
  "custom",
]);

function snapToTier(qty: number): QuantityKey {
  return QUANTITY_OPTIONS.reduce((closest, tier) =>
    Math.abs(tier - qty) < Math.abs(closest - qty) ? tier : closest,
  ) as QuantityKey;
}

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

  // Validate required enums
  if (!SHAPES.has(body.shape)) {
    return NextResponse.json({ error: "Invalid shape" }, { status: 400 });
  }
  if (!MATERIALS.has(body.material)) {
    return NextResponse.json({ error: "Invalid material" }, { status: 400 });
  }
  if (!SIZES.has(body.size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const qtyNum = Number(body.quantity);
  if (!Number.isFinite(qtyNum) || qtyNum < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }
  if (body.size === "custom") {
    const w = Number(body.customWidth);
    const h = Number(body.customHeight);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
      return NextResponse.json(
        { error: "Custom size requires positive width and height" },
        { status: 400 },
      );
    }
  }

  // Snap quantity to closest tier for pricing
  const tierQty = snapToTier(qtyNum);

  // Recompute price server-side; never trust whatever the browser sent
  const price = calcPrice({
    size: body.size,
    qty: tierQty,
    shape: body.shape,
    material: body.material,
    customWidth: body.customWidth,
    customHeight: body.customHeight,
  });

  const sizeLabel =
    body.size === "custom"
      ? `${body.customWidth}" × ${body.customHeight}"`
      : SIZE_LABELS[body.size];

  const properties: { name: string; value: string }[] = [
    { name: "Shape", value: SHAPE_LABELS[body.shape] },
    { name: "Material", value: MATERIAL_LABELS[body.material] },
    { name: "Size", value: sizeLabel },
  ];

  if (body.roundedCorners !== null && body.roundedCorners !== undefined) {
    properties.push({
      name: "Rounded Corners",
      value: body.roundedCorners ? "Yes" : "No",
    });
  }

  if (body.fileUrl) {
    properties.push({ name: "Design File", value: body.fileUrl });
    if (body.fileName) {
      properties.push({ name: "Design Filename", value: body.fileName });
    }
  } else if (body.fileName) {
    properties.push({
      name: "Design Filename (file not uploaded — please email customer for the artwork)",
      value: body.fileName,
    });
  }

  if (body.instructions?.trim()) {
    properties.push({
      name: "Instructions",
      value: body.instructions.trim().slice(0, 2000),
    });
  }

  const draftOrder = {
    draft_order: {
      email: customer.email,
      line_items: [
        {
          title: `Custom Vinyl Stickers · ${sizeLabel} · ${SHAPE_LABELS[body.shape]}`,
          price: price.perUnit.toFixed(2),
          quantity: tierQty,
          requires_shipping: true,
          taxable: true,
          properties,
        },
      ],
      tags: "vinyl-stickers,custom-configurator",
      note: `Built via configurator. Per-unit: $${price.perUnit.toFixed(2)} · Total: $${price.total.toFixed(2)} · Savings: ${price.savingsPercent}%`,
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
      `[checkout] Shopify ${shopifyResp.status}:`,
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

  await waitForInvoiceReady(data.draft_order.invoice_url);

  return NextResponse.json({
    invoiceUrl: data.draft_order.invoice_url,
    draftOrderId: data.draft_order.id,
    quantity: tierQty,
    perUnit: price.perUnit,
    total: price.total,
  });
}
