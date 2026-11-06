import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "info@printlaserstitch.com";
const FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Print Laser Stitch <onboarding@resend.dev>";

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  vehicle?: string;
  bodyColor?: string;
  summary?: string;
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
  const notes = clip(body.notes, 3000);
  const vehicle = clip(body.vehicle, 200);
  const bodyColor = clip(body.bodyColor, 20);
  const summary = clip(body.summary, 1500);

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const prefix = "data:image/jpeg;base64,";
  const attachments: { filename: string; content: string }[] = [];
  let total = 0;
  for (const img of (body.images ?? []).slice(0, 5)) {
    const url = img.dataUrl ?? "";
    if (!url.startsWith(prefix)) continue;
    const content = url.slice(prefix.length);
    total += content.length;
    if (total > 4_000_000) {
      return NextResponse.json({ error: "Design images are too large. Try fewer views." }, { status: 413 });
    }
    const view = clip(img.view, 20).replace(/[^a-z0-9-]/gi, "") || "view";
    attachments.push({ filename: `wrap-design-${view}.jpg`, content });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Quote requests aren't fully set up yet. Please call (772) 985-2854." },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Wrap design quote request: ${name} (${vehicle || "vehicle"})`,
      text: [
        `From: ${name} <${email}>`,
        phone ? `Phone: ${phone}` : "",
        `Vehicle: ${vehicle}`,
        `Body color: ${bodyColor}`,
        summary ? `Design: ${summary}` : "",
        "",
        notes || "(no notes)",
        "",
        attachments.length ? `${attachments.length} design preview(s) attached.` : "No preview attached.",
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
