"use client";

import { useEffect, useMemo, useState } from "react";
import type { QrCodeEntry } from "@/lib/qr-codes";
import { QR_TYPES, QR_TYPE_LABELS, type QrCodeType } from "@/lib/qr-encode";
import QrCodeCard from "./QrCodeCard";

export default function QrCodeListClient() {
  const [codes, setCodes] = useState<QrCodeEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QrCodeType | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/qr-codes")
      .then((r) => r.json())
      .then((data: { codes?: QrCodeEntry[]; error?: string }) => {
        if (data.codes) setCodes(data.codes);
        else setError(data.error ?? "Could not load QR codes");
      })
      .catch(() => setError("Could not load QR codes"));
  }, []);

  const filtered = useMemo(() => {
    if (!codes) return [];
    const q = search.trim().toLowerCase();
    return codes.filter((c) => {
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      const matchesSearch = !q || c.title.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [codes, typeFilter, search]);

  function handleDeleted(id: string) {
    setCodes((prev) => prev?.filter((c) => c.id !== id) ?? prev);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as QrCodeType | "all")}
          className="rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all" style={{ backgroundColor: "#1e1e1e", color: "#f5f5f5" }}>
            All types
          </option>
          {QR_TYPES.map((t) => (
            <option key={t} value={t} style={{ backgroundColor: "#1e1e1e", color: "#f5f5f5" }}>
              {QR_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by QR title"
          suppressHydrationWarning
          className="min-w-[220px] flex-1 rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {codes === null && !error ? (
        <div className="py-12 text-center text-sm text-foreground-muted">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-8 text-center">
          <div className="text-4xl">🔗</div>
          <p className="mt-3 text-sm text-foreground-muted">
            {codes && codes.length > 0
              ? "No QR codes match your search."
              : "You haven't created any QR codes yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <QrCodeCard key={c.id} entry={c} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
