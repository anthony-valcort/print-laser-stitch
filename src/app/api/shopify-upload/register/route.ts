import { type NextRequest, NextResponse } from "next/server";

const SHOPIFY_API_VERSION = "2026-04";

type RegisterRequest = {
  resourceUrl: string;
  filename: string;
  mimeType: string;
};

// The three shapes fileCreate/node can return, flattened into one type
// (only the fields matching the actual resolved type will be present).
type RawFileNode = {
  id: string;
  fileStatus: string;
  url?: string | null;
  image?: { url: string } | null;
  sources?: Array<{ url: string }>;
};

function extractFileUrl(node: {
  url?: string | null;
  image?: { url: string } | null;
  sources?: Array<{ url: string }>;
}): string | null {
  return node.url ?? node.image?.url ?? node.sources?.[0]?.url ?? null;
}

// A design upload is always a non-image/video file (PDF/AI/PNG treated as a
// plain document) and comes back as GenericFile. Gallery uploads can be an
// actual image or video, which Shopify classifies as MediaImage/Video
// instead — covered here too so this same route works for both.
const FILE_CREATE_MUTATION = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        ... on GenericFile {
          url
        }
        ... on MediaImage {
          image { url }
        }
        ... on Video {
          sources { url }
        }
      }
      userErrors { field message }
    }
  }
`;

const FILE_BY_ID_QUERY = `
  query fileById($id: ID!) {
    node(id: $id) {
      ... on GenericFile {
        fileStatus
        url
      }
      ... on MediaImage {
        fileStatus
        image { url }
      }
      ... on Video {
        fileStatus
        sources { url }
      }
    }
  }
`;

/**
 * Phase 2 of Shopify Files upload — register the file uploaded to staged
 * target with Shopify Files. Returns the permanent Shopify CDN URL once the
 * file finishes processing (polled briefly).
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

  let body: RegisterRequest;
  try {
    body = (await req.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.resourceUrl || !body.filename) {
    return NextResponse.json(
      { error: "Missing fields: resourceUrl, filename" },
      { status: 400 },
    );
  }

  const variables = {
    files: [
      {
        originalSource: body.resourceUrl,
        contentType: "FILE",
        alt: body.filename,
      },
    ],
  };

  const createResp = await callGraphQL(STORE, TOKEN, FILE_CREATE_MUTATION, variables);
  if (!createResp.ok) {
    return createResp.errorResponse;
  }
  const createData = createResp.data as {
    data?: {
      fileCreate?: {
        files?: RawFileNode[];
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    };
  };

  const result = createData.data?.fileCreate;
  if (result?.userErrors?.length) {
    return NextResponse.json(
      { error: result.userErrors[0].message },
      { status: 400 },
    );
  }

  const file = result?.files?.[0];
  if (!file) {
    return NextResponse.json(
      { error: "No file returned from fileCreate" },
      { status: 500 },
    );
  }

  // Poll until the file's permanent URL is ready (max ~6 seconds).
  let url = extractFileUrl(file);
  if (!url || file.fileStatus !== "READY") {
    url = await pollForReadyUrl(STORE, TOKEN, file.id);
  }

  if (!url) {
    return NextResponse.json(
      {
        error: "File registered but URL not ready in time. Try again.",
        fileId: file.id,
      },
      { status: 504 },
    );
  }

  return NextResponse.json({ fileId: file.id, url });
}

async function pollForReadyUrl(
  store: string,
  token: string,
  fileId: string,
): Promise<string | null> {
  const maxAttempts = 12;
  const delayMs = 500;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));

    const resp = await callGraphQL(store, token, FILE_BY_ID_QUERY, {
      id: fileId,
    });
    if (!resp.ok) continue;

    const node = (
      resp.data as {
        data?: {
          node?: {
            fileStatus?: string;
            url?: string | null;
            image?: { url: string } | null;
            sources?: Array<{ url: string }>;
          } | null;
        };
      }
    ).data?.node;

    const readyUrl = node ? extractFileUrl(node) : null;
    if (node?.fileStatus === "READY" && readyUrl) {
      return readyUrl;
    }
    if (node?.fileStatus === "FAILED") {
      return null;
    }
  }

  return null;
}

async function callGraphQL(
  store: string,
  token: string,
  query: string,
  variables: object,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; errorResponse: NextResponse }
> {
  const resp = await fetch(
    `https://${store}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    return {
      ok: false,
      errorResponse: NextResponse.json(
        {
          error: "Shopify GraphQL request failed",
          status: resp.status,
          details: text.slice(0, 500),
        },
        { status: 502 },
      ),
    } as const;
  }

  const data = (await resp.json()) as {
    errors?: Array<{ message: string }>;
  };
  if (data.errors?.length) {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: "GraphQL errors", details: data.errors },
        { status: 502 },
      ),
    } as const;
  }

  return { ok: true, data } as const;
}
