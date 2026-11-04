import { shrinkBlobToUploadLimit } from "@/lib/shrink-image";

/**
 * Uploads a flattened design Blob (produced by flatten-to-canvas.ts) straight
 * to Cloudinary, reusing the same stage/register API routes that
 * UploadBox.tsx uses for raw customer uploads (see uploadDesign() there).
 */
export async function uploadFlattenedDesign(
  rawBlob: Blob,
  rawFilename: string,
): Promise<string> {
  // Print-resolution proofs can exceed the storage limit; fit them under it.
  const { blob, filename, mimeType } = await shrinkBlobToUploadLimit(rawBlob, rawFilename);
  const stageResp = await fetch("/api/shopify-upload/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      mimeType,
      fileSize: blob.size,
    }),
  });
  const stage = (await stageResp.json()) as
    | {
        url: string;
        resourceUrl: string;
        parameters: Array<{ name: string; value: string }>;
      }
    | { error: string };
  if (!stageResp.ok || "error" in stage) {
    throw new Error(
      "error" in stage ? stage.error : "Could not get upload target",
    );
  }

  const fd = new FormData();
  for (const param of stage.parameters) fd.append(param.name, param.value);
  fd.append("file", blob, filename);

  const uploadResp = await fetch(stage.url, { method: "POST", body: fd });
  if (!uploadResp.ok) {
    const text = await uploadResp.text().catch(() => "");
    throw new Error(`Upload to staging failed (${uploadResp.status}): ${text.slice(0, 200)}`);
  }

  const registerResp = await fetch("/api/shopify-upload/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceUrl: stage.resourceUrl,
      filename,
      mimeType,
    }),
  });
  const registered = (await registerResp.json()) as
    | { fileId: string; url: string }
    | { error: string };
  if (!registerResp.ok || "error" in registered) {
    throw new Error(
      "error" in registered ? registered.error : "Failed to register file",
    );
  }

  return registered.url;
}
