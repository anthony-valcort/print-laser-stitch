"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: string; size: string; width: number; text: string },
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  redirect = "/account",
  onError,
}: {
  redirect?: string;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Not configured yet (Anthony hasn't supplied a Google Cloud Client ID) —
  // hide the button entirely rather than show a broken/erroring control.
  if (!CLIENT_ID) return null;

  async function handleCredentialResponse(response: { credential: string }) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onError?.(data.error ?? "Google sign-in failed");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      onError?.("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function initGoogleButton() {
    if (!window.google || !containerRef.current || !CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initGoogleButton}
      />
      <div ref={containerRef} className={submitting ? "pointer-events-none opacity-60" : ""} />
    </div>
  );
}
