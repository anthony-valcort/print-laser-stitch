"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLogin({
  slug,
  name,
  logoUrl,
  missing,
}: {
  slug: string;
  name: string;
  logoUrl: string;
  missing?: boolean;
}) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password: pw }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "Wrong password. Try again.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("Couldn't connect. Try again.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <form
        onSubmit={submit}
        className="w-full rounded-3xl border border-border-soft bg-white/4 p-7 text-center shadow-2xl"
        style={{ animation: "portal-up .5s ease both" }}
      >
        <style>{`@keyframes portal-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            className="mx-auto mb-4 h-20 w-auto max-w-[200px] object-contain"
          />
        ) : (
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent text-2xl text-black">
            🔒
          </div>
        )}
        <h1 className="font-headline text-2xl font-bold">
          {missing ? "Customer Portal" : `${name} Portal`}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {missing
            ? "Enter the password we gave you. Check that your link is right."
            : "Enter your password to reorder your products."}
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          className="mt-5 w-full rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-center text-lg outline-none ring-accent/40 focus:ring-2"
        />
        {err && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !pw}
          className="mt-4 w-full rounded-md accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Open my portal"}
        </button>
        <p className="mt-4 text-xs text-foreground-muted">
          Lost your password? Call (772) 985-2854.
        </p>
      </form>
    </section>
  );
}
