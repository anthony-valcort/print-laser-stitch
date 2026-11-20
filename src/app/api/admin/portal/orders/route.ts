import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import { getAllCompanies, saveAllCompanies } from "@/lib/portal-store";
import { getCompanyOrders, searchOrders } from "@/lib/portal-orders";

async function guard(req: NextRequest): Promise<NextResponse | null> {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** GET ?q=term  → search Shopify orders.  GET ?companyId=co_x → that company's orders. */
export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (companyId) {
    const co = (await getAllCompanies()).find((c) => c.id === companyId);
    if (!co) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await getCompanyOrders(co));
  }
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    return NextResponse.json({ results: await searchOrders(q) });
  } catch (err) {
    console.error("[admin/portal/orders] search failed:", err);
    return NextResponse.json(
      { error: "Couldn't search Shopify orders." },
      { status: 502 },
    );
  }
}

/** POST { companyId, orderId, link } → connect or disconnect an order. */
export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  let b: { companyId?: string; orderId?: string; link?: boolean };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const orderId = typeof b.orderId === "string" ? b.orderId : "";
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderId)) {
    return NextResponse.json({ error: "Bad order" }, { status: 400 });
  }
  const list = await getAllCompanies();
  const co = list.find((c) => c.id === b.companyId);
  if (!co) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const set = new Set(co.orderIds ?? []);
  if (b.link === false) set.delete(orderId);
  else set.add(orderId);
  co.orderIds = Array.from(set);
  try {
    await saveAllCompanies(list);
  } catch {
    return NextResponse.json({ error: "Couldn't save." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, orderIds: co.orderIds });
}
