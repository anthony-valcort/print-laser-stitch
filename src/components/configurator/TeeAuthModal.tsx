"use client";

import { useEffect, useState, type FormEvent } from "react";

/** Log in / sign up without leaving the page, so the customer's design stays. */
export default function TeeAuthModal({
  initial,
  onClose,
  onDone,
}: {
  initial: "login" | "signup";
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">(initial);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setNote(null);
    setBusy(true);
    try {
      const r = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { email, password } : { email, password, firstName: firstName || undefined },
        ),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; requiresManualLogin?: boolean; message?: string };
      if (!r.ok || !d.ok) {
        setErr(d.error ?? "Something went wrong");
        return;
      }
      if (d.requiresManualLogin) {
        setMode("login");
        setPassword("");
        setNote(d.message ?? "Account made! Now log in.");
        return;
      }
      onDone();
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-border-soft bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-highlight/40 focus:ring-2";

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={submit} className="relative w-full max-w-sm space-y-3 rounded-2xl border border-border-strong bg-surface-elevated p-5 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-2 text-2xl leading-none text-white/60 hover:text-white">
          ×
        </button>
        <h2 className="font-display text-xl font-black uppercase">{mode === "login" ? "Welcome back 👋" : "Free account 🎉"}</h2>
        <p className="text-xs text-foreground-muted">Your design stays right here.</p>
        {mode === "signup" && (
          <input className={input} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        )}
        <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className={input} type="password" required minLength={mode === "signup" ? 8 : undefined} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {note && <p className="text-sm text-[#d9f000]">{note}</p>}
        {err && <p className="text-sm text-[#ff9aa2]">{err}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full accent-gradient px-4 py-3 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-60">
          {busy ? "One sec…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <button type="button" className="underline" onClick={() => { setErr(null); setMode(mode === "login" ? "signup" : "login"); }}>
            {mode === "login" ? "New? Sign up" : "Have an account? Log in"}
          </button>
          {mode === "login" && (
            <a href="/forgot-password" target="_blank" rel="noreferrer" className="underline">
              Forgot password?
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
