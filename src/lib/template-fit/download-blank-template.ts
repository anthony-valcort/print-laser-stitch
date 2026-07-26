import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { BLEED_IN, SAFE_IN } from "./constants";

const PT_PER_IN = 72;
/** Extra page padding around the bleed rectangle so crop marks + the header
 * label aren't clipped at the page edge. */
const CROP_MARGIN_IN = 0.2;
const HEADER_IN = 0.5;

function drawDashedLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: ReturnType<typeof rgb>,
  thickness: number,
  dash = 4,
  gap = 3,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return;
  const steps = Math.max(1, Math.floor(length / (dash + gap)));
  const ux = dx / length;
  const uy = dy / length;
  for (let i = 0; i < steps; i++) {
    const start = i * (dash + gap);
    const end = Math.min(start + dash, length);
    page.drawLine({
      start: { x: x1 + ux * start, y: y1 + uy * start },
      end: { x: x1 + ux * end, y: y1 + uy * end },
      thickness,
      color,
    });
  }
}

function drawDashedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>,
) {
  drawDashedLine(page, x, y, x + w, y, color, 1);
  drawDashedLine(page, x + w, y, x + w, y + h, color, 1);
  drawDashedLine(page, x + w, y + h, x, y + h, color, 1);
  drawDashedLine(page, x, y + h, x, y, color, 1);
}

/**
 * Builds a vector PDF print guide (bleed / trim / safe lines + crop marks)
 * for the given size. Pure — no DOM/browser APIs — so it runs the same way
 * client-side (web's direct download) or server-side (the mobile app's
 * /api/template-fit/blank-template route, since React Native has no
 * Blob/anchor-download mechanism to trigger a save the way a browser does).
 */
export async function buildBlankTemplatePdfBytes(
  widthIn: number,
  heightIn: number,
  sizeLabel: string,
  productTitle: string,
  bleedIn: number = BLEED_IN,
): Promise<Uint8Array> {
  const bleedWIn = widthIn + 2 * bleedIn;
  const bleedHIn = heightIn + 2 * bleedIn;
  const pageWIn = bleedWIn + 2 * CROP_MARGIN_IN;
  const pageHIn = bleedHIn + 2 * CROP_MARGIN_IN + HEADER_IN;

  const doc = await PDFDocument.create();
  const page = doc.addPage([pageWIn * PT_PER_IN, pageHIn * PT_PER_IN]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.1, 0.1, 0.1);
  const red = rgb(0.85, 0.15, 0.15);
  const green = rgb(0.15, 0.6, 0.25);
  const gray = rgb(0.4, 0.4, 0.4);

  const pageHPt = pageHIn * PT_PER_IN;

  page.drawText(`${productTitle} — ${sizeLabel}`, {
    x: CROP_MARGIN_IN * PT_PER_IN,
    y: pageHPt - HEADER_IN * PT_PER_IN * 0.55,
    size: 12,
    font: bold,
    color: black,
  });
  page.drawText(
    bleedIn > 0
      ? `Final Cut Size: ${widthIn}" x ${heightIn}"   ·   Artwork with Bleed: ${bleedWIn.toFixed(3)}" x ${bleedHIn.toFixed(3)}"`
      : `Finished Size: ${widthIn}" x ${heightIn}"`,
    {
      x: CROP_MARGIN_IN * PT_PER_IN,
      y: pageHPt - HEADER_IN * PT_PER_IN * 0.95,
      size: 9,
      font,
      color: gray,
    },
  );

  // Diagram origin — bottom-left corner of the bleed rectangle.
  const originX = CROP_MARGIN_IN * PT_PER_IN;
  const originY = CROP_MARGIN_IN * PT_PER_IN;
  const bleedWPt = bleedWIn * PT_PER_IN;
  const bleedHPt = bleedHIn * PT_PER_IN;
  const bleedInsetPt = bleedIn * PT_PER_IN;
  const safeInsetPt = SAFE_IN * PT_PER_IN;

  // Bleed line (red, dashed) — skipped for products with no bleed step
  // (e.g. Banners, finished at the ordered size with no die-cut margin).
  if (bleedIn > 0) {
    drawDashedRect(page, originX, originY, bleedWPt, bleedHPt, red);
  }

  // Trim / final cut line (black, solid) — inset from bleed
  const trimX = originX + bleedInsetPt;
  const trimY = originY + bleedInsetPt;
  const trimWPt = widthIn * PT_PER_IN;
  const trimHPt = heightIn * PT_PER_IN;
  page.drawRectangle({
    x: trimX,
    y: trimY,
    width: trimWPt,
    height: trimHPt,
    borderColor: black,
    borderWidth: 1.2,
  });

  // Safe line (green, dashed) — inset further from trim
  drawDashedRect(
    page,
    trimX + safeInsetPt,
    trimY + safeInsetPt,
    trimWPt - 2 * safeInsetPt,
    trimHPt - 2 * safeInsetPt,
    green,
  );

  // Corner crop marks, aligned to the trim corners
  const markLen = 12;
  const corners = [
    { x: trimX, y: trimY },
    { x: trimX + trimWPt, y: trimY },
    { x: trimX, y: trimY + trimHPt },
    { x: trimX + trimWPt, y: trimY + trimHPt },
  ];
  for (const c of corners) {
    page.drawLine({
      start: { x: c.x - markLen, y: c.y },
      end: { x: c.x + markLen, y: c.y },
      thickness: 0.75,
      color: black,
    });
    page.drawLine({
      start: { x: c.x, y: c.y - markLen },
      end: { x: c.x, y: c.y + markLen },
      thickness: 0.75,
      color: black,
    });
  }

  if (bleedIn > 0) {
    page.drawText("Bleed Line", {
      x: originX + 4,
      y: originY + bleedHPt - 12,
      size: 7,
      font,
      color: red,
    });
  }
  page.drawText("Safe Line", {
    x: trimX + safeInsetPt + 4,
    y: trimY + trimHPt - safeInsetPt - 12,
    size: 7,
    font,
    color: green,
  });

  return doc.save();
}

export function blankTemplateFilename(sizeLabel: string): string {
  const slug = sizeLabel.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `template-${slug}.pdf`;
}

/**
 * Builds the PDF (see buildBlankTemplatePdfBytes) and triggers a browser
 * download — entirely client-side, no server round-trip needed since it's
 * just static shapes and text.
 */
export async function downloadBlankTemplate(
  widthIn: number,
  heightIn: number,
  sizeLabel: string,
  productTitle: string,
  bleedIn: number = BLEED_IN,
): Promise<void> {
  const bytes = await buildBlankTemplatePdfBytes(
    widthIn,
    heightIn,
    sizeLabel,
    productTitle,
    bleedIn,
  );
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = blankTemplateFilename(sizeLabel);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
