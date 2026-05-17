/** Turn proof polygons into SVG markup (preview + production cutline). */

import type { Polygon, ProofResult } from "./types";

export function pathD(poly: Polygon): string {
  if (poly.length === 0) return "";
  const head = `M ${poly[0].x.toFixed(2)} ${poly[0].y.toFixed(2)}`;
  let body = "";
  for (let i = 1; i < poly.length; i++) {
    body += ` L ${poly[i].x.toFixed(2)} ${poly[i].y.toFixed(2)}`;
  }
  return `${head}${body} Z`;
}

/** Full preview: white border, artwork clipped to the shape, cutline. */
export function buildProofSvg(
  result: ProofResult,
  artworkRect: { x: number; y: number; w: number; h: number },
  showCutline: boolean,
): string {
  const { widthPx, heightPx, imageDataUrl, baseShape, whiteBorder, cutline } =
    result;
  const cut = showCutline
    ? `<path d="${pathD(cutline)}" fill="none" stroke="#39e600" stroke-width="${Math.max(
        2,
        widthPx * 0.004,
      )}" stroke-dasharray="${widthPx * 0.014} ${widthPx * 0.01}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPx} ${heightPx}" width="${widthPx}" height="${heightPx}">
  <defs><clipPath id="pls-shape"><path d="${pathD(baseShape)}"/></clipPath></defs>
  <path d="${pathD(whiteBorder)}" fill="#ffffff"/>
  <g clip-path="url(#pls-shape)">
    <image href="${imageDataUrl}" x="${artworkRect.x.toFixed(2)}" y="${artworkRect.y.toFixed(
      2,
    )}" width="${artworkRect.w.toFixed(2)}" height="${artworkRect.h.toFixed(2)}" preserveAspectRatio="none"/>
  </g>
  ${cut}
</svg>`;
}

/** Standalone production cutline — its own layer, hairline stroke, imports
 * cleanly into FlexiSign / common print-and-cut workflows. */
export function buildCutlineSvg(result: ProofResult): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${result.widthPx} ${result.heightPx}" width="${result.widthPx}" height="${result.heightPx}">
  <g id="CutContour"><path d="${pathD(result.cutline)}" fill="none" stroke="#000000" stroke-width="1"/></g>
</svg>`;
}
