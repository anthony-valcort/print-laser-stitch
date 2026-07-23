/**
 * POST /api/admin/upload
 * Uploads an image to Shopify Files via staged upload and returns the CDN URL.
 * Requires: write_files scope on the Admin API token.
 */

import { type NextRequest, NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";

type RawFileNode = {
  id: string;
  fileStatus: string;
  image?: { url: string } | null;
};

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Step 1 — get staged upload target
  type StageData = {
    stagedUploadsCreate: {
      stagedTargets: {
        url: string;
        resourceUrl: string;
        parameters: { name: string; value: string }[];
      }[];
      userErrors: { message: string }[];
    };
  };

  const stageData = await shopifyAdminFetch<StageData>(
    `mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [{
        resource: "IMAGE",
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        httpMethod: "PUT",
      }],
    },
  );

  if (stageData.stagedUploadsCreate.userErrors.length) {
    return NextResponse.json(
      { error: stageData.stagedUploadsCreate.userErrors[0].message },
      { status: 400 },
    );
  }

  const target = stageData.stagedUploadsCreate.stagedTargets[0];
  if (!target) {
    return NextResponse.json({ error: "No upload target returned" }, { status: 500 });
  }

  // Step 2 — PUT file to the staged (temporary) target
  const uploadHeaders: Record<string, string> = {
    "Content-Type": file.type || "image/jpeg",
  };
  for (const { name, value } of target.parameters) {
    uploadHeaders[name] = value;
  }

  const uploadRes = await fetch(target.url, {
    method: "PUT",
    headers: uploadHeaders,
    body: buffer,
  });

  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadRes.status}` },
      { status: 502 },
    );
  }

  // Step 3 — register in Shopify Files, then wait for the *permanent* CDN
  // URL. `target.resourceUrl` (the temporary staging path used above) must
  // never be returned to the client — it's a short-lived reference that
  // Shopify discards once the file finishes processing, so anything saved
  // using it breaks a few days later even though the registered file itself
  // is fine.
  const createData = await shopifyAdminFetch<{
    fileCreate: {
      files: RawFileNode[];
      userErrors: { field: string; message: string }[];
    };
  }>(
    `mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id fileStatus ... on MediaImage { image { url } } }
        userErrors { field message }
      }
    }`,
    {
      files: [{
        originalSource: target.resourceUrl,
        contentType: "IMAGE",
        alt: file.name,
      }],
    },
  );

  if (createData.fileCreate.userErrors.length) {
    return NextResponse.json(
      { error: createData.fileCreate.userErrors[0].message },
      { status: 400 },
    );
  }

  const created = createData.fileCreate.files[0];
  if (!created) {
    return NextResponse.json(
      { error: "No file returned from fileCreate" },
      { status: 500 },
    );
  }

  let url = created.image?.url ?? null;
  if (!url || created.fileStatus !== "READY") {
    url = await pollForReadyUrl(created.id);
  }

  if (!url) {
    return NextResponse.json(
      {
        error: "File registered but URL not ready in time. Try again.",
        fileId: created.id,
      },
      { status: 504 },
    );
  }

  return NextResponse.json({ url });
}

async function pollForReadyUrl(fileId: string): Promise<string | null> {
  const maxAttempts = 12;
  const delayMs = 500;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));

    try {
      const data = await shopifyAdminFetch<{
        node: { fileStatus?: string; image?: { url: string } | null } | null;
      }>(
        `query fileById($id: ID!) {
          node(id: $id) {
            ... on MediaImage { fileStatus image { url } }
          }
        }`,
        { id: fileId },
      );
      const node = data.node;
      if (node?.fileStatus === "READY" && node.image?.url) return node.image.url;
      if (node?.fileStatus === "FAILED") return null;
    } catch {
      // transient error — keep polling until maxAttempts is exhausted
    }
  }

  return null;
}
