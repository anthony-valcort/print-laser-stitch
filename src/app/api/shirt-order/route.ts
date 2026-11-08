import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "info@printlaserstitch.com";
const FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Print Laser Stitch <onboarding@resend.dev>";

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  item?: string;
  price?: number;
  sides?: string;
  images?: { view?: string; dataUrl?: string }[];
};

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const phone = clip(body.phone, 40);
  const item = clip(body.item, 200);
  const sides = clip(body.sides, 40);
  const price = typeof body.price === "number" && body.price > 0 && body.price < 1000 ? body.price : 0;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const prefix = "data:image/jpeg;base64,";
  const attachments: { filename: string; content: string }[] = [];
  let total = 0;
  for (const img of (body.images ?? []).slice(0, 2)) {
    const url = img.dataUrl ?? "";
    if (!url.startsWith(prefix)) continue;
    const content = url.slice(prefix.length);
    total += content.length;
    if (total > 4_000_000) {
      return NextResponse.json({ error: "Pictures are too big. Try a smaller logo." }, { status: 413 });
    }
    const view = clip(img.view, 10).replace(/[^a-z]/gi, "") || "view";
    attachments.push({ filename: `shirt-${view}.jpg`, content });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Orders aren't fully set up yet. Please call (772) 985-2854." },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `One Shirt order: ${name} ($${price})`,
      text: [
        `From: ${name} <${email}>`,
        phone ? `Phone: ${phone}` : "",
        `Shirt: ${item}`,
        `Print: ${sides}`,
        `Price: $${price} (pay at pickup in Stuart)`,
        "",
        attachments.length ? `${attachments.length} preview(s) attached.` : "No preview attached.",
      ]
        .filter((l) => l !== "")
        .join("\n"),
      attachments,
    });
    if (error) {
      return NextResponse.json({ error: error.message || "Could not send." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send." },
      { status: 500 },
    );
  }
}
