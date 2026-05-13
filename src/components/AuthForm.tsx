"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

type Mode = "login" | "signup";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const url =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              phone: phone || undefined,
              acceptsMarketing,
            };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        error?: string;
        requiresManualLogin?: boolean;
        message?: string;
      };

      if (!resp.ok || !data.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (data.requiresManualLogin) {
        setSuccess(data.message ?? "Account created. Please log in.");
        // Clear password and switch UX to a login prompt
        setPassword("");
        setTimeout(() => router.push(`/login?redirect=${encodeURIComponent(redirect)}`), 1200);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const title = isLogin ? "Welcome back" : "Create your account";
  const subtitle = isLogin
    ? "Log in to track your orders and reuse your details at checkout."
    : "Save your design files, track every order, and reorder in one click.";

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-border-soft bg-surface p-8 shadow-2xl shadow-black/40">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!isLogin && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                autoComplete="given-name"
                suppressHydrationWarning
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                autoComplete="family-name"
                suppressHydrationWarning
              />
            </Field>
          </div>
        )}

        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            autoComplete={isLogin ? "username" : "email"}
            suppressHydrationWarning
          />
        </Field>

        <Field
          label="Password"
          required
          hint={!isLogin ? "Minimum 8 characters" : undefined}
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? 1 : 8}
              className="input pr-11"
              autoComplete={isLogin ? "current-password" : "new-password"}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-foreground-muted hover:bg-white/10 hover:text-foreground"
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
        </Field>

        {!isLogin && (
          <>
            <Field label="Phone (optional)" hint="With country code, e.g. +1 555 1234">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                suppressHydrationWarning
              />
            </Field>
            <label className="flex items-start gap-2 text-xs text-foreground-muted">
              <input
                type="checkbox"
                checked={acceptsMarketing}
                onChange={(e) => setAcceptsMarketing(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Send me occasional emails with new product launches and
                promotions. (You can unsubscribe anytime.)
              </span>
            </label>
          </>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110 disabled:opacity-60"
        >
          {submitting
            ? isLogin
              ? "Signing in…"
              : "Creating account…"
            : isLogin
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-foreground-muted">
        {isLogin ? (
          <>
            New to Print Laser Stitch?{" "}
            <Link
              href={`/signup${redirect !== "/account" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="font-semibold text-accent hover:underline"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/login${redirect !== "/account" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="font-semibold text-accent hover:underline"
            >
              Log in
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--color-border-soft, rgba(255, 255, 255, 0.12));
          background: rgba(255, 255, 255, 0.05);
          padding: 0.65rem 0.9rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color 120ms;
        }
        :global(.input:focus) {
          border-color: var(--color-accent, #818cf8);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-foreground-muted">
          {hint}
        </span>
      )}
    </label>
  );
}
