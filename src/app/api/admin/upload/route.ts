/**
 * POST /api/admin/upload
 * Uploads an image to Shopify Files via staged upload and returns the CDN URL.
 * Requires: write_files scope on the Admin API token.
 */

import { type NextRequest, NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";

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

  // Step 2 — PUT file to S3
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

  // Step 3 — register in Shopify Files (fire-and-forget)
  await shopifyAdminFetch(
    `mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
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
  ).catch(() => {});

  return NextResponse.json({ url: target.resourceUrl });
}
