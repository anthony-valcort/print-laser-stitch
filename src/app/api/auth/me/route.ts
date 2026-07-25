import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-session";

/** Returns the customer for the current session (cookie or mobile's Bearer
 * token), or 401 if not logged in. Used by the mobile app on launch to
 * restore the signed-in state from its stored token. */
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Login required", loginRequired: true }, { status: 401 });
  }
  return NextResponse.json({ customer });
}
