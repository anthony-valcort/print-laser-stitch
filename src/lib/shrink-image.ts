/**
 * Keeps design uploads under the storage provider's per-image limit.
 *
 * Cloudinary rejects any single image over 10 MB (10,485,760 bytes) on our
 * plan, and print-resolution proofs for posters and banners easily exceed
 * that. Instead of failing the customer's order, an oversized raster image is
 * re-encoded here, in the browser, until it fits:
 *   - opaque images  -> high-quality JPEG (same pixel size, so no sharpness
 *     is lost), then scaled down in steps only if still too big
 *   - transparent images (logos, stickers) -> PNG, scaled down in steps, so
 *     the transparency is never replaced by a white background
 * Files that already fit, and non-image files (PDF, SVG, AI), pass through
 * untouched.
 */

/** A little under Cloudinary's 10,485,760-byte limit, for headroom. */
export const SAFE_UPLOAD_BYTES = 9.5 * 1024 * 1024;

const SHRINKABLE = new Set(["image/png", "image/jpeg", "image/webp"]);

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
  } finally {
    // The decoded <img> keeps its pixels after the URL is released.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function dims(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ("naturalWidth" in src) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

/** True if any part of the image is see-through. Samples a small downscaled
 * copy so it stays fast on very large images. */
function hasTransparency(src: ImageBitmap | HTMLImageElement, w: number, h: number): boolean {
  const s = Math.min(1, 256 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return true; // can't tell, so keep transparency safe
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

function renamed(name: string, ext: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base}.${ext}`;
}

/** Returns the same file if it already fits (or can't be shrunk), otherwise
 * a smaller re-encoded copy. Never throws: on any failure the original is
 * returned and the upload proceeds as before. */
export async function shrinkToUploadLimit(file: File): Promise<File> {
  try {
    if (file.size <= SAFE_UPLOAD_BYTES) return file;
    const type = file.type || "";
    if (!SHRINKABLE.has(type)) return file;

    const src = await loadBitmap(file);
    const { w, h } = dims(src);
    if (!w || !h) return file;

    const transparent = hasTransparency(src, w, h);
    const mime = transparent ? "image/png" : "image/jpeg";
    const ext = transparent ? "png" : "jpg";
    // Opaque: try full size at two JPEG qualities, then step down the size.
    // Transparent: PNG has no quality knob, so only step down the size.
    const plan: Array<{ scale: number; quality?: number }> = transparent
      ? [0.85, 0.7, 0.55, 0.42, 0.32, 0.24, 0.18].map((scale) => ({ scale }))
      : [
          { scale: 1, quality: 0.92 },
          { scale: 1, quality: 0.82 },
          { scale: 0.8, quality: 0.85 },
          { scale: 0.62, quality: 0.85 },
          { scale: 0.48, quality: 0.85 },
          { scale: 0.36, quality: 0.85 },
          { scale: 0.26, quality: 0.85 },
        ];

    let canvas: HTMLCanvasElement | null = null;
    let lastScale = -1;
    for (const step of plan) {
      if (!canvas || step.scale !== lastScale) {
        canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * step.scale));
        canvas.height = Math.max(1, Math.round(h * step.scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        if (!transparent) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
        lastScale = step.scale;
      }
      const blob = await toBlob(canvas, mime, step.quality);
      if (blob && blob.size <= SAFE_UPLOAD_BYTES) {
        return new File([blob], renamed(file.name, ext), { type: mime });
      }
    }
    return file;
  } catch {
    return file;
  }
}

/** Same as shrinkToUploadLimit, for a Blob that has no name of its own. */
export async function shrinkBlobToUploadLimit(
  blob: Blob,
  filename: string,
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const out = await shrinkToUploadLimit(
    new File([blob], filename, { type: blob.type || "application/octet-stream" }),
  );
  return { blob: out, filename: out.name, mimeType: out.type || blob.type };
}
