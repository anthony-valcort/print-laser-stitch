import { type NextRequest, NextResponse } from "next/server";
import { shopifyStorefrontFetch } from "@/lib/shopify-storefront";
import { clearCustomerSession } from "@/lib/customer-session";

export async function POST(req: NextRequest) {
  const token = await clearCustomerSession();
  if (token) {
    try {
      await shopifyStorefrontFetch(
        `mutation logout($token: String!) {
          customerAccessTokenDelete(customerAccessToken: $token) {
            deletedAccessToken
            userErrors { field message }
          }
        }`,
        { token },
      );
    } catch {
      // Even if the Shopify-side invalidation fails, we've already cleared the
      // cookie locally, so the user is effectively logged out.
    }
  }

  // Form-submit logout from the header dropdown sends Accept: text/html — we
  // redirect to the home page so the browser doesn't render raw JSON.
  // Programmatic logout from <LogoutButton /> sets Accept: application/json.
  const acceptsJson = req.headers.get("accept")?.includes("application/json");
  if (acceptsJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
