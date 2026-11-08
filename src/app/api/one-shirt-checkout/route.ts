import { type NextRequest, NextResponse } from "next/server";
import { normalizeInvoiceUrl, waitForInvoiceReady } from "@/lib/shopify-checkout";
import { isAllowedDesignUrl } from "@/lib/allowed-design-hosts";

// "One Shirt, No Minimum" — pay-first checkout. Builds a Shopify draft order
// (same pattern as /api/checkout-tshirt) and returns its invoice URL. The
// price is ALWAYS recomputed here; nothing the browser sends sets a price.

const GARMENTS = {
  cotton: { label: "Cotton T-shirt", base: 25, polo: false },
  performance: { label: "Performance T-shirt (polyester)", base: 25, polo: false },
  polo: { label: "Polo (printed, no embroidery)", base: 40, polo: true },
} as const;
type GarmentKey = keyof typeof GARMENTS;

const SIZES = ["S", "M", "L", "XL", "2XL"];
const RUSH_FEE = 15;

type SideIn = {
  fileUrl?: string;
  fileName?: string;
  mockupUrl?: string;
  widthIn?: number;
  heightIn?: number;
  quality?: string;
};
type Body = {
  garment: GarmentKey;
  long?: boolean;
  size: string;
  rush?: boolean;
  proof?: boolean; // true = send a proof first, false = print exactly as placed
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  front?: SideIn;
  back?: SideIn;
};

const clean = (s: unknown, max = 200) =>
  String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

export async function POST(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!STORE || !TOKEN) {
    return NextResponse.json({ error: "Checkout is not set up yet. Please call (772) 985-2854." }, { status: 500 });
  }

  let b: Body;
  try {
    b = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const g = GARMENTS[b.garment];
  if (!g) return NextResponse.json({ error: "Pick a shirt." }, { status: 400 });
  if (!SIZES.includes(b.size)) return NextResponse.json({ error: "Pick a size." }, { status: 400 });
  const long = !g.polo && !!b.long; // polos are short sleeve only
  const name = clean(b.name, 120);
  const email = clean(b.email, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please add your name and a good email." }, { status: 400 });
  }

  const sides: Array<["Front" | "Back", SideIn]> = [];
  if (b.front?.fileUrl) sides.push(["Front", b.front]);
  if (b.back?.fileUrl) sides.push(["Back", b.back]);
  if (sides.length === 0) {
    return NextResponse.json({ error: "Add a picture to the front or back first." }, { status: 400 });
  }
  for (const [, s] of sides) {
    for (const u of [s.fileUrl, s.mockupUrl]) {
      if (u && !isAllowedDesignUrl(u)) {
        return NextResponse.json({ error: "That upload could not be verified. Please try again." }, { status: 400 });
      }
    }
  }

  const price = g.base + (long ? 2 : 0) + (b.size === "2XL" ? 4 : 0);
  const sleeve = g.polo ? "short sleeve" : long ? "long sleeve" : "short sleeve";
  const wantsProof = b.proof !== false;
  const rush = !!b.rush;

  const areaName = (side: "Front" | "Back") =>
    side === "Back" ? "Full back" : g.polo ? "Left chest" : "Full front";

  const props: { name: string; value: string }[] = [
    { name: "Shirt", value: `Black ${g.label}, ${sleeve}` },
    { name: "Size", value: b.size },
    {
      name: "Proof",
      value: wantsProof
        ? "PROOF FIRST - do not print until customer approves"
        : "NO PROOF - customer approved placement, print exactly as shown",
    },
    { name: "Speed", value: rush ? "RUSH - guaranteed 2 business days" : "Standard" },
  ];
  for (const [side, s] of sides) {
    props.push({ name: `${side} print`, value: areaName(side) });
    if (s.widthIn && s.heightIn) {
      props.push({
        name: `${side} size`,
        value: `${Number(s.widthIn).toFixed(1)} x ${Number(s.heightIn).toFixed(1)} in`,
      });
    }
    if (s.quality) props.push({ name: `${side} art quality`, value: clean(s.quality, 80) });
    // Underscore = hidden from the customer's checkout, visible in admin.
    props.push({ name: `_${side} artwork file`, value: s.fileUrl! });
    if (s.fileName) props.push({ name: `_${side} file name`, value: clean(s.fileName, 120) });
    if (s.mockupUrl) props.push({ name: `_${side} mockup`, value: s.mockupUrl });
  }
  const phone = clean(b.phone, 40);
  if (phone) props.push({ name: "Phone", value: phone });
  const notes = clean(b.notes, 1000);
  if (notes) props.push({ name: "Notes", value: notes });

  const line_items: Array<Record<string, unknown>> = [
    {
      title: `One Shirt - Black ${g.label}, ${sleeve}, size ${b.size}`,
      price: price.toFixed(2),
      quantity: 1,
      taxable: true,
      requires_shipping: false,
      sku: "ONE-SHIRT",
      properties: props,
    },
  ];
  if (rush) {
    line_items.push({
      title: "Rush: guaranteed in 2 business days",
      price: RUSH_FEE.toFixed(2),
      quantity: 1,
      taxable: true,
      requires_shipping: false,
    });
  }

  const tags = [
    "one-shirt",
    "pickup",
    wantsProof ? "proof-first" : "no-proof",
    ...(rush ? ["RUSH-2-DAY"] : []),
  ].join(",");

  const total = price + (rush ? RUSH_FEE : 0);
  const draft = {
    draft_order: {
      email,
      line_items,
      tags,
      note: `ONE SHIRT | ${name} | ${wantsProof ? "PROOF FIRST" : "NO PROOF"}${rush ? " | RUSH 2 BUSINESS DAYS" : ""} | Pickup in Stuart | Total $${total.toFixed(2)}${phone ? ` | ${phone}` : ""}`,
      note_attributes: [
        { name: "Customer name", value: name },
        { name: "Proof", value: wantsProof ? "Proof first" : "No proof" },
        { name: "Rush", value: rush ? "Yes" : "No" },
      ],
    },
  };

  const resp = await fetch(`https://${STORE}/admin/api/2026-04/draft_orders.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!resp.ok) {
    console.error("[one-shirt-checkout] Shopify", resp.status, (await resp.text()).slice(0, 500));
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again or call (772) 985-2854." },
      { status: 502 },
    );
  }
  const data = (await resp.json()) as { draft_order: { id: number; invoice_url: string } };
  const invoiceUrl = normalizeInvoiceUrl(data.draft_order.invoice_url);
  await waitForInvoiceReady(invoiceUrl);
  return NextResponse.json({ invoiceUrl, total });
}
