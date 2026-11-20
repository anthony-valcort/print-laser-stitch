"use client";

import Script from "next/script";
import { useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** "Sign in with Google" for the shop owner. Hidden until Google is set up. */
export default function AdminGoogleButton({
  onDone,
  onError,
}: {
  onDone: (token: string) => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!CLIENT_ID) return null;

  async function handle(response: { credential: string }) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const d = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !d.token) {
        onError(d.error ?? "Google sign-in failed.");
      } else {
        onDone(d.token);
      }
    } catch {
      onError("Couldn't connect. Try again.");
    }
    setBusy(false);
  }

  function init() {
    if (!window.google || !ref.current || !CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handle,
    });
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={init}
      />
      <div ref={ref} className={busy ? "pointer-events-none opacity-60" : ""} />
    </div>
  );
}
