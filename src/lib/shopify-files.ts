const SHOPIFY_API_VERSION = "2026-04";

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
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

function shopifyCredentials(): { store: string; token: string } {
  const store = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!store || !token) {
    throw new Error("Server not configured: missing Shopify env vars");
  }
  return { store, token };
}

async function callGraphQL(
  store: string,
  token: string,
  query: string,
  variables: object,
): Promise<{ data?: unknown; errors?: Array<{ message: string }> }> {
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
    throw new Error(
      `Shopify GraphQL request failed (${resp.status}): ${text.slice(0, 500)}`,
    );
  }

  const data = (await resp.json()) as {
    data?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (data.errors?.length) {
    throw new Error(`GraphQL errors: ${data.errors.map((e) => e.message).join("; ")}`);
  }
  return data;
}

/** Phase 1 — request a staged upload target from Shopify. */
export async function createStagedUpload(
  filename: string,
  mimeType: string,
  fileSize: number,
): Promise<StagedTarget> {
  const { store, token } = shopifyCredentials();

  const variables = {
    input: [
      {
        filename,
        mimeType,
        httpMethod: "POST",
        resource: "FILE",
        fileSize: String(fileSize),
      },
    ],
  };

  const data = (await callGraphQL(store, token, STAGE_MUTATION, variables)) as {
    data?: {
      stagedUploadsCreate?: {
        stagedTargets?: StagedTarget[];
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    };
  };

  const result = data.data?.stagedUploadsCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }
  const target = result?.stagedTargets?.[0];
  if (!target) {
    throw new Error("No staged upload target returned");
  }
  return target;
}

/** Phase 2 — register the file uploaded to the staged target with Shopify
 * Files, polling briefly until its permanent CDN URL is ready. */
export async function registerUploadedFile(
  resourceUrl: string,
  filename: string,
): Promise<{ fileId: string; url: string }> {
  const { store, token } = shopifyCredentials();

  const variables = {
    files: [{ originalSource: resourceUrl, contentType: "FILE", alt: filename }],
  };

  const createData = (await callGraphQL(
    store,
    token,
    FILE_CREATE_MUTATION,
    variables,
  )) as {
    data?: {
      fileCreate?: {
        files?: RawFileNode[];
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    };
  };

  const result = createData.data?.fileCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }
  const file = result?.files?.[0];
  if (!file) {
    throw new Error("No file returned from fileCreate");
  }

  let url = extractFileUrl(file);
  if (!url || file.fileStatus !== "READY") {
    url = await pollForReadyUrl(store, token, file.id);
  }
  if (!url) {
    throw new Error("File registered but URL not ready in time. Try again.");
  }
  return { fileId: file.id, url };
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

    let data: { data?: { node?: unknown } };
    try {
      data = (await callGraphQL(store, token, FILE_BY_ID_QUERY, { id: fileId })) as {
        data?: { node?: unknown };
      };
    } catch {
      continue;
    }

    const node = data.data?.node as
      | {
          fileStatus?: string;
          url?: string | null;
          image?: { url: string } | null;
          sources?: Array<{ url: string }>;
        }
      | null
      | undefined;

    const readyUrl = node ? extractFileUrl(node) : null;
    if (node?.fileStatus === "READY" && readyUrl) return readyUrl;
    if (node?.fileStatus === "FAILED") return null;
  }

  return null;
}

/** Uploads a Buffer straight to Shopify Files (stage → raw POST → register),
 * for server-generated files that don't come from a browser <input>. */
export async function uploadBufferToShopifyFiles(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const staged = await createStagedUpload(filename, mimeType, buffer.byteLength);

  const fd = new FormData();
  for (const param of staged.parameters) fd.append(param.name, param.value);
  fd.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename,
  );

  const uploadResp = await fetch(staged.url, { method: "POST", body: fd });
  if (!uploadResp.ok) {
    throw new Error(`Upload to staging failed (${uploadResp.status})`);
  }

  const registered = await registerUploadedFile(staged.resourceUrl, filename);
  return registered.url;
}
