import crypto from "crypto";
import { NextResponse } from "next/server";

/**
 * Issues a short-lived signature so the browser can upload directly to
 * Cloudinary without our server proxying the file. Required env vars:
 *
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME       Cloudinary cloud name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET    name of a "Signed" upload preset
 *   CLOUDINARY_API_KEY                      from Cloudinary dashboard
 *   CLOUDINARY_API_SECRET                   from Cloudinary dashboard
 *
 * The browser POSTs FormData to
 *   https://api.cloudinary.com/v1_1/{cloudName}/auto/upload
 * with: file, api_key, timestamp, signature, upload_preset, folder
 */
export async function POST() {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!apiKey || !apiSecret || !cloudName || !uploadPreset) {
    return NextResponse.json(
      {
        error:
          "Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env vars.",
      },
      { status: 500 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "sticker-orders";

  // Cloudinary expects all params to be signed in alphabetical order,
  // joined by `&`, then appended with the API secret and SHA1-hashed.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}&upload_preset=${uploadPreset}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    uploadPreset,
    folder,
  });
}
