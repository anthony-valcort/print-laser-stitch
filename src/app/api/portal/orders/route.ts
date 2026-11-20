import { type NextRequest, NextResponse } from "next/server";
import { authedCompany, portalCookieName } from "@/lib/portal-store";
import { getCompanyOrders } from "@/lib/portal-orders";

/** The signed-in company's own past orders. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("companyId") ?? "";
  const co = await authedCompany(id, req.cookies.get(portalCookieName(id))?.value);
  if (!co) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  return NextResponse.json(await getCompanyOrders(co));
}
