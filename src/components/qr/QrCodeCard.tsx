"use client";

import { useState } from "react";
import Link from "next/link";
import type { QrCodeEntry } from "@/lib/qr-codes";
import { QR_TYPE_ICONS, QR_TYPE_LABELS } from "@/lib/qr-encode";
import QrPreview from "./QrPreview";

export default function QrCodeCard({
  entry,
  onDeleted,
}: {
  entry: QrCodeEntry;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${entry.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const resp = await fetch(`/api/account/qr-codes/${entry.id}`, {
        method: "DELETE",
      });
      if (resp.ok) onDeleted(entry.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface">
      <div className="flex justify-center bg-white p-6">
        <QrPreview payload={entry.payload} size={150} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span>{QR_TYPE_ICONS[entry.type]}</span>
            {QR_TYPE_LABELS[entry.type]}
          </div>
          <div className="truncate text-sm font-medium">{entry.title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/account/qr-codes/${entry.id}/edit`}
            className="rounded-md border border-border-soft bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
