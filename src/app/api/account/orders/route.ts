import { NextResponse } from "next/server";
import { getCurrentCustomer, getCurrentCustomerOrders } from "@/lib/customer-session";

/** Logged-in customer's order history — used by the mobile app's Orders
 * screen (the web page fetches this server-side directly instead). */
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Login required", loginRequired: true }, { status: 401 });
  }
  const orders = await getCurrentCustomerOrders();
  return NextResponse.json(orders);
}
