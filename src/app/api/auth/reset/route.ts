import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { setCustomerSession } from "@/lib/customer-session";

type ResetBody = {
  /** Numeric customer id from the reset URL path. */
  id?: string;
  /** Reset token from the reset URL path (e.g. "abc123-1779162447"). */
  token?: string;
  password?: string;
};

/**
 * Completes a password reset. Shopify's "Customer account password reset"
 * email links to `/account/reset/{customerId}/{token}` on our domain; this
 * route takes those path values + a new password and calls the Storefront
 * `customerReset` mutation. On success Shopify returns a fresh access token,
 * so we log the customer straight in.
 */
export async function POST(req: NextRequest) {
  let body: ResetBody;
  try {
    body = (await req.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawId = body.id?.trim();
  const resetToken = body.token?.trim();
  const password = body.password;

  if (!rawId || !resetToken || !password) {
    return NextResponse.json(
      { error: "Reset link is incomplete. Request a new password reset." },
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
      customerReset: {
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
      `mutation customerReset($id: ID!, $input: CustomerResetInput!) {
        customerReset(id: $id, input: $input) {
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      { id, input: { resetToken, password } },
    );

    const errors = data.customerReset.customerUserErrors;
    if (errors.length || !data.customerReset.customerAccessToken) {
      const first = errors[0];
      let msg =
        first?.message ??
        "This reset link is invalid or has expired. Request a new one.";
      if (first?.code === "TOKEN_INVALID" || first?.code === "INVALID") {
        msg =
          "This reset link is invalid or has expired. Request a new one.";
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const tok = data.customerReset.customerAccessToken;
    await setCustomerSession({
      token: tok.accessToken,
      expiresAt: tok.expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not reset password";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
