import { type NextRequest, NextResponse } from "next/server";

const SHOPIFY_API_VERSION = "2026-04";

type StageRequest = {
  filename: string;
  mimeType: string;
  fileSize: number;
};

const STAGE_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters { name value }
      }
      userErrors { field message }
    }
  }
`;

/**
 * Phase 1 of Shopify Files upload — request a staged upload target.
 * Browser will then POST the actual file directly to Shopify's GCS bucket
 * using the returned `url` and `parameters`. After upload completes, browser
 * calls /api/shopify-upload/register to register the file with Shopify Files.
 */
export async function POST(req: NextRequest) {
  const STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!STORE || !TOKEN) {
    return NextResponse.json(
      { error: "Server not configured: missing Shopify env vars" },
      { status: 500 },
    );
  }

  let body: StageRequest;
  try {
    body = (await req.json()) as StageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.filename || !body.mimeType || !body.fileSize) {
    return NextResponse.json(
      { error: "Missing fields: filename, mimeType, fileSize" },
      { status: 400 },
    );
  }

  // Always use FILE resource type — produces a GenericFile that gets a stable
  // URL right after fileCreate, no image-processing wait. Admin can click the
  // URL in the order to download the design.
  const variables = {
    input: [
      {
        filename: body.filename,
        mimeType: body.mimeType,
        httpMethod: "POST",
        resource: "FILE",
        fileSize: String(body.fileSize),
      },
    ],
  };

  const resp = await fetch(
    `https://${STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: STAGE_MUTATION, variables }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[shopify-upload/stage] HTTP", resp.status, text.slice(0, 500));
    return NextResponse.json(
      {
        error: "Shopify GraphQL request failed",
        status: resp.status,
        details: text.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as {
    data?: {
      stagedUploadsCreate?: {
        stagedTargets?: Array<{
          url: string;
          resourceUrl: string;
          parameters: Array<{ name: string; value: string }>;
        }>;
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    return NextResponse.json(
      { error: "GraphQL errors", details: data.errors },
      { status: 502 },
    );
  }

  const result = data.data?.stagedUploadsCreate;
  if (result?.userErrors?.length) {
    return NextResponse.json(
      { error: result.userErrors[0].message },
      { status: 400 },
    );
  }

  const target = result?.stagedTargets?.[0];
  if (!target) {
    return NextResponse.json(
      { error: "No staged upload target returned" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: target.url,
    resourceUrl: target.resourceUrl,
    parameters: target.parameters,
  });
}
