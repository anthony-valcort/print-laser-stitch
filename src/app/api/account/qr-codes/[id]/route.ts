import { type NextRequest, NextResponse } from "next/server";
import { requireCustomerOr401 } from "@/lib/customer-session";
import { deleteQrCode, getCustomerQrCodes, updateQrCode } from "@/lib/qr-codes";
import { QR_TYPES, encodeQrPayload, type QrCodeType } from "@/lib/qr-encode";

type Params = Promise<{ id: string }>;

type UpdateBody = {
  type?: string;
  title?: string;
  fields?: Record<string, string>;
};

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;

  const { id } = await params;
  const codes = await getCustomerQrCodes(customerOr401.id);
  const code = codes.find((c) => c.id === id);
  if (!code) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }
  return NextResponse.json({ code });
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;

  const { id } = await params;

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
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
    const updated = await updateQrCode(customerOr401.id, id, {
      type,
      title,
      fields,
      payload,
    });
    return NextResponse.json({ code: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update QR code";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const customerOr401 = await requireCustomerOr401();
  if (customerOr401 instanceof NextResponse) return customerOr401;

  const { id } = await params;
  try {
    await deleteQrCode(customerOr401.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not delete QR code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
