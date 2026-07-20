import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import {
  getCurrentSessionToken,
  setCustomerSession,
} from "@/lib/customer-session";

type ChangePasswordBody = {
  password?: string;
};

/**
 * Updates the logged-in customer's password via the Storefront
 * `customerUpdate` mutation. The current session's `customerAccessToken`
 * already proves the customer is authenticated, so — same as Shopify's own
 * account UI — we don't ask for the old password. Shopify may rotate the
 * access token on update, so we refresh the session cookie if a new one is
 * returned (mirrors /api/auth/update-profile).
 */
export async function POST(req: NextRequest) {
  const token = await getCurrentSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Login required", loginRequired: true },
      { status: 401 },
    );
  }

  let body: ChangePasswordBody;
  try {
    body = (await req.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (password.length < 5) {
    return NextResponse.json(
      { error: "Password must be at least 5 characters." },
      { status: 400 },
    );
  }

  try {
    type Resp = {
      customerUpdate: {
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
      `mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer { id }
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      {
        customerAccessToken: token,
        customer: { password },
      },
    );

    const errors = data.customerUpdate.customerUserErrors;
    if (errors.length || !data.customerUpdate.customer) {
      const first = errors[0];
      return NextResponse.json(
        { error: first?.message ?? "Could not update password" },
        { status: 400 },
      );
    }

    // Shopify issues a fresh token whenever the password changes — the old
    // one is invalidated, so this refresh is required, not just cosmetic.
    const newToken = data.customerUpdate.customerAccessToken;
    if (newToken) {
      await setCustomerSession({
        token: newToken.accessToken,
        expiresAt: newToken.expiresAt,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not update password";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
