/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";

/**
 * Keep an unfinished order across page changes.
 *
 * - On mount: read the saved draft once and hand it to `restore`.
 * - While editing: save a moment after each change (and immediately when the
 *   page is hidden, so a fast click away can't lose the last edit).
 * - `clear()`: call after the item reaches the cart. The form stays filled,
 *   so the current values are remembered as "already dealt with" — otherwise
 *   leaving the page would quietly save the same order back.
 *
 * Restoring runs in an effect, not in the initial state, so the server HTML
 * and the first client render stay identical (no hydration mismatch).
 */
export function useDraft<T>({
  handle,
  snapshot,
  hasContent,
  restore,
}: {
  handle: string;
  snapshot: T;
  hasContent: boolean;
  restore: (saved: Partial<T>) => void;
}) {
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);

  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  const snapStr = JSON.stringify(snapshot);
  const latest = useRef({ snapStr, snapshot, hasContent });
  latest.current = { snapStr, snapshot, hasContent };
  // The snapshot that was just added to the cart — never re-save it.
  const handledSnap = useRef<string | null>(null);

  useEffect(() => {
    const saved = loadDraft<Partial<T>>(handle);
    if (saved) {
      try {
        restoreRef.current(saved);
        setRestored(true);
      } catch {
        clearDraft(handle); // A draft that can't be applied is worse than none.
      }
    }
    setReady(true);
  }, [handle]);

  const persist = useCallback(() => {
    const { snapStr: s, snapshot: snap, hasContent: has } = latest.current;
    if (s === handledSnap.current) return;
    if (has) saveDraft(handle, snap);
    else clearDraft(handle);
  }, [handle]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(persist, 500);
    return () => window.clearTimeout(t);
  }, [ready, snapStr, persist]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => persist();
    const onHide = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ready, persist]);

  /** The item is in the cart — forget the draft. */
  const clear = useCallback(() => {
    handledSnap.current = latest.current.snapStr;
    clearDraft(handle);
    setRestored(false);
  }, [handle]);

  /** "Start over": drop the draft and reload to a clean form. */
  const startOver = useCallback(() => {
    handledSnap.current = latest.current.snapStr;
    clearDraft(handle);
    window.location.reload();
  }, [handle]);

  return { restored, clear, startOver };
}

/** The reassurance line shown when a draft has been restored. */
export function DraftNote({ onStartOver }: { onStartOver: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
    >
      <span className="font-semibold">✓ Welcome back</span>
      <span className="text-emerald-100/80">
        We kept your selections from last time.
      </span>
      <button
        type="button"
        onClick={onStartOver}
        className="ml-auto rounded-full border border-emerald-300/30 px-2.5 py-0.5 font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
      >
        Start over
      </button>
    </div>
  );
}
