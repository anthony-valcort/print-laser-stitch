/** Client-side proof engine orchestrator.
 *
 * load image → (optional) remove background → place on a 300-DPI canvas
 * (FILL/FIT + zoom) → base shape (traced contour or geometric) →
 * white-border offset → cutline offset → ProofResult.
 *
 * Everything runs in the browser; no server needed for the MVP.
 */

import { offsetPolygon } from "./offset";
import { buildShapePolygon } from "./shapes";
import { simplifyPolygon } from "./simplify";
import { traceAlphaContour } from "./trace-contour";
import {
  BORDER_IN,
  CUT_BLEED_IN,
  MIN_DPI,
  PRINT_DPI,
  type Polygon,
  type ProofResult,
  type ProofSettings,
} from "./types";

export type Fit = "fill" | "fit";

export type GenerateProofInput = {
  /** Original artwork (the File the customer picked). */
  file: Blob;
  settings: ProofSettings;
  fit: Fit;
  /** 1 = base scale; >1 zoom in. */
  zoom: number;
};

export type GenerateProofOutput = ProofResult & {
  artworkRect: { x: number; y: number; w: number; h: number };
};

/** Lazy — only pulled in (and the model fetched) when the customer actually
 * clicks "Remove background". */
export async function removeImageBackground(file: Blob): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file);
}

async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function drawRect(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  fit: Fit,
  zoom: number,
) {
  // FILL = cover the whole sticker (may crop edges).
  // FIT  = show the entire artwork inside the sticker with a comfortable
  //        margin — kept distinctly smaller than FILL so the toggle always
  //        produces a visible difference (even for a square image in a
  //        square sticker, where cover == contain mathematically).
  const FIT_MARGIN = 0.78;
  const base =
    fit === "fill"
      ? Math.max(canvasW / imgW, canvasH / imgH)
      : Math.min(canvasW / imgW, canvasH / imgH) * FIT_MARGIN;
  const scale = base * Math.max(0.2, zoom);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h };
}

export async function generateProof(
  input: GenerateProofInput,
): Promise<GenerateProofOutput> {
  const { file, settings, fit, zoom } = input;
  const dpi = PRINT_DPI;
  const widthPx = Math.max(1, Math.round(settings.widthIn * dpi));
  const heightPx = Math.max(1, Math.round(settings.heightIn * dpi));

  const bitmap = await toBitmap(file);
  const warnings: string[] = [];

  const effectiveDpi = Math.min(
    bitmap.width / settings.widthIn,
    bitmap.height / settings.heightIn,
  );
  const lowResolution = effectiveDpi < MIN_DPI;
  if (lowResolution) {
    warnings.push(
      `Artwork is ~${Math.round(effectiveDpi)} DPI at this size — below the ${MIN_DPI} DPI recommended for crisp printing.`,
    );
  }

  const rect = drawRect(
    bitmap.width,
    bitmap.height,
    widthPx,
    heightPx,
    fit,
    zoom,
  );

  // Compose the working canvas exactly as the customer will see it, so the
  // traced cutline matches the preview.
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available in this browser.");
  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h);

  const borderPx = BORDER_IN[settings.borderThickness] * dpi;
  const bleedPx = CUT_BLEED_IN * dpi;

  let baseShape: Polygon;
  if (settings.shape === "custom") {
    const imageData = ctx.getImageData(0, 0, widthPx, heightPx);
    const traced = traceAlphaContour(imageData);
    if (traced && traced.length >= 3) {
      baseShape = simplifyPolygon(traced, Math.max(1.5, widthPx * 0.0015));
    } else {
      // Opaque artwork (e.g. a JPG with no transparency and BG not removed):
      // fall back to the placed image's rectangle. A human still reviews.
      warnings.push(
        "No transparent edges found — using the artwork's outline. Tip: use Remove background or upload a transparent PNG for a true die-cut.",
      );
      baseShape = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.w, y: rect.y },
        { x: rect.x + rect.w, y: rect.y + rect.h },
        { x: rect.x, y: rect.y + rect.h },
      ];
    }
  } else {
    baseShape = buildShapePolygon(
      settings.shape,
      widthPx,
      heightPx,
      settings.roundedCorners,
      borderPx + bleedPx + 2,
    );
  }

  const whiteBorder = offsetPolygon(baseShape, borderPx);
  const cutline = offsetPolygon(whiteBorder, bleedPx);

  const imageDataUrl = canvas.toDataURL("image/png");

  return {
    widthPx,
    heightPx,
    dpi,
    imageDataUrl,
    baseShape,
    whiteBorder,
    cutline,
    lowResolution,
    warnings,
    artworkRect: { x: 0, y: 0, w: widthPx, h: heightPx },
  };
}

/** Rasterise a proof SVG string to a PNG blob (for upload + the order). */
export async function rasterizeSvgToPng(
  svg: string,
  widthPx: number,
  heightPx: number,
): Promise<Blob> {
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml" }),
  );
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterise proof."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available.");
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
