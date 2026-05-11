/**
 * Unified cart checkout — accepts the full client-side cart (mixed item kinds)
 * and bundles everything into ONE Shopify draft order.
 *
 * Pricing for every item is recomputed server-side from the source pricing
 * tables and live Shopify variant prices — we never trust the totals the
 * browser sends. Only the configuration (size, color, design URL, etc.) comes
 * from the cart payload.
 *
 * Each cart item kind expands into one or more `line_items`:
 *   - vinyl-sticker → 1 custom-title line
 *   - tshirt        → N variant-id lines (one per size, custom override price)
 *   - product       → 1 variant-id line
 *   - signage       → 1 custom-title line  (quote-only signage doesn't go through cart)
 */

import { type NextRequest, NextResponse } from "next/server";
import { gidToNumericId, shopifyAdminFetch } from "@/lib/shopify";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { waitForInvoiceReady } from "@/lib/shopify-checkout";
import {
  QUANTITY_OPTIONS,
  calcPrice as calcStickerPrice,
  type MaterialKey as StickerMaterial,
  type QuantityKey as StickerQty,
  type ShapeKey as StickerShape,
  type SizeKey as StickerSize,
} from "@/lib/pricing";
import {
  ADD_ONS as SIGNAGE_ADD_ONS,
  SIGNAGE_MATERIALS,
  SIGNAGE_TYPES,
  calcSignagePrice,
} from "@/lib/signage-pricing";
import {
  DECAL_MATERIALS,
  PANEL_TYPES,
  SERVICE_PLANS,
  calcDecalPrice,
  type PanelType,
} from "@/lib/decal-pricing";
import type { CartItem } from "@/lib/cart-types";

const SHAPES = new Set<StickerShape>(["custom", "circle", "oval", "square", "rectangle"]);
const MATERIALS = new Set<StickerMaterial>(["matte", "gloss", "holographic", "silver"]);
const STICKER_SIZES = new Set<StickerSize>(["2x2", "3x3", "4x4", "5x5"]);

function snapToTier(qty: number): StickerQty {
  return QUANTITY_OPTIONS.reduce((closest, tier) =>
    Math.abs(tier - qty) < Math.abs(closest - qty) ? tier : closest,
  ) as StickerQty;
}

const VARIANT_LOOKUP_QUERY = `
  query GetVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price
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
    title: string;
    product: { title: string };
  } | null>;
};

type DraftLineItem = {
  variant_id?: number;
  title?: string;
  price?: string;
  quantity: number;
  requires_shipping?: boolean;
  taxable?: boolean;
  properties?: { name: string; value: string }[];
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

  let body: { items: CartItem[] };
  try {
    body = (await req.json()) as { items: CartItem[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Pre-collect every variant GID we need to look up so we batch one Shopify
  // round-trip instead of one per cart item.
  const variantIds = new Set<string>();
  for (const item of body.items) {
    if (item.kind === "tshirt") {
      for (const sv of item.sizeVariants) variantIds.add(sv.variantId);
    } else if (item.kind === "product") {
      variantIds.add(item.variantId);
    }
  }

  let variantPrices: Map<string, { price: number; title: string; productTitle: string }> = new Map();
  if (variantIds.size > 0) {
    try {
      const data = await shopifyAdminFetch<VariantLookupResp>(
        VARIANT_LOOKUP_QUERY,
        { ids: Array.from(variantIds) },
        { revalidate: 0 },
      );
      for (const node of data.nodes) {
        if (!node) continue;
        variantPrices.set(node.id, {
          price: Number(node.price),
          title: node.title,
          productTitle: node.product.title,
        });
      }
    } catch (err) {
      console.error("[checkout-cart] variant lookup failed:", err);
      return NextResponse.json(
        { error: "Could not look up variant prices on Shopify" },
        { status: 502 },
      );
    }
  }

  // Build draft-order line items by expanding each cart item.
  const lineItems: DraftLineItem[] = [];
  const noteParts: string[] = [];

  for (const item of body.items) {
    if (item.kind === "vinyl-sticker") {
      if (!SHAPES.has(item.shape as StickerShape)) {
        return NextResponse.json({ error: "Invalid sticker shape" }, { status: 400 });
      }
      if (!MATERIALS.has(item.material as StickerMaterial)) {
        return NextResponse.json({ error: "Invalid sticker material" }, { status: 400 });
      }
      if (!STICKER_SIZES.has(item.size as StickerSize)) {
        return NextResponse.json({ error: "Invalid sticker size" }, { status: 400 });
      }

      const tierQty = snapToTier(item.tierQty);
      const price = calcStickerPrice({
        size: item.size as StickerSize,
        qty: tierQty,
        shape: item.shape as StickerShape,
        material: item.material as StickerMaterial,
        customWidth: item.customWidth,
        customHeight: item.customHeight,
      });

      const sizeLabel =
        item.size === "custom"
          ? `${item.customWidth}″ × ${item.customHeight}″`
          : item.size;

      const properties: { name: string; value: string }[] = [
        { name: "Shape", value: item.shape },
        { name: "Material", value: item.material },
        { name: "Size", value: sizeLabel },
      ];
      if (item.roundedCorners !== null) {
        properties.push({
          name: "Rounded Corners",
          value: item.roundedCorners ? "Yes" : "No",
        });
      }
      if (item.fileUrl) {
        properties.push({ name: "Design File", value: item.fileUrl });
        if (item.fileName) {
          properties.push({ name: "Design Filename", value: item.fileName });
        }
      }
      if (item.instructions?.trim()) {
        properties.push({
          name: "Instructions",
          value: item.instructions.trim().slice(0, 2000),
        });
      }

      lineItems.push({
        title: `Custom Vinyl Stickers · ${sizeLabel} · ${item.shape}`,
        price: price.perUnit.toFixed(2),
        quantity: tierQty,
        requires_shipping: true,
        taxable: true,
        properties,
      });
      noteParts.push(`Stickers ${sizeLabel} × ${tierQty}`);
    } else if (item.kind === "tshirt") {
      if (!Array.isArray(item.sizeVariants) || item.sizeVariants.length === 0) {
        return NextResponse.json(
          { error: "T-shirt item missing sizes" },
          { status: 400 },
        );
      }

      const sharedProperties: { name: string; value: string }[] = [];
      for (const [name, value] of Object.entries(item.selectedOptions ?? {})) {
        sharedProperties.push({ name, value });
      }
      if (item.shirtColor?.trim()) {
        sharedProperties.push({ name: "Shirt Color", value: item.shirtColor.trim() });
      }
      if (item.printLocation) {
        sharedProperties.push({ name: "Print Location", value: item.printLocation });
      }
      const uploadLabel = item.uploadLabel?.trim() || "Design";
      if (item.frontFileUrl) {
        const frontKey = item.printLocation ? "Front Design" : `${uploadLabel} File`;
        const frontNameKey = item.printLocation
          ? "Front Design Filename"
          : `${uploadLabel} Filename`;
        sharedProperties.push({ name: frontKey, value: item.frontFileUrl });
        if (item.frontFileName) {
          sharedProperties.push({ name: frontNameKey, value: item.frontFileName });
        }
      }
      if (item.backFileUrl) {
        sharedProperties.push({ name: "Back Design", value: item.backFileUrl });
        if (item.backFileName) {
          sharedProperties.push({
            name: "Back Design Filename",
            value: item.backFileName,
          });
        }
      }
      if (item.phone?.trim()) {
        sharedProperties.push({ name: "Phone Number", value: item.phone.trim() });
      }
      if (item.instructions?.trim()) {
        sharedProperties.push({
          name: "Instructions",
          value: item.instructions.trim().slice(0, 2000),
        });
      }

      let totalShirts = 0;
      for (const sv of item.sizeVariants) {
        const lookup = variantPrices.get(sv.variantId);
        if (!lookup) {
          return NextResponse.json(
            { error: `Variant ${sv.variantId} not found in Shopify` },
            { status: 404 },
          );
        }
        const qty = Math.max(1, Math.floor(Number(sv.quantity) || 0));
        if (qty === 0) continue;
        lineItems.push({
          variant_id: Number(gidToNumericId(sv.variantId)),
          quantity: qty,
          price: lookup.price.toFixed(2),
          properties: sharedProperties,
        });
        totalShirts += qty;
      }
      noteParts.push(`${item.productTitle} × ${totalShirts}`);
    } else if (item.kind === "product") {
      const lookup = variantPrices.get(item.variantId);
      if (!lookup) {
        return NextResponse.json(
          { error: `Variant ${item.variantId} not found in Shopify` },
          { status: 404 },
        );
      }
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      const properties: { name: string; value: string }[] = [];
      for (const [name, value] of Object.entries(item.selectedOptions ?? {})) {
        properties.push({ name, value });
      }
      for (const [name, value] of Object.entries(item.extraProperties ?? {})) {
        const v = String(value).trim();
        if (v) properties.push({ name, value: v.slice(0, 2000) });
      }
      lineItems.push({
        variant_id: Number(gidToNumericId(item.variantId)),
        quantity: qty,
        properties,
      });
      noteParts.push(`${lookup.productTitle} × ${qty}`);
    } else if (item.kind === "signage") {
      const validType = SIGNAGE_TYPES.find((t) => t.key === item.signageType);
      if (!validType) {
        return NextResponse.json({ error: "Invalid sign type" }, { status: 400 });
      }
      const materials = SIGNAGE_MATERIALS[item.signageType] ?? [];
      const validMaterial = materials.find((m) => m.key === item.material);
      if (!validMaterial) {
        return NextResponse.json({ error: "Invalid material" }, { status: 400 });
      }
      const w = Number(item.width);
      const h = Number(item.height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        return NextResponse.json({ error: "Invalid dimensions" }, { status: 400 });
      }
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      const cleanAddOns = (item.addOns ?? []).filter((k) =>
        SIGNAGE_ADD_ONS.find((a) => a.key === k && a.applicableTo.includes(item.signageType)),
      );
      const price = calcSignagePrice({
        type: item.signageType,
        material: item.material,
        width: w,
        height: h,
        sides: item.sides,
        addOns: cleanAddOns,
        quantity: qty,
      });

      const sizeLabel = `${w}″ × ${h}″`;
      const addOnLabels = cleanAddOns
        .map((k) => SIGNAGE_ADD_ONS.find((a) => a.key === k)?.label)
        .filter(Boolean)
        .join(", ");

      const properties: { name: string; value: string }[] = [
        { name: "Sign Type", value: validType.label },
        { name: "Material", value: validMaterial.label },
        { name: "Size", value: sizeLabel },
        {
          name: "Sides",
          value: item.sides === "single" ? "Single-sided" : "Double-sided",
        },
      ];
      if (addOnLabels) properties.push({ name: "Add-ons", value: addOnLabels });
      if (item.fileUrl) {
        properties.push({ name: "Design File", value: item.fileUrl });
        if (item.fileName) {
          properties.push({ name: "Design Filename", value: item.fileName });
        }
      }
      if (item.notes?.trim()) {
        properties.push({
          name: "Notes",
          value: item.notes.trim().slice(0, 2000),
        });
      }

      lineItems.push({
        title: `${validType.label} · ${sizeLabel} · ${validMaterial.label}`,
        price: price.perUnit.toFixed(2),
        quantity: qty,
        requires_shipping: true,
        taxable: true,
        properties,
      });
      noteParts.push(`${validType.label} ${sizeLabel} × ${qty}`);
    } else if (item.kind === "decal") {
      const plan = SERVICE_PLANS.find((p) => p.key === item.servicePlan);
      if (!plan) {
        return NextResponse.json({ error: "Invalid service plan" }, { status: 400 });
      }
      const mat = DECAL_MATERIALS.find((m) => m.key === item.material);
      if (!mat) {
        return NextResponse.json({ error: "Invalid decal material" }, { status: 400 });
      }
      if (mat.quoteOnly) {
        return NextResponse.json(
          {
            error:
              "Special Vinyl requires a custom quote — please call (772) 985-2854.",
          },
          { status: 400 },
        );
      }
      if (!Array.isArray(item.panels) || item.panels.length === 0) {
        return NextResponse.json(
          { error: "Decal quote needs at least one panel" },
          { status: 400 },
        );
      }
      for (const panel of item.panels) {
        const w = Number(panel.width);
        const h = Number(panel.height);
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
          return NextResponse.json(
            { error: "Each panel needs valid width and height" },
            { status: 400 },
          );
        }
      }

      // Recompute server-side — never trust the client's totals.
      const recomputed = calcDecalPrice({
        panels: item.panels.map((p) => ({
          type: (PANEL_TYPES.find((t) => t.key === p.type)?.key ??
            "other") as PanelType,
          width: Number(p.width),
          height: Number(p.height),
          description: p.description,
        })),
        servicePlan: plan.key,
        material: mat.key,
        discountPercent: Number(item.discountPercent) || 0,
      });

      const panelLines = item.panels.map((p) => {
        const sqft = (Number(p.width) * Number(p.height)) / 144;
        return `${p.typeLabel} ${p.width}″×${p.height}″ (${sqft.toFixed(2)} sqft)${
          p.description ? ` — ${p.description}` : ""
        }`;
      });

      const properties: { name: string; value: string }[] = [
        { name: "Service Plan", value: plan.label },
        { name: "Material", value: mat.label },
        {
          name: "Total Area",
          value: `${recomputed.totalAreaSqFt.toFixed(2)} sq ft`,
        },
        {
          name: "Rate",
          value: `$${recomputed.pricePerSqFt.toFixed(2)} / sq ft`,
        },
        { name: "Panels", value: panelLines.join("\n") },
      ];
      if (recomputed.discountAmount > 0) {
        properties.push({
          name: "Discount",
          value: `${item.discountPercent}% (−$${recomputed.discountAmount.toFixed(2)})`,
        });
      }
      properties.push({
        name: "Tax (7% Martin County)",
        value: `$${recomputed.taxAmount.toFixed(2)}`,
      });
      if (item.notes?.trim()) {
        properties.push({
          name: "Project Notes",
          value: item.notes.trim().slice(0, 2000),
        });
      }

      // Single line item — the total already includes tax + discount, so we
      // pass it as the line price with quantity 1. Shopify still handles
      // shipping at checkout.
      lineItems.push({
        title: `${mat.label} · ${plan.label} · ${recomputed.totalAreaSqFt.toFixed(2)} sq ft`,
        price: recomputed.total.toFixed(2),
        quantity: 1,
        requires_shipping: true,
        taxable: false, // tax is already baked into our price
        properties,
      });
      noteParts.push(
        `Decal ${mat.label} ${recomputed.totalAreaSqFt.toFixed(2)} sqft`,
      );
    }
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No valid items in cart" },
      { status: 400 },
    );
  }

  // Reject any uploaded design URL not from Shopify Files (defense in depth).
  for (const li of lineItems) {
    for (const prop of li.properties ?? []) {
      if (
        /design|file|art/i.test(prop.name) &&
        prop.value.startsWith("http") &&
        !prop.value.startsWith("https://cdn.shopify.com/")
      ) {
        return NextResponse.json(
          { error: "Design URLs must come from Shopify Files" },
          { status: 400 },
        );
      }
    }
  }

  const draftOrder = {
    draft_order: {
      email: customer.email,
      line_items: lineItems,
      tags: "cart-checkout,custom-configurator",
      note: `Cart checkout · ${noteParts.join(" + ")}`,
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
      `[checkout-cart] Shopify ${shopifyResp.status}:`,
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
  });
}
