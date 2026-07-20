"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  QR_TYPES,
  QR_TYPE_LABELS,
  QR_TYPE_ICONS,
  QR_TYPE_FIELDS,
  encodeQrPayload,
  type QrCodeType,
} from "@/lib/qr-encode";
import QrPreview from "./QrPreview";

type Props = {
  mode: "create" | "edit";
  qrId?: string;
  initial?: {
    type: QrCodeType;
    title: string;
    fields: Record<string, string>;
  };
};

export default function QrCodeForm({ mode, qrId, initial }: Props) {
  const router = useRouter();
  const [type, setType] = useState<QrCodeType>(initial?.type ?? "phone");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [fields, setFields] = useState<Record<string, string>>(
    initial?.fields ?? {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldDefs = QR_TYPE_FIELDS[type];
  const payload = useMemo(() => encodeQrPayload(type, fields), [type, fields]);

  function switchType(t: QrCodeType) {
    setType(t);
    setFields({});
    setError(null);
  }

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setFields({});
    setTitle("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a name for this QR code.");
      return;
    }

    setSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/account/qr-codes"
          : `/api/account/qr-codes/${qrId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), fields }),
      });
      const data = (await resp.json()) as { error?: string };
      if (!resp.ok) {
        setError(data.error ?? "Could not save QR code");
        return;
      }
      router.push("/account/qr-codes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-border-soft bg-surface"
      >
        {/* Type tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border-soft p-2">
          {QR_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              disabled={mode === "edit"}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                t === type
                  ? "bg-[#18d3e8]/15 text-[#18d3e8]"
                  : "text-foreground-muted hover:bg-white/5"
              }`}
            >
              <span>{QR_TYPE_ICONS[t]}</span>
              {QR_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Name<span className="ml-0.5 text-red-400">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter the name of QR code for identification."
              required
              suppressHydrationWarning
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          {fieldDefs.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                {f.label}
                {f.required && <span className="ml-0.5 text-red-400">*</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  suppressHydrationWarning
                  className="w-full resize-none rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              ) : f.type === "select" ? (
                <select
                  value={fields[f.key] ?? f.options?.[0] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  suppressHydrationWarning
                  className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              )}
            </label>
          ))}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {mode === "create" && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md border border-border-soft bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Reset
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md accent-gradient px-5 py-2 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110 disabled:opacity-60"
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Submit"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Live preview */}
      <div className="flex flex-col items-center gap-3 self-start rounded-2xl border border-border-soft bg-surface p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          Preview
        </span>
        <QrPreview payload={payload} size={180} />
      </div>
    </div>
  );
}
