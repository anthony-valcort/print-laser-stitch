import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { setCustomerSession } from "@/lib/customer-session";

type ActivateBody = {
  /** Numeric customer id from the activation URL path. */
  id?: string;
  /** Activation token from the URL path (e.g. "abc123...-1779467037"). */
  token?: string;
  password?: string;
};

/**
 * Completes a new-customer activation. Shopify's "Customer account
 * activation" email links to `/account/activate/{customerId}/{token}` on our
 * domain — this route takes those path values + the password the user picks
 * and calls the Storefront `customerActivate` mutation. On success Shopify
 * returns a fresh access token, so we log the customer straight in.
 */
export async function POST(req: NextRequest) {
  let body: ActivateBody;
  try {
    body = (await req.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawId = body.id?.trim();
  const activationToken = body.token?.trim();
  const password = body.password;

  if (!rawId || !activationToken || !password) {
    return NextResponse.json(
      {
        error:
          "Activation link is incomplete. Please use the link from your activation email.",
      },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // The path carries the numeric id; the Storefront API needs the GID form.
  const id = rawId.startsWith("gid://")
    ? rawId
    : `gid://shopify/Customer/${rawId}`;

  try {
    type Resp = {
      customerActivate: {
        customer: { id: string } | null;
        customerAccessToken: {
          accessToken: string;
          expiresAt: string;
        } | null;
        customerUserErrors: Array<{
          code: string;
          field: string[] | null;
          message: string;
        }>;
      };
    };
    const data = await shopifyStorefrontFetch<Resp>(
      `mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
        customerActivate(id: $id, input: $input) {
          customer { id }
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      { id, input: { activationToken, password } },
    );

    const errors = data.customerActivate.customerUserErrors;
    if (errors.length || !data.customerActivate.customerAccessToken) {
      const first = errors[0];
      let msg =
        first?.message ??
        "This activation link is invalid or has expired. Ask the store to resend the invite.";
      if (
        first?.code === "TOKEN_INVALID" ||
        first?.code === "INVALID" ||
        first?.code === "ALREADY_ENABLED"
      ) {
        msg =
          first.code === "ALREADY_ENABLED"
            ? "This account is already active — please log in instead."
            : "This activation link is invalid or has expired. Ask the store to resend the invite.";
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const tok = data.customerActivate.customerAccessToken;
    await setCustomerSession({
      token: tok.accessToken,
      expiresAt: tok.expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not activate account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
