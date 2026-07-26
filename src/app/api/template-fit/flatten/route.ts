import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadBufferToShopifyFiles } from "@/lib/shopify-files";
import { FLATTEN_DPI } from "@/lib/template-fit/constants";

type Rotation = 0 | 90 | 180 | 270;

type FlattenRequest = {
  /** Shopify CDN URL of the raw uploaded side image. */
  imageUrl: string;
  filename: string;
  /** Bleed-rectangle size, inches. */
  bleedWIn: number;
  bleedHIn: number;
  /** Final visual bounding-box width in inches, after rotation — same
   * contract as ImageTransform in src/lib/template-fit/flatten-to-canvas.ts. */
  widthIn: number;
  offsetXIn: number;
  offsetYIn: number;
  rotation?: Rotation;
  flipX?: boolean;
  flipY?: boolean;
};

/**
 * Server-side equivalent of src/lib/template-fit/flatten-to-canvas.ts, for
 * the mobile app — React Native has no DOM <canvas>, so the same "rasterize
 * the positioned design onto a print-resolution bleed rect" step Fit Studio
 * does client-side on web happens here instead, using sharp. Mobile sends
 * the same inches-based transform math the web studio computes locally; this
 * route must stay numerically identical to flatten-to-canvas.ts or the two
 * platforms' exports would silently diverge.
 */
export async function POST(req: NextRequest) {
  let body: FlattenRequest;
  try {
    body = (await req.json()) as FlattenRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageUrl, filename, bleedWIn, bleedHIn, widthIn, offsetXIn, offsetYIn } = body;
  if (!imageUrl || !filename || !bleedWIn || !bleedHIn || !widthIn) {
    return NextResponse.json(
      { error: "Missing fields: imageUrl, filename, bleedWIn, bleedHIn, widthIn" },
      { status: 400 },
    );
  }

  try {
    const sourceResp = await fetch(imageUrl);
    if (!sourceResp.ok) {
      throw new Error(`Could not fetch source image (${sourceResp.status})`);
    }
    const sourceBuffer = Buffer.from(await sourceResp.arrayBuffer());

    const meta = await sharp(sourceBuffer).metadata();
    const naturalWidth = meta.width;
    const naturalHeight = meta.height;
    if (!naturalWidth || !naturalHeight) {
      throw new Error("Could not read source image dimensions");
    }

    const rotation = body.rotation ?? 0;
    const rotated = rotation === 90 || rotation === 270;

    const effAspectHOverW = rotated
      ? naturalWidth / naturalHeight
      : naturalHeight / naturalWidth;
    const boundingWIn = widthIn;
    const boundingHIn = boundingWIn * effAspectHOverW;

    const ownWIn = rotated ? boundingHIn : boundingWIn;
    const ownHIn = rotated ? boundingWIn : boundingHIn;

    const ownWPx = Math.max(1, Math.round(ownWIn * FLATTEN_DPI));
    const ownHPx = Math.max(1, Math.round(ownHIn * FLATTEN_DPI));

    let pipeline = sharp(sourceBuffer).resize(ownWPx, ownHPx, { fit: "fill" });
    // Local-space order matters: flip (ctx.scale) happens before rotate
    // (ctx.rotate) in flatten-to-canvas.ts's transform composition.
    if (body.flipX) pipeline = pipeline.flop();
    if (body.flipY) pipeline = pipeline.flip();
    if (rotation !== 0) {
      pipeline = pipeline.rotate(rotation, { background: "#ffffff" });
    }
    const placedBuffer = await pipeline.png().toBuffer();
    const placedMeta = await sharp(placedBuffer).metadata();
    const placedW = placedMeta.width ?? ownWPx;
    const placedH = placedMeta.height ?? ownHPx;

    const canvasWPx = Math.round(bleedWIn * FLATTEN_DPI);
    const canvasHPx = Math.round(bleedHIn * FLATTEN_DPI);

    const centerXPx = (bleedWIn / 2 + offsetXIn) * FLATTEN_DPI;
    const centerYPx = (bleedHIn / 2 + offsetYIn) * FLATTEN_DPI;
    const left = Math.round(centerXPx - placedW / 2);
    const top = Math.round(centerYPx - placedH / 2);

    const finalBuffer = await sharp({
      create: {
        width: canvasWPx,
        height: canvasHPx,
        channels: 3,
        background: "#ffffff",
      },
    })
      .composite([{ input: placedBuffer, left, top }])
      .png()
      .toBuffer();

    const url = await uploadBufferToShopifyFiles(finalBuffer, filename, "image/png");
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not flatten design";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
