import { type NextRequest, NextResponse } from "next/server";
import {
  getCurrentCustomer,
  getCurrentCustomerOrders,
} from "@/lib/customer-session";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

type Params = Promise<{ orderNumber: string }>;

/**
 * Generates a PDF invoice for one of the logged-in customer's own orders.
 * We look the order up via `getCurrentCustomerOrders()` — which is already
 * scoped to the current session's customerAccessToken — rather than trusting
 * the URL param directly, so a customer can never fetch another customer's
 * invoice by guessing an order number.
 */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { error: "Login required", loginRequired: true },
      { status: 401 },
    );
  }

  const { orderNumber } = await params;
  const targetNumber = Number(orderNumber);
  if (!Number.isFinite(targetNumber)) {
    return NextResponse.json({ error: "Invalid order number" }, { status: 400 });
  }

  const orders = await getCurrentCustomerOrders();
  const order = orders.find((o) => o.orderNumber === targetNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const pdfBytes = await buildInvoicePdf(order, "Print Laser Stitch");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not build invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
