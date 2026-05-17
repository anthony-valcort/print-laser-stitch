/** Geometric base shapes (circle / oval / square / rectangle).
 *
 * For non-custom shapes the sticker is cut to the shape itself, so we just
 * build the polygon from the canvas geometry. Square & rectangle support
 * rounded corners (None / Soft / Medium / Heavy).
 */

import {
  CORNER_FRACTION,
  type Polygon,
  type ProofShape,
  type RoundedCorners,
} from "./types";

const ARC_STEPS = 28;

export function buildShapePolygon(
  shape: ProofShape,
  widthPx: number,
  heightPx: number,
  rounded: RoundedCorners,
  insetPx: number,
): Polygon {
  const x0 = insetPx;
  const y0 = insetPx;
  const x1 = widthPx - insetPx;
  const y1 = heightPx - insetPx;
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  if (shape === "circle" || shape === "oval") {
    const rx = w / 2;
    const ry = shape === "oval" ? h / 2 : rx;
    const steps = ARC_STEPS * 3;
    const pts: Polygon = [];
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
    }
    return pts;
  }

  // square / rectangle
  const radius = Math.min(w, h) * (CORNER_FRACTION[rounded] ?? 0);
  if (radius <= 0.5) {
    return [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ];
  }
  return roundedRect(x0, y0, x1, y1, radius);
}

function roundedRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
): Polygon {
  // Corner arc centres + start angles (clockwise from bottom-right).
  const corners: [number, number, number][] = [
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
    [x0 + r, y0 + r, Math.PI],
    [x1 - r, y0 + r, (3 * Math.PI) / 2],
  ];
  const pts: Polygon = [];
  for (const [ccx, ccy, start] of corners) {
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = start + (i / ARC_STEPS) * (Math.PI / 2);
      pts.push({ x: ccx + r * Math.cos(a), y: ccy + r * Math.sin(a) });
    }
  }
  return pts;
}
