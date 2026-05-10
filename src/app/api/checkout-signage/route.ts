import { type NextRequest, NextResponse } from "next/server";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { waitForInvoiceReady } from "@/lib/shopify-checkout";
import {
  ADD_ONS,
  SIGNAGE_MATERIALS,
  SIGNAGE_TYPES,
  calcSignagePrice,
  requiresManualQuote,
} from "@/lib/signage-pricing";

type CheckoutSignageRequest = {
  /** "order" → instant draft order. "quote" → quote-pending draft order at $0. */
  kind: "order" | "quote";
  type: string;
  material: string;
  width: number;
  height: number;
  sides: "single" | "double";
  addOns: string[];
  quantity: number;
  fileUrl?: string;
  fileName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!STORE || !TOKEN) {
    return NextResponse.json(
      { error: "Server not configured: missing Shopify env vars" },
      { status: 500 },
    );
  }

  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;
  const customer = customerOr401;

  let body: CheckoutSignageRequest;
  try {
    body = (await req.json()) as CheckoutSignageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validType = SIGNAGE_TYPES.find((t) => t.key === body.type);
  if (!validType) {
    return NextResponse.json({ error: "Invalid sign type" }, { status: 400 });
  }

  const materials = SIGNAGE_MATERIALS[body.type] ?? [];
  const validMaterial = materials.find((m) => m.key === body.material);
  if (!validMaterial) {
    return NextResponse.json({ error: "Invalid material" }, { status: 400 });
  }

  const w = Number(body.width);
  const h = Number(body.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return NextResponse.json(
      { error: "Invalid dimensions" },
      { status: 400 },
    );
  }

  const qty = Math.max(1, Math.floor(Number(body.quantity) || 1));

  if (body.sides !== "single" && body.sides !== "double") {
    return NextResponse.json({ error: "Invalid sides" }, { status: 400 });
  }

  // Validate add-ons against the type.
  const cleanAddOns = (body.addOns ?? []).filter((k) =>
    ADD_ONS.find((a) => a.key === k && a.applicableTo.includes(body.type)),
  );

  // Reject any uploaded URL that isn't from Shopify Files.
  if (
    body.fileUrl &&
    !body.fileUrl.startsWith("https://cdn.shopify.com/")
  ) {
    return NextResponse.json(
      { error: "Design URLs must come from Shopify Files" },
      { status: 400 },
    );
  }

  const isQuoteOnly =
    body.kind === "quote" || requiresManualQuote(w, h);

  // Logged-in customer's email is the default; the form-supplied email (if
  // any) overrides it for cases where the customer wants the quote sent to a
  // different address.
  const customerEmail = body.email?.trim() || customer.email;

  // Server-side recompute — never trust the browser's price.
  const price = calcSignagePrice({
    type: body.type,
    material: body.material,
    width: w,
    height: h,
    sides: body.sides,
    addOns: cleanAddOns,
    quantity: qty,
  });

  const sizeLabel = `${w}″ × ${h}″`;
  const addOnLabels = cleanAddOns
    .map((k) => ADD_ONS.find((a) => a.key === k)?.label)
    .filter(Boolean)
    .join(", ");

  const properties: { name: string; value: string }[] = [
    { name: "Sign Type", value: validType.label },
    { name: "Material", value: validMaterial.label },
    { name: "Size", value: sizeLabel },
    { name: "Sides", value: body.sides === "single" ? "Single-sided" : "Double-sided" },
  ];
  if (addOnLabels) {
    properties.push({ name: "Add-ons", value: addOnLabels });
  }
  if (body.fileUrl) {
    properties.push({ name: "Design File", value: body.fileUrl });
    if (body.fileName) {
      properties.push({ name: "Design Filename", value: body.fileName });
    }
  }
  properties.push({ name: "Customer Email", value: customerEmail });
  if (body.phone?.trim()) {
    properties.push({ name: "Customer Phone", value: body.phone.trim() });
  }
  if (body.notes?.trim()) {
    properties.push({
      name: "Notes",
      value: body.notes.trim().slice(0, 2000),
    });
  }

  // Quote requests get a $0 line so Anthony can adjust pricing in admin
  // before sending the invoice. Instant orders get the calculated price.
  const linePrice = isQuoteOnly ? "0.00" : price.perUnit.toFixed(2);
  const titlePrefix = isQuoteOnly ? "Quote request — " : "";

  const draftOrder = {
    draft_order: {
      email: customerEmail,
      line_items: [
        {
          title: `${titlePrefix}${validType.label} · ${sizeLabel} · ${validMaterial.label}`,
          price: linePrice,
          quantity: qty,
          requires_shipping: true,
          taxable: !isQuoteOnly,
          properties,
        },
      ],
      tags: isQuoteOnly
        ? "signage,quote-pending,custom-configurator"
        : "signage,custom-configurator",
      note: isQuoteOnly
        ? `QUOTE REQUEST · ${validType.label} ${sizeLabel} ${body.sides}-sided · Estimate $${price.total.toFixed(2)} · Reply to ${customerEmail}`
        : `${validType.label} · ${sizeLabel} · ${body.sides}-sided · Total: $${price.total.toFixed(2)} (${qty} pcs)`,
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
      `[checkout-signage] Shopify ${shopifyResp.status}:`,
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

  if (isQuoteOnly) {
    // Anthony will adjust pricing in Shopify admin and send the invoice URL
    // separately. Customer just gets the confirmation that we got their request.
    return NextResponse.json({
      quoteAccepted: true,
      draftOrderId: data.draft_order.id,
    });
  }

  await waitForInvoiceReady(data.draft_order.invoice_url);

  // Instant order — return the invoice URL so the customer can pay now.
  return NextResponse.json({
    invoiceUrl: data.draft_order.invoice_url,
    draftOrderId: data.draft_order.id,
    quantity: qty,
    perUnit: price.perUnit,
    total: price.total,
  });
}
