import crypto from "crypto";

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
};

function cloudinaryCredentials(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Server not configured: missing Cloudinary env vars");
  }
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary requires every param except file/api_key/signature/resource_type
 * to be included in the signature, sorted alphabetically and SHA1-hashed with
 * the secret appended. */
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

function slugifyFilename(filename: string): string {
  const base = filename.replace(/\.[^./]+$/, "");
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "design";
}

/** We assign the public_id ourselves (rather than letting Cloudinary
 * generate one) so registerUploadedFile can look the asset up right after
 * the browser's direct upload finishes, without any extra round trip. */
function makePublicId(filename: string): string {
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  return `design-uploads/${slugifyFilename(filename)}-${stamp}-${rand}`;
}

/** Phase 1 — issue a signed Cloudinary upload target the browser can POST to
 * directly, bypassing our server for the actual file bytes. */
export async function createStagedUpload(filename: string): Promise<StagedTarget> {
  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = makePublicId(filename);
  const signature = signParams(
    { public_id: publicId, timestamp: String(timestamp) },
    apiSecret,
  );

  return {
    url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    resourceUrl: publicId,
    parameters: [
      { name: "api_key", value: apiKey },
      { name: "timestamp", value: String(timestamp) },
      { name: "signature", value: signature },
      { name: "public_id", value: publicId },
    ],
  };
}

const RESOURCE_TYPES = ["image", "raw", "video"] as const;

/** Phase 2 — Cloudinary's direct upload is synchronous (unlike Shopify
 * Files' async processing), so by the time the browser calls this the asset
 * already exists; look it up by the public_id assigned in phase 1 to get its
 * permanent, untransformed delivery URL. `auto/upload` files land under
 * image/raw/video depending on what Cloudinary detected, so check each. A
 * short retry loop covers the rare case the Admin API lags the upload. */
export async function registerUploadedFile(
  publicId: string,
  _filename: string,
): Promise<{ fileId: string; url: string }> {
  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  for (let attempt = 0; attempt < 6; attempt++) {
    for (const resourceType of RESOURCE_TYPES) {
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (resp.ok) {
        const data = (await resp.json()) as { secure_url?: string };
        if (data.secure_url) return { fileId: publicId, url: data.secure_url };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("File uploaded but could not be located in Cloudinary. Try again.");
}

/** Uploads a Buffer straight to Cloudinary in one signed request, for
 * server-generated files that don't come from a browser <input>. */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = makePublicId(filename);
  const signature = signParams(
    { public_id: publicId, timestamp: String(timestamp) },
    apiSecret,
  );

  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("public_id", publicId);

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: fd,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudinary upload failed (${resp.status}): ${text.slice(0, 500)}`);
  }
  const data = (await resp.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary upload succeeded but no secure_url returned");
  }
  return data.secure_url;
}
