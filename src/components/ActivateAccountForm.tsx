"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function ActivateAccountForm({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, password }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };

      if (!resp.ok || !data.ok) {
        setError(data.error ?? "Could not activate account");
        return;
      }

      setDone(true);
      // Session cookie is set server-side — land them in their account.
      setTimeout(() => {
        router.push("/account");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-border-soft bg-surface p-8 shadow-2xl shadow-black/40">
      <h1 className="text-2xl font-bold tracking-tight">Activate your account</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Welcome to Print Laser Stitch — choose a password to finish setting up
        your account.
      </p>

      {done ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Account activated. Signing you in…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-foreground/80">
              Password<span className="ml-0.5 text-red-400">*</span>
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                suppressHydrationWarning
                className="w-full rounded-xl border border-border-soft bg-white/5 px-3.5 py-2.5 pr-11 text-sm outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-foreground-muted hover:bg-white/10 hover:text-foreground"
              >
                {showPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <span className="mt-1 block text-[11px] text-foreground-muted">
              Minimum 8 characters
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-foreground/80">
              Confirm password<span className="ml-0.5 text-red-400">*</span>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Activating…" : "Activate account"}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-foreground-muted">
        Already activated?{" "}
        <Link
          href="/login"
          className="font-semibold text-accent hover:underline"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
