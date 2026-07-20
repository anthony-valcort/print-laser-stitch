import { type NextRequest, NextResponse } from "next/server";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { createQrCode, getCustomerQrCodes } from "@/lib/qr-codes";
import { QR_TYPES, encodeQrPayload, type QrCodeType } from "@/lib/qr-encode";

type CreateBody = {
  type?: string;
  title?: string;
  fields?: Record<string, string>;
};

export async function GET() {
  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;

  try {
    const codes = await getCustomerQrCodes(customerOr401.id);
    return NextResponse.json({ codes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load QR codes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type as QrCodeType;
  if (!QR_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid QR type" }, { status: 400 });
  }
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const fields = body.fields ?? {};
  const payload = encodeQrPayload(type, fields);
  if (!payload.trim()) {
    return NextResponse.json(
      { error: "Please fill in the required fields" },
      { status: 400 },
    );
  }

  try {
    const created = await createQrCode(customerOr401.id, {
      type,
      title,
      fields,
      payload,
    });
    return NextResponse.json({ code: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save QR code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
