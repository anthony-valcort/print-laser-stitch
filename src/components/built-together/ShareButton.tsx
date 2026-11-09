"use client";

import { useState } from "react";

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      return; // user closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-soft px-5 py-2 text-sm font-bold hover:bg-white/5"
    >
      {copied ? "✓ Link copied" : "↗ Share this story"}
    </button>
  );
}
