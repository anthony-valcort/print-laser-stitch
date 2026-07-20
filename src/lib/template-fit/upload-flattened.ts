/**
 * Uploads a flattened design Blob (produced by flatten-to-canvas.ts) straight
 * to Shopify Files, reusing the same stage/register API routes that
 * UploadBox.tsx uses for raw customer uploads (see uploadDesign() there).
 */
export async function uploadFlattenedDesign(
  blob: Blob,
  filename: string,
): Promise<string> {
  const stageResp = await fetch("/api/shopify-upload/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      mimeType: "image/png",
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
    throw new Error(`Upload to staging failed (${uploadResp.status})`);
  }

  const registerResp = await fetch("/api/shopify-upload/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceUrl: stage.resourceUrl,
      filename,
      mimeType: "image/png",
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
