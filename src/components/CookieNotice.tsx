"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Cookie notice.
 *
 * This site sets one functional cookie (it keeps you signed in) and uses
 * local storage for the cart. There is no analytics, advertising or
 * cross-site tracking, so this is a notice with an acknowledgement rather
 * than a consent manager with toggles that wouldn't control anything.
 *
 * If tracking is ever added, gate it on `hasAnalyticsConsent()` below and
 * turn the acknowledgement into a real choice — the stored shape already
 * has room for it.
 */

const KEY = "pls_cookie_notice";
const VERSION = 1;

type Stored = { v: number; analytics: boolean; at: number };

function read(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return parsed?.v === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/** For any future analytics script — currently always false. */
export function hasAnalyticsConsent(): boolean {
  return read()?.analytics === true;
}

export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only after mount, so the server and client markup agree.
    if (!read()) setShow(true);
  }, []);

  function acknowledge() {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ v: VERSION, analytics: false, at: Date.now() }),
      );
    } catch {
      /* Private mode: the notice simply shows again next visit. */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="animate-nudge-in fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-border-soft bg-surface-elevated/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-lg sm:inset-x-6 sm:bottom-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-foreground-muted sm:text-[13px]">
          <span aria-hidden className="mr-1.5">
            🍪
          </span>
          We use one cookie to keep you signed in, and your browser&apos;s
          storage to remember your cart. No advertising or tracking cookies, and
          nothing is shared with data brokers.{" "}
          <Link
            href="/privacy"
            className="font-semibold text-[#18d3e8] underline underline-offset-2 hover:text-[#d9f000]"
          >
            Read our privacy policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="shrink-0 rounded-xl accent-gradient px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
