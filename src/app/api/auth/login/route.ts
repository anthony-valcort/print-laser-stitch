import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { setCustomerSession } from "@/lib/customer-session";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    type Resp = {
      customerAccessTokenCreate: {
        customerAccessToken: { accessToken: string; expiresAt: string } | null;
        customerUserErrors: Array<{ code: string; field: string[] | null; message: string }>;
      };
    };
    const data = await shopifyStorefrontFetch<Resp>(
      `mutation login($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      { input: { email, password } },
    );

    const errors = data.customerAccessTokenCreate.customerUserErrors;
    if (errors.length || !data.customerAccessTokenCreate.customerAccessToken) {
      // Shopify returns the same generic error for a wrong password AND for
      // accounts that exist but have no password yet — i.e. customers who
      // ordered as guests, were imported, or came from the old site and never
      // activated an account. Those can't password-log-in until they set one.
      // Surface an actionable message + a flag so the form shows the reset CTA.
      return NextResponse.json(
        {
          error:
            "We couldn't sign you in. If you've ordered with us before but never created a password (e.g. you checked out as a guest, or had an account on the old site), use “Forgot password?” to set one — then log in.",
          mayNeedPasswordSetup: true,
        },
        { status: 401 },
      );
    }

    const tok = data.customerAccessTokenCreate.customerAccessToken;
    await setCustomerSession({
      token: tok.accessToken,
      expiresAt: tok.expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
