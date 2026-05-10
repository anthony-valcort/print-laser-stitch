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
      return NextResponse.json(
        {
          error:
            errors[0]?.message ?? "Invalid email or password",
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
