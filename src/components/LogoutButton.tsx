"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="rounded-full border border-border-strong bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
