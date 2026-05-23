import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import {
  getCurrentSessionToken,
  setCustomerSession,
} from "@/lib/customer-session";

type UpdateBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

/**
 * Updates the logged-in customer's profile (name + phone) via the Storefront
 * `customerUpdate` mutation. Shopify may rotate the access token on update,
 * so we refresh the session cookie if a new one is returned.
 *
 * Email is intentionally not editable here — Shopify treats email changes as
 * sensitive (re-verification, marketing consent reset) so we leave that to
 * the merchant dashboard or a dedicated flow.
 */
export async function POST(req: NextRequest) {
  const token = await getCurrentSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Login required", loginRequired: true },
      { status: 401 },
    );
  }

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  // Phone is passed through as-typed. Shopify itself will reject malformed
  // numbers via `customerUserErrors`, which we surface back to the customer.
  const phone = body.phone?.trim() ?? "";

  if (!firstName) {
    return NextResponse.json(
      { error: "First name is required" },
      { status: 400 },
    );
  }

  try {
    type Resp = {
      customerUpdate: {
        customer: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
        } | null;
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
          customer { id firstName lastName phone }
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      {
        customerAccessToken: token,
        customer: {
          firstName,
          lastName,
          phone: phone === "" ? null : phone,
        },
      },
    );

    const errors = data.customerUpdate.customerUserErrors;
    if (errors.length || !data.customerUpdate.customer) {
      const first = errors[0];
      return NextResponse.json(
        { error: first?.message ?? "Could not update profile" },
        { status: 400 },
      );
    }

    // Shopify may issue a fresh token on customer updates — refresh cookie.
    const newToken = data.customerUpdate.customerAccessToken;
    if (newToken) {
      await setCustomerSession({
        token: newToken.accessToken,
        expiresAt: newToken.expiresAt,
      });
    }

    return NextResponse.json({
      ok: true,
      customer: data.customerUpdate.customer,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not update profile";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
