import { FLATTEN_DPI } from "./constants";

export type Rotation = 0 | 90 | 180 | 270;

/** Image placement in inches, relative to the bleed rectangle — resolution
 * independent, so the preview (CSS px) and the flattened export (print px at
 * FLATTEN_DPI) always agree regardless of screen size. */
export type ImageTransform = {
  /** Final visual bounding-box width in inches, *after* rotation (e.g. a
   * landscape photo rotated 90° has a portrait-shaped bounding box). */
  widthIn: number;
  /** Image center X, inches, relative to the bleed rect's center (0 = centered). */
  offsetXIn: number;
  offsetYIn: number;
  rotation?: Rotation;
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
 * Renders the image at its current pan/zoom/rotation transform onto a canvas
 * sized to the bleed rectangle at print resolution, and returns it as a PNG
 * blob — this flattened image is what gets uploaded to Cloudinary as the
 * final production-ready design.
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

  const rotation = transform.rotation ?? 0;
  const rotated = rotation === 90 || rotation === 270;

  // At 90°/270°, the bounding box's height comes from the *swapped* aspect
  // ratio (a wide image rotated a quarter-turn reads as tall on screen).
  const effAspectHOverW = rotated
    ? img.naturalWidth / img.naturalHeight
    : img.naturalHeight / img.naturalWidth;
  const boundingWIn = transform.widthIn;
  const boundingHIn = boundingWIn * effAspectHOverW;

  // The image's *own* (pre-rotation) draw dimensions — swapped back so that
  // after ctx.rotate() it lands on the intended bounding box.
  const ownWIn = rotated ? boundingHIn : boundingWIn;
  const ownHIn = rotated ? boundingWIn : boundingHIn;

  const centerXIn = bleedWIn / 2 + transform.offsetXIn;
  const centerYIn = bleedHIn / 2 + transform.offsetYIn;
  const ownWPx = ownWIn * FLATTEN_DPI;
  const ownHPx = ownHIn * FLATTEN_DPI;

  ctx.save();
  ctx.translate(centerXIn * FLATTEN_DPI, centerYIn * FLATTEN_DPI);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
  ctx.drawImage(img, -ownWPx / 2, -ownHPx / 2, ownWPx, ownHPx);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the flattened design"));
    }, "image/png");
  });
}

/** "Fill" (cover — no gaps, may crop) or "Fit" (contain — may letterbox) base
 * width for the image, in inches, before the customer's zoom multiplier.
 * Pass rotation-adjusted (width, height) — see effectiveNaturalSize(). */
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

/** Swaps width/height for a 90°/270° rotation — the *visual* aspect ratio a
 * fit/fill calculation should scale against once the image is rotated. */
export function effectiveNaturalSize(
  naturalWidth: number,
  naturalHeight: number,
  rotation: Rotation,
): { width: number; height: number } {
  return rotation === 90 || rotation === 270
    ? { width: naturalHeight, height: naturalWidth }
    : { width: naturalWidth, height: naturalHeight };
}
