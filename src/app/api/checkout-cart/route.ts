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
import { getCurrentCustomer } from "@/lib/customer-session";
import { normalizeInvoiceUrl, waitForInvoiceReady } from "@/lib/shopify-checkout";
import { isStickerScopedCode, lookupDiscountCode } from "@/lib/discount-lookup";
import { isAllowedDesignUrl } from "@/lib/allowed-design-hosts";
import {
  QUANTITY_OPTIONS,
  calcPrice as calcStickerPrice,
  type MaterialKey as StickerMaterial,
  type QuantityKey as StickerQty,
  type ShapeKey as StickerShape,
  type SizeKey as StickerSize,
} from "@/lib/pricing";
import {
  SERVICE_PLANS,
  calcSignageQuotePrice,
  type MeasurementUnit,
  type ServicePlanKey,
} from "@/lib/signage-pricing";
import {
  DECAL_MATERIALS,
  PANEL_TYPES,
  calcDecalPrice,
  type MaterialKey as DecalMaterialKey,
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

type DraftAppliedDiscount = {
  description: string;
  value_type: "percentage" | "fixed_amount";
  value: string;
  amount?: string;
  title: string;
};

type DraftLineItem = {
  variant_id?: number;
  title?: string;
  price?: string;
  quantity: number;
  requires_shipping?: boolean;
  taxable?: boolean;
  properties?: { name: string; value: string }[];
  /** Line-level discount — used for sticker-scoped codes (see
   * discountEligibleSubtotal in discount-types.ts) so the discount only
   * reduces this line instead of the whole draft order. */
  applied_discount?: DraftAppliedDiscount;
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

  // Login is optional — guests can check out by providing an email in the body.
  const customer = await getCurrentCustomer();

  let body: {
    items: CartItem[];
    email?: string;
    discountCode?: string | null;
  };
  try {
    body = (await req.json()) as {
      items: CartItem[];
      email?: string;
      discountCode?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Determine the email used for the draft order. Logged-in customer's
  // account email always wins; otherwise we require a valid one from the body.
  const guestEmail = (body.email ?? "").trim().toLowerCase();
  const orderEmail = customer?.email ?? guestEmail;
  if (
    !customer &&
    (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
  ) {
    return NextResponse.json(
      { error: "A valid email is required to check out." },
      { status: 400 },
    );
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
  // Indices into lineItems that came from a vinyl-sticker cart item — used to
  // apply sticker-scoped discount codes at the line level (see below) instead
  // of order-wide, since Custom Vinyl Stickers isn't a real Shopify product.
  const stickerLineIndices: number[] = [];

  for (const item of body.items) {
    if (item.kind === "vinyl-sticker") {
      if (!SHAPES.has(item.shape as StickerShape)) {
        return NextResponse.json({ error: "Invalid sticker shape" }, { status: 400 });
      }
      if (!MATERIALS.has(item.material as StickerMaterial)) {
        return NextResponse.json({ error: "Invalid sticker material" }, { status: 400 });
      }
      if (item.size === "custom") {
        // Custom size carries width/height instead of a preset key — the
        // price calc + label code below already handle it; just sanity-check
        // the dimensions are positive.
        const w = Number(item.customWidth);
        const h = Number(item.customHeight);
        if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
          return NextResponse.json(
            { error: "Custom size requires a positive width and height" },
            { status: 400 },
          );
        }
      } else if (!STICKER_SIZES.has(item.size as StickerSize)) {
        return NextResponse.json({ error: "Invalid sticker size" }, { status: 400 });
      }

      const tierQty = snapToTier(item.tierQty);
      // Actual number of stickers in the order — comes from the configurator.
      // In tier mode this equals tierQty; in custom mode it's whatever the
      // customer typed. Floor it and enforce the minimum on the server too —
      // never trust the client value.
      const VINYL_MIN_QTY = 25;
      const orderQty = Math.max(
        VINYL_MIN_QTY,
        Math.floor(Number(item.quantity) || 0),
      );
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
      if (item.proof) {
        const p = item.proof;
        properties.push({
          name: "Proof Status",
          value:
            p.status === "approved"
              ? "Approved by customer"
              : "Changes requested",
        });
        if (p.proofUrl) {
          properties.push({ name: "Approved Proof", value: p.proofUrl });
        }
        if (p.cutlineUrl) {
          properties.push({ name: "Cutline (SVG)", value: p.cutlineUrl });
        }
        properties.push({
          name: "Proof Settings",
          value: `${p.shape} · ${p.borderThickness} border · corners ${p.roundedCorners} · bg ${p.removedBackground ? "removed" : "kept"}`,
        });
        if (p.lowResolution) {
          properties.push({
            name: "⚠ Resolution",
            value: "Low — flagged for review before print",
          });
        }
        if (p.changeNote?.trim()) {
          properties.push({
            name: "Customer Change Request",
            value: p.changeNote.trim().slice(0, 2000),
          });
        }
      }

      stickerLineIndices.push(lineItems.length);
      lineItems.push({
        title: `Custom Vinyl Stickers · ${sizeLabel} · ${item.shape}`,
        price: price.perUnit.toFixed(2),
        quantity: orderQty,
        requires_shipping: true,
        taxable: true,
        properties,
      });
      noteParts.push(`Stickers ${sizeLabel} × ${orderQty}`);
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
        // When the customer mixed colors, the color is per line (not shared).
        // The variant itself already encodes it, but an explicit property
        // makes it obvious on Anthony's order screen.
        const lineProperties = sv.color
          ? [...sharedProperties, { name: "Color", value: String(sv.color) }]
          : sharedProperties;
        lineItems.push({
          variant_id: Number(gidToNumericId(sv.variantId)),
          quantity: qty,
          price: lookup.price.toFixed(2),
          properties: lineProperties,
        });
        totalShirts += qty;
      }
      const colorsUsed = Array.from(
        new Set(
          item.sizeVariants
            .map((sv) => sv.color)
            .filter((c): c is string => !!c),
        ),
      );
      noteParts.push(
        `${item.productTitle} × ${totalShirts}${
          colorsUsed.length ? ` (${colorsUsed.join(", ")})` : ""
        }`,
      );
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
      // Decal Signage Calculator — service plan × area × quantity, with
      // optional discount, no tax.
      const plan = SERVICE_PLANS.find(
        (p) => p.key === (item.servicePlan as ServicePlanKey),
      );
      if (!plan) {
        return NextResponse.json(
          { error: "Invalid service plan" },
          { status: 400 },
        );
      }
      const w = Number(item.width);
      const l = Number(item.length);
      if (!Number.isFinite(w) || !Number.isFinite(l) || w <= 0 || l <= 0) {
        return NextResponse.json(
          { error: "Invalid signage dimensions" },
          { status: 400 },
        );
      }
      const unit: MeasurementUnit = item.unit === "in" ? "in" : "ft";
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));

      const recomputed = calcSignageQuotePrice({
        width: w,
        length: l,
        unit,
        quantity: qty,
        servicePlan: plan.key,
        discountPercent: Number(item.discountPercent) || 0,
      });

      const dimLabel = `${w}${unit} × ${l}${unit}`;
      const properties: { name: string; value: string }[] = [
        { name: "Service Plan", value: plan.label },
        { name: "Dimensions", value: dimLabel },
        {
          name: "Total Area",
          value: `${recomputed.totalAreaSqFt.toFixed(2)} sq ft`,
        },
        { name: "Quantity", value: `${qty}` },
        {
          name: "Rate",
          value: `$${recomputed.pricePerSqFt.toFixed(2)} / sq ft`,
        },
      ];
      if (recomputed.discountAmount > 0) {
        properties.push({
          name: "Discount",
          value: `${item.discountPercent}% (−$${recomputed.discountAmount.toFixed(2)})`,
        });
      }
      if (item.notes?.trim()) {
        properties.push({
          name: "Project Notes",
          value: item.notes.trim().slice(0, 2000),
        });
      }
      if (Array.isArray(item.imageUrls)) {
        item.imageUrls.forEach((url, i) => {
          if (typeof url === "string" && url.trim()) {
            properties.push({
              name: `Reference Image ${i + 1}`,
              value: url.trim(),
            });
          }
        });
      }

      // Single line item — total already reflects discount. No tax line
      // because Decal Signage Calculator in the old site didn't add tax.
      lineItems.push({
        title: `Decal Signage · ${plan.label} · ${dimLabel}`,
        price: recomputed.total.toFixed(2),
        quantity: 1,
        requires_shipping: true,
        taxable: false,
        properties,
      });
      noteParts.push(
        `Decal Signage ${plan.label} ${recomputed.totalAreaSqFt.toFixed(2)} sqft`,
      );
    } else if (item.kind === "vehicle-sticker") {
      lineItems.push({
        title: `Vehicle Sticker Kit — ${item.year} ${item.make} ${item.model} · ${item.partLabel}`,
        price: item.totalPrice.toFixed(2),
        quantity: 1,
        requires_shipping: true,
        taxable: true,
        properties: [
          { name: "Make", value: item.make },
          { name: "Model", value: item.model },
          { name: "Year", value: String(item.year) },
          { name: "Set", value: item.partLabel },
        ],
      });
      noteParts.push(
        `${item.year} ${item.make} ${item.model} — ${item.partLabel}`,
      );
    } else if (item.kind === "decal") {
      // Quick Quote — multi-panel + material, 7% Martin County tax on top.
      const mat = DECAL_MATERIALS.find(
        (m) => m.key === (item.material as DecalMaterialKey),
      );
      if (!mat) {
        return NextResponse.json(
          { error: "Invalid decal material" },
          { status: 400 },
        );
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
          { error: "Signage Quote needs at least one panel" },
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

      const recomputed = calcDecalPrice({
        panels: item.panels.map((p) => ({
          type: (PANEL_TYPES.find((t) => t.key === p.type)?.key ??
            "other") as PanelType,
          width: Number(p.width),
          height: Number(p.height),
          description: p.description,
        })),
        material: mat.key,
        discountPercent: Number(item.discountPercent) || 0,
      });

      const panelLines = item.panels.map((p) => {
        const sqft = (Number(p.width) * Number(p.height)) / 144;
        return `${p.typeLabel} ${p.width}″×${p.height}″ (${sqft.toFixed(2)} sqft)${
          p.description ? ` — ${p.description}` : ""
        }${p.note?.trim() ? ` (Note: ${p.note.trim()})` : ""}`;
      });

      const properties: { name: string; value: string }[] = [
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
      item.panels.forEach((p, i) => {
        if (typeof p.imageUrl === "string" && p.imageUrl.trim()) {
          properties.push({
            name: `Panel ${i + 1} Image`,
            value: p.imageUrl.trim(),
          });
        }
      });
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

      lineItems.push({
        title: `Signage Quote · ${mat.label} · ${recomputed.totalAreaSqFt.toFixed(2)} sq ft`,
        price: recomputed.total.toFixed(2),
        quantity: 1,
        requires_shipping: true,
        taxable: false, // tax already baked into our price
        properties,
      });
      noteParts.push(
        `Signage Quote ${mat.label} ${recomputed.totalAreaSqFt.toFixed(2)} sqft`,
      );
    }
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No valid items in cart" },
      { status: 400 },
    );
  }

  // Reject any uploaded design URL not from an allowed host (defense in depth).
  for (const li of lineItems) {
    for (const prop of li.properties ?? []) {
      if (
        /design|file|art|image/i.test(prop.name) &&
        prop.value.startsWith("http") &&
        !isAllowedDesignUrl(prop.value)
      ) {
        return NextResponse.json(
          { error: "Design URLs must come from an allowed upload host" },
          { status: 400 },
        );
      }
    }
  }

  // Re-validate any discount code server-side before applying it. We don't
  // trust the client's stored value — a malicious user could otherwise forge
  // a 100% percentage. We pass the line-item subtotal so Shopify's minimum
  // requirement check uses an accurate, server-computed amount.
  const lineTotal = (li: DraftLineItem) => Number(li.price || 0) * li.quantity;
  let appliedDiscount: DraftAppliedDiscount | null = null;
  let discountScopedToStickers = false;
  const discountCode = body.discountCode?.trim();
  if (discountCode) {
    const itemsSubtotal = lineItems.reduce((sum, li) => {
      // For variant_id lines we don't have the resolved price here; look it
      // up from variantPrices using the variant_id we just stamped. For
      // custom-title lines, `price` is already the per-unit dollar string.
      if (li.variant_id) {
        // Find matching variantPrices entry by numeric id → GID conversion.
        const match = Array.from(variantPrices.entries()).find(([gid]) =>
          gid.endsWith(`/${li.variant_id}`),
        );
        const unit = match ? match[1].price : Number(li.price || 0);
        return sum + unit * li.quantity;
      }
      return sum + lineTotal(li);
    }, 0);
    const stickerSubtotal = stickerLineIndices.reduce(
      (sum, idx) => sum + lineTotal(lineItems[idx]),
      0,
    );

    // Custom Vinyl Stickers isn't a real Shopify product, so a sticker-scoped
    // code's minimum requirement (and its discount amount, below) is checked
    // against the stickers in this cart, not the whole order.
    const result = await lookupDiscountCode(
      discountCode,
      isStickerScopedCode(discountCode) ? stickerSubtotal : itemsSubtotal,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const d = result.discount;
    discountScopedToStickers = d.scope === "vinyl-sticker";

    if (discountScopedToStickers) {
      if (stickerLineIndices.length === 0) {
        return NextResponse.json(
          {
            error: `${d.code} only applies to Custom Vinyl Stickers — add one to your cart to use it.`,
          },
          { status: 400 },
        );
      }
      if (d.valueType === "percentage") {
        for (const idx of stickerLineIndices) {
          lineItems[idx].applied_discount = {
            description: d.code,
            title: d.title,
            value_type: "percentage",
            value: d.value.toString(),
          };
        }
      } else if (d.valueType === "fixed_amount") {
        // Split the flat amount across every sticker line, proportional to
        // each line's own share of the stickers subtotal, so multiple
        // sticker lines in one cart don't each get the full amount.
        const totalDiscount = Math.min(d.value, stickerSubtotal);
        for (const idx of stickerLineIndices) {
          const share =
            stickerSubtotal > 0
              ? (lineTotal(lineItems[idx]) / stickerSubtotal) * totalDiscount
              : 0;
          lineItems[idx].applied_discount = {
            description: d.code,
            title: d.title,
            value_type: "fixed_amount",
            value: share.toFixed(2),
          };
        }
      }
      // Free-shipping is inherently order-wide — nothing to scope at the
      // line level, so it falls through to the note below same as unscoped.
    } else if (d.valueType === "percentage") {
      appliedDiscount = {
        description: d.code,
        title: d.title,
        value_type: "percentage",
        value: d.value.toString(),
      };
    } else if (d.valueType === "fixed_amount") {
      appliedDiscount = {
        description: d.code,
        title: d.title,
        value_type: "fixed_amount",
        // Cap fixed amount to the subtotal so Shopify doesn't error.
        value: Math.min(d.value, itemsSubtotal).toFixed(2),
      };
    }
    // Free-shipping codes don't go in applied_discount — Shopify's checkout
    // handles those automatically once the code is also added to the order
    // note so Anthony sees which code applied.
  }

  const draftOrder = {
    draft_order: {
      email: orderEmail,
      line_items: lineItems,
      tags: "cart-checkout,custom-configurator",
      note: discountCode
        ? `Cart checkout · ${noteParts.join(" + ")} · Discount: ${discountCode.toUpperCase()}${discountScopedToStickers ? " (stickers only)" : ""}`
        : `Cart checkout · ${noteParts.join(" + ")}`,
      ...(appliedDiscount ? { applied_discount: appliedDiscount } : {}),
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
    draft_order: {
      id: number;
      invoice_url: string;
      total_price: string;
      line_items: Array<{ title: string; quantity: number }>;
    };
  };

  const invoiceUrl = normalizeInvoiceUrl(data.draft_order.invoice_url);
  await waitForInvoiceReady(invoiceUrl);

  // Build a compact summary the client can persist for guest order history
  // (localStorage) or pass straight to the account page.
  const orderSummary = {
    draftOrderId: data.draft_order.id,
    email: orderEmail,
    total: Number(data.draft_order.total_price),
    items: (data.draft_order.line_items || []).map((li) => ({
      title: li.title,
      quantity: li.quantity,
    })),
    invoiceUrl,
  };

  return NextResponse.json({
    invoiceUrl,
    draftOrderId: data.draft_order.id,
    order: orderSummary,
  });
}
