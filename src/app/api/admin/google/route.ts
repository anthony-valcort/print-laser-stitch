import { type NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getAdminPasswordHash } from "@/lib/vehicle-shopify";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Gmail addresses that may open admin with Google. Add more with the
 * ADMIN_GOOGLE_EMAILS setting (comma separated). */
function allowedEmails(): string[] {
  const extra = (process.env.ADMIN_GOOGLE_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return ["printlaserstitch@gmail.com", ...extra];
}

export async function POST(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "Google sign-in isn't set up yet." },
      { status: 500 },
    );
  }
  let credential = "";
  try {
    credential = String(((await req.json()) as { credential?: string }).credential ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!credential) {
    return NextResponse.json({ error: "Missing credential" }, { status: 400 });
  }

  let email = "";
  try {
    const ticket = await new OAuth2Client(CLIENT_ID).verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (!p?.email || !p.email_verified) {
      return NextResponse.json({ error: "Google email not verified." }, { status: 400 });
    }
    email = p.email.toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid Google sign-in." }, { status: 401 });
  }

  if (!allowedEmails().includes(email)) {
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json(
      { error: "That Google account isn't allowed here." },
      { status: 403 },
    );
  }

  const token = await getAdminPasswordHash();
  if (!token) {
    return NextResponse.json({ error: "Admin isn't set up." }, { status: 500 });
  }
  return NextResponse.json({ token });
}
