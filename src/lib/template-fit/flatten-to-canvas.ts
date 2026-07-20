import { FLATTEN_DPI } from "./constants";

/** Image placement in inches, relative to the bleed rectangle — resolution
 * independent, so the preview (CSS px) and the flattened export (print px at
 * FLATTEN_DPI) always agree regardless of screen size. */
export type ImageTransform = {
  /** Drawn width of the image, in inches (height follows the natural aspect ratio). */
  widthIn: number;
  /** Image center X, inches, relative to the bleed rect's center (0 = centered). */
  offsetXIn: number;
  offsetYIn: number;
  flipX?: boolean;
  flipY?: boolean;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the uploaded image"));
    img.src = url;
  });
}

/**
 * Renders the image at its current pan/zoom transform onto a canvas sized to
 * the bleed rectangle at print resolution, and returns it as a PNG blob —
 * this flattened image is what gets uploaded to Shopify Files as the final
 * production-ready design.
 */
export async function flattenToCanvas(
  imageUrl: string,
  bleedWIn: number,
  bleedHIn: number,
  transform: ImageTransform,
): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bleedWIn * FLATTEN_DPI);
  canvas.height = Math.round(bleedHIn * FLATTEN_DPI);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const aspect = img.naturalHeight / img.naturalWidth;
  const drawWIn = transform.widthIn;
  const drawHIn = drawWIn * aspect;

  const centerXIn = bleedWIn / 2 + transform.offsetXIn;
  const centerYIn = bleedHIn / 2 + transform.offsetYIn;

  const drawW = drawWIn * FLATTEN_DPI;
  const drawH = drawHIn * FLATTEN_DPI;

  ctx.save();
  ctx.translate(centerXIn * FLATTEN_DPI, centerYIn * FLATTEN_DPI);
  ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the flattened design"));
    }, "image/png");
  });
}

/** "Fill" (cover — no gaps, may crop) or "Fit" (contain — may letterbox) base
 * width for the image, in inches, before the customer's zoom multiplier. */
export function baseFitWidthIn(
  naturalWidth: number,
  naturalHeight: number,
  bleedWIn: number,
  bleedHIn: number,
  mode: "fill" | "fit",
): number {
  const scalePerPxW = bleedWIn / naturalWidth;
  const scalePerPxH = bleedHIn / naturalHeight;
  const scale = mode === "fill" ? Math.max(scalePerPxW, scalePerPxH) : Math.min(scalePerPxW, scalePerPxH);
  return naturalWidth * scale;
}
