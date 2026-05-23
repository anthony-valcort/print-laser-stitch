import { type NextRequest, NextResponse } from "next/server";
import { lookupDiscountCode } from "@/lib/discount-lookup";

type ValidateBody = {
  code?: string;
  /** Current cart subtotal in dollars — used for the minimum requirement check. */
  subtotal?: number;
};

/**
 * Look up a Shopify discount code via the Admin GraphQL API and check if it's
 * currently usable for the customer's cart. We return just enough info for
 * the cart UI to compute the savings (`CartDiscount`); the checkout-cart route
 * re-validates before creating the draft order so a malicious client can't
 * forge a percentage.
 *
 * Requires the Admin token to have `read_discounts` scope.
 */
export async function POST(req: NextRequest) {
  let body: ValidateBody;
  try {
    body = (await req.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code?.trim();
  const subtotal = Number(body.subtotal);

  if (!code) {
    return NextResponse.json(
      { error: "Please enter a discount code." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return NextResponse.json(
      { error: "Add items to your cart before applying a discount." },
      { status: 400 },
    );
  }

  const result = await lookupDiscountCode(code, subtotal);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, discount: result.discount });
}
