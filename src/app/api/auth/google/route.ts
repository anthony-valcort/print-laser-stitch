import { type NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { setCustomerSession } from "@/lib/customer-session";
import {
  findCustomerByEmail,
  generateRandomPassword,
  getGoogleManagedPassword,
  setGoogleManagedPassword,
} from "@/lib/google-auth-customer";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type TokenResp = {
  customerAccessTokenCreate: {
    customerAccessToken: { accessToken: string; expiresAt: string } | null;
    customerUserErrors: Array<{ code: string; message: string }>;
  };
};

async function loginWithPassword(email: string, password: string) {
  const data = await shopifyStorefrontFetch<TokenResp>(
    `mutation login($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { code message }
      }
    }`,
    { input: { email, password } },
  );
  return data.customerAccessTokenCreate;
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google sign-in is not configured yet." },
      { status: 500 },
    );
  }

  let body: { credential?: string };
  try {
    body = (await req.json()) as { credential?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.credential) {
    return NextResponse.json({ error: "Missing credential" }, { status: 400 });
  }

  // Verify the Google ID token's signature + audience server-side — no
  // client secret needed, just the (public) Client ID.
  let email: string;
  let firstName: string | undefined;
  let lastName: string | undefined;
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: body.credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return NextResponse.json(
        { error: "Google account has no verified email" },
        { status: 400 },
      );
    }
    email = payload.email.toLowerCase();
    firstName = payload.given_name;
    lastName = payload.family_name;
  } catch {
    return NextResponse.json({ error: "Invalid Google credential" }, { status: 401 });
  }

  try {
    const existing = await findCustomerByEmail(email);

    if (existing) {
      const savedPw = await getGoogleManagedPassword(existing.id);
      if (!savedPw) {
        // This email belongs to a normal password account — we have no way
        // to log them in without their password.
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please log in with your password instead.",
          },
          { status: 409 },
        );
      }
      const result = await loginWithPassword(email, savedPw);
      if (result.customerUserErrors.length || !result.customerAccessToken) {
        return NextResponse.json(
          { error: "Could not sign in with this Google account. Try again." },
          { status: 400 },
        );
      }
      await setCustomerSession({
        token: result.customerAccessToken.accessToken,
        expiresAt: result.customerAccessToken.expiresAt,
      });
      return NextResponse.json({ ok: true });
    }

    // New customer — create with a random password only our server knows.
    const password = generateRandomPassword();
    type CreateResp = {
      customerCreate: {
        customer: { id: string } | null;
        customerUserErrors: Array<{ code: string; message: string }>;
      };
    };
    const createData = await shopifyStorefrontFetch<CreateResp>(
      `mutation signup($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer { id }
          customerUserErrors { code message }
        }
      }`,
      { input: { email, password, firstName, lastName } },
    );

    const createErrors = createData.customerCreate.customerUserErrors;
    const customer = createData.customerCreate.customer;
    if (createErrors.length || !customer) {
      return NextResponse.json(
        { error: createErrors[0]?.message ?? "Could not create account" },
        { status: 400 },
      );
    }

    const result = await loginWithPassword(email, password);
    if (result.customerUserErrors.length || !result.customerAccessToken) {
      return NextResponse.json(
        { error: "Account created but sign-in failed. Please try logging in." },
        { status: 400 },
      );
    }

    await setGoogleManagedPassword(customer.id, password);
    await setCustomerSession({
      token: result.customerAccessToken.accessToken,
      expiresAt: result.customerAccessToken.expiresAt,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google sign-in failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
