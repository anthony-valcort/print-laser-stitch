"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Profile = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

/**
 * Inline-editable profile card on the account page. Read mode shows the
 * customer's details; clicking "Edit" turns names + phone into inputs.
 * Saving posts to /api/auth/update-profile and refreshes the route so the
 * server re-renders with the new values from Shopify.
 */
export default function EditableProfile({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setFirstName(initial.firstName ?? "");
    setLastName(initial.lastName ?? "");
    setPhone(initial.phone ?? "");
    setError(null);
    setEditing(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    // Shopify stores phone numbers in E.164 format — they must start with a
    // `+` and country code. We let the customer leave the field blank, but
    // if they entered something it must be a valid international format.
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      if (!trimmedPhone.startsWith("+")) {
        setError(
          "Phone must start with country code (e.g. +1 for US/Canada). Example: +1 555 123 4567.",
        );
        return;
      }
      // Strip spaces/dashes/parens for the digit count check.
      const digits = trimmedPhone.replace(/[^\d]/g, "");
      if (digits.length < 8 || digits.length > 15) {
        setError("Phone number length looks off — please double-check it.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: trimmedPhone,
        }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) {
        setError(data.error ?? "Could not update profile");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Profile</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-border-soft bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            Edit profile
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadField label="First name" value={initial.firstName} />
          <ReadField label="Last name" value={initial.lastName} />
          <ReadField label="Email" value={initial.email} />
          <ReadField label="Phone" value={initial.phone} />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Edit profile</h2>
      </div>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border-soft bg-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              First name<span className="ml-0.5 text-red-400">*</span>
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Last name
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Email (read-only)
            </span>
            <input
              type="email"
              value={initial.email}
              disabled
              className="w-full rounded-xl border border-border-soft bg-white/3 px-3 py-2 text-sm text-foreground-muted opacity-70"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="mt-1 block text-[11px] text-foreground-muted">
              Must start with country code (e.g. <strong>+1</strong> for
              US/Canada). Leave blank to skip.
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={submitting}
            className="rounded-md border border-border-soft bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md accent-gradient px-5 py-2 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ReadField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{value || "—"}</div>
    </div>
  );
}
