"use client";

import { useState, type FormEvent, type ReactNode } from "react";

const MAX_MESSAGE = 5000;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center shadow-2xl shadow-black/40">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20 text-2xl">
            <span className="animate-fade-up" style={{ animationDuration: "0.4s" }}>
              ✅
            </span>
          </div>
          <h2 className="mt-4 text-xl font-bold">Message sent</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Thanks for reaching out — we&apos;ll get back to you at your email
            soon.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-5 text-sm font-semibold text-accent hover:underline"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-surface p-8 shadow-2xl shadow-black/40">
      <form onSubmit={handleSubmit} className="relative space-y-4">
        <Field label="Name" required icon={<UserIcon />}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input"
            autoComplete="name"
            suppressHydrationWarning
          />
        </Field>

        <Field label="Email" required icon={<MailIcon />}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            autoComplete="email"
            suppressHydrationWarning
          />
        </Field>

        <Field label="Message" required hint={`${message.length}/${MAX_MESSAGE}`}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            required
            rows={5}
            maxLength={MAX_MESSAGE}
            className="input resize-none"
            suppressHydrationWarning
          />
        </Field>

        {error && (
          <div className="animate-fade-up rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group relative w-full overflow-hidden rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition duration-200 hover:scale-[1.015] hover:shadow-[#d9f000]/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          <span className="relative flex items-center justify-center gap-2">
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Sending…
              </>
            ) : (
              "Send message"
            )}
          </span>
        </button>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--color-border-soft, rgba(255, 255, 255, 0.12));
          background: rgba(255, 255, 255, 0.05);
          padding: 0.65rem 0.9rem 0.65rem 2.5rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition:
            border-color 150ms,
            box-shadow 150ms,
            background 150ms;
          font-family: inherit;
        }
        :global(.input:hover) {
          border-color: rgba(255, 255, 255, 0.22);
        }
        :global(.input:focus) {
          border-color: var(--color-accent, #18d3e8);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #18d3e8) 18%, transparent);
        }
        :global(textarea.input) {
          padding-left: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  icon?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground/80">
        <span>
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </span>
        {hint && <span className="text-foreground-muted">{hint}</span>}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {icon}
          </span>
        )}
        {children}
      </div>
    </label>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
