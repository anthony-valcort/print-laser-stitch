import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CustomerOrder } from "./customer-session";

const PAGE_WIDTH = 612; // US Letter, points (72 dpi)
const PAGE_HEIGHT = 792;
const MARGIN = 50;

function money(m: { amount: string; currencyCode: string } | null): string {
  if (!m) return "—";
  return `${Number(m.amount).toFixed(2)} ${m.currencyCode}`;
}

/**
 * Renders a simple one-page invoice PDF for a customer order. Shopify's
 * Storefront API has no ready-made "download invoice" endpoint for
 * customer-facing order history, so we build our own from the order data
 * already available via `getCurrentCustomerOrders()`.
 */
export async function buildInvoicePdf(
  order: CustomerOrder,
  shopName: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.05, 0.05, 0.05);
  const gray = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.85, 0.85, 0.85);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(shopName, { x: MARGIN, y, size: 20, font: bold, color: black });
  page.drawText("INVOICE", {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize("INVOICE", 14),
    y: y + 3,
    size: 14,
    font: bold,
    color: gray,
  });
  y -= 26;

  page.drawText(`Order #${order.orderNumber}`, {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: black,
  });
  const dateLabel = new Date(order.processedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(dateLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(dateLabel, 11),
    y,
    size: 11,
    font,
    color: gray,
  });
  y -= 30;

  // Shipping address block
  const addr = order.shippingAddress;
  if (addr) {
    page.drawText("Ship to", { x: MARGIN, y, size: 9, font: bold, color: gray });
    y -= 14;
    const addrLines = [
      addr.name,
      addr.address1,
      addr.address2,
      [addr.city, addr.province, addr.zip].filter(Boolean).join(", "),
      addr.country,
    ].filter((l): l is string => Boolean(l && l.trim()));
    for (const l of addrLines) {
      page.drawText(l, { x: MARGIN, y, size: 10, font, color: black });
      y -= 13;
    }
    y -= 10;
  }

  // Table header
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: line,
  });
  y -= 16;

  const colItem = MARGIN;
  const colQty = PAGE_WIDTH - MARGIN - 160;
  const colPrice = PAGE_WIDTH - MARGIN - 80;

  page.drawText("Item", { x: colItem, y, size: 9, font: bold, color: gray });
  page.drawText("Qty", { x: colQty, y, size: 9, font: bold, color: gray });
  page.drawText("Price", { x: colPrice, y, size: 9, font: bold, color: gray });
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: line,
  });
  y -= 16;

  for (const li of order.lineItems) {
    if (y < 120) break; // simple one-page invoice; excess items are truncated
    page.drawText(li.title.slice(0, 60), {
      x: colItem,
      y,
      size: 10,
      font,
      color: black,
    });
    if (li.variantTitle) {
      page.drawText(li.variantTitle.slice(0, 60), {
        x: colItem,
        y: y - 12,
        size: 8,
        font,
        color: gray,
      });
    }
    page.drawText(String(li.quantity), { x: colQty, y, size: 10, font, color: black });
    page.drawText(money(li.originalTotalPrice), {
      x: colPrice,
      y,
      size: 10,
      font,
      color: black,
    });
    y -= li.variantTitle ? 30 : 20;
  }

  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: line,
  });
  y -= 20;

  const totalsX = PAGE_WIDTH - MARGIN - 160;
  const totalsValX = PAGE_WIDTH - MARGIN - 80;

  const totalsRows: Array<[string, string]> = [
    ["Subtotal", money(order.subtotalPrice)],
    ["Shipping", money(order.totalShippingPrice)],
    ["Tax", money(order.totalTax)],
  ];
  for (const [label, value] of totalsRows) {
    page.drawText(label, { x: totalsX, y, size: 10, font, color: gray });
    page.drawText(value, { x: totalsValX, y, size: 10, font, color: black });
    y -= 16;
  }
  page.drawText("Total", { x: totalsX, y, size: 12, font: bold, color: black });
  page.drawText(money(order.totalPrice), {
    x: totalsValX,
    y,
    size: 12,
    font: bold,
    color: black,
  });

  return doc.save();
}
