import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { setCustomerSession } from "@/lib/customer-session";

type SignupBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptsMarketing?: boolean;
};

export async function POST(req: NextRequest) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const firstName = body.firstName?.trim() || undefined;
  const lastName = body.lastName?.trim() || undefined;
  const phoneRaw = body.phone?.trim() || undefined;
  const phone = phoneRaw && phoneRaw.startsWith("+") ? phoneRaw : undefined;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    // Step 1: create customer
    type CreateResp = {
      customerCreate: {
        customer: { id: string } | null;
        customerUserErrors: Array<{ code: string; field: string[] | null; message: string }>;
      };
    };
    const createData = await shopifyStorefrontFetch<CreateResp>(
      `mutation signup($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer { id }
          customerUserErrors { code field message }
        }
      }`,
      {
        input: {
          email,
          password,
          firstName,
          lastName,
          phone,
          acceptsMarketing: Boolean(body.acceptsMarketing),
        },
      },
    );

    const createErrors = createData.customerCreate.customerUserErrors;
    if (createErrors.length || !createData.customerCreate.customer) {
      const first = createErrors[0];
      let msg = first?.message ?? "Could not create account";
      if (first?.code === "TAKEN") {
        msg = "An account with this email already exists. Try logging in.";
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Step 2: log them in immediately
    type TokenResp = {
      customerAccessTokenCreate: {
        customerAccessToken: { accessToken: string; expiresAt: string } | null;
        customerUserErrors: Array<{ code: string; field: string[] | null; message: string }>;
      };
    };
    const tokenData = await shopifyStorefrontFetch<TokenResp>(
      `mutation login($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { code field message }
        }
      }`,
      { input: { email, password } },
    );

    const tokenErrors = tokenData.customerAccessTokenCreate.customerUserErrors;
    if (
      tokenErrors.length ||
      !tokenData.customerAccessTokenCreate.customerAccessToken
    ) {
      // Account was created but auto-login failed — tell them to login manually
      return NextResponse.json(
        {
          ok: true,
          requiresManualLogin: true,
          message: "Account created. Please log in.",
        },
        { status: 200 },
      );
    }

    const tok = tokenData.customerAccessTokenCreate.customerAccessToken;
    await setCustomerSession({
      token: tok.accessToken,
      expiresAt: tok.expiresAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
