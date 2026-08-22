import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "info@printlaserstitch.com";
// Falls back to Resend's shared test sender so the form works before a
// domain is verified. Once printlaserstitch.com is verified in Resend, set
// CONTACT_FROM_EMAIL to e.g. "Print Laser Stitch <contact@printlaserstitch.com>"
// for better deliverability — no code change needed.
const FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "Print Laser Stitch <onboarding@resend.dev>";

type ContactBody = { name?: string; email?: string; message?: string };

export async function POST(req: NextRequest) {
  let body: ContactBody;
  try {
    body = (await req.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email and message are required." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long (5000 character max)." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Contact form isn't fully set up yet — please email info@printlaserstitch.com directly for now.",
      },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    // replyTo is the visitor's own address, so hitting "Reply" in the inbox
    // goes straight back to them instead of to the shared sender address.
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `New message from ${name} — Print Laser Stitch contact form`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not send your message." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send your message.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
