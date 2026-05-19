import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";

type RecoverBody = {
  email?: string;
};

/**
 * Triggers Shopify's "Customer account password reset" email via the
 * Storefront `customerRecover` mutation. Shopify sends the email and hosts
 * the reset link, so no token handling is needed on our side.
 *
 * For privacy we never reveal whether an account exists — any non-throttling
 * outcome returns the same generic success message.
 */
export async function POST(req: NextRequest) {
  let body: RecoverBody;
  try {
    body = (await req.json()) as RecoverBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }

  const genericMessage =
    "If an account exists for that email, we've sent a password reset link. Check your inbox (and spam folder).";

  try {
    type Resp = {
      customerRecover: {
        customerUserErrors: Array<{
          code: string;
          field: string[] | null;
          message: string;
        }>;
      };
    };
    const data = await shopifyStorefrontFetch<Resp>(
      `mutation recover($email: String!) {
        customerRecover(email: $email) {
          customerUserErrors { code field message }
        }
      }`,
      { email },
    );

    const errors = data.customerRecover.customerUserErrors;
    // Surface throttling so the user knows to wait; swallow everything else
    // (including "not found") to avoid leaking which emails are registered.
    const throttled = errors.find((e) => e.code === "TOO_MANY_REQUESTS");
    if (throttled) {
      return NextResponse.json(
        {
          error:
            throttled.message ||
            "Too many requests. Please wait a few minutes and try again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ ok: true, message: genericMessage });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not send reset email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
