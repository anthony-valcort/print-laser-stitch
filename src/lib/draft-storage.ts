/**
 * Saved drafts — an unfinished order that survives leaving the page.
 *
 * The cart already remembers what a customer ADDED. A draft remembers what
 * they were still PICKING: sizes, colors, quantities, notes and uploaded
 * artwork. Without it, wandering off to compare another product means
 * starting the form over.
 *
 * Everything lives in the customer's own browser (localStorage) — nothing is
 * sent anywhere, and it needs no sign-in. Pure functions only, so the rules
 * can be tested without a browser.
 */

import type { UploadSlot } from "@/components/configurator/UploadBox";

const PREFIX = "pls_draft:";
const VERSION = 1;
/** Drafts older than this are dropped — prices and options move on. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** A draft is a handful of numbers and strings; refuse anything bloated. */
const MAX_BYTES = 60_000;

type Envelope<T> = { v: number; savedAt: number; data: T };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // Access itself can throw when storage is blocked.
  }
}

export function loadDraft<T>(handle: string, now = Date.now()): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + handle);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== VERSION || typeof env.savedAt !== "number") {
      s.removeItem(PREFIX + handle);
      return null;
    }
    if (now - env.savedAt > DRAFT_MAX_AGE_MS) {
      s.removeItem(PREFIX + handle);
      return null;
    }
    return env.data ?? null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(handle: string, data: T, now = Date.now()): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const body = JSON.stringify({ v: VERSION, savedAt: now, data } satisfies Envelope<T>);
    if (body.length > MAX_BYTES) return false;
    s.setItem(PREFIX + handle, body);
    return true;
  } catch {
    return false; // Quota or private mode — a lost draft must never break the page.
  }
}

export function clearDraft(handle: string): void {
  try {
    storage()?.removeItem(PREFIX + handle);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Uploaded artwork                                                    */
/* ------------------------------------------------------------------ */

/** What we keep of an upload: the permanent link, not the in-memory File. */
export type SavedUpload = { name: string; type: string; url: string };

/** Only a finished upload is worth keeping. */
export function packUpload(
  slot: Pick<UploadSlot, "file" | "fileUrl" | "isUploading">,
): SavedUpload | null {
  if (slot.isUploading || !slot.fileUrl) return null;
  return {
    name: slot.file?.name ?? "Uploaded artwork",
    type: slot.file?.type ?? "",
    url: slot.fileUrl,
  };
}

/**
 * Rebuild a slot from a saved upload. The upload box only draws itself when
 * there is a File, so a zero-byte stand-in carries the name; the box shows
 * the saved image from `fileUrl` instead of the stand-in.
 */
export function unpackUpload(saved: unknown): UploadSlot | null {
  if (!saved || typeof saved !== "object") return null;
  const { name, type, url } = saved as Record<string, unknown>;
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) return null;
  const fileName = typeof name === "string" && name ? name.slice(0, 160) : "Uploaded artwork";
  const mime = typeof type === "string" ? type.slice(0, 80) : "";
  let file: File;
  try {
    file = new File([], fileName, { type: mime });
  } catch {
    return null;
  }
  return {
    file,
    fileUrl: url,
    isUploading: false,
    progress: 100,
    isProcessing: false,
    error: null,
  };
}

/** True for the stand-in made by `unpackUpload`. */
export function isRestoredUpload(slot: Pick<UploadSlot, "file" | "fileUrl">): boolean {
  return !!slot.file && slot.file.size === 0 && !!slot.fileUrl;
}

/* ------------------------------------------------------------------ */
/* Sanitizers — a saved draft is untrusted input                       */
/* ------------------------------------------------------------------ */

export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function cleanInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Keep a saved option pick only when that option still exists and still
 * offers that value — products get edited in Shopify between visits.
 */
export function cleanOptions(
  saved: unknown,
  options: { name: string; values: readonly string[] }[],
  current: Record<string, string>,
): Record<string, string> {
  const out = { ...current };
  if (!saved || typeof saved !== "object") return out;
  const src = saved as Record<string, unknown>;
  for (const opt of options) {
    const v = src[opt.name];
    if (typeof v === "string" && opt.values.includes(v)) out[opt.name] = v;
  }
  return out;
}

/** size → qty, restricted to sizes the product still has. */
export function cleanQtyMap(
  saved: unknown,
  allowedKeys: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!saved || typeof saved !== "object") return out;
  const src = saved as Record<string, unknown>;
  for (const k of allowedKeys) {
    const n = cleanInt(src[k], 0, 100_000);
    if (n !== null) out[k] = n;
  }
  return out;
}

export function cleanStringList(saved: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(saved)) return [];
  const seen = new Set<string>();
  for (const v of saved) {
    if (typeof v === "string" && allowed.includes(v)) seen.add(v);
  }
  return [...seen];
}

/** color → (size → qty) for the colors that are still offered. */
export function cleanColorMatrix(
  saved: unknown,
  colors: readonly string[],
  sizes: readonly string[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!saved || typeof saved !== "object") return out;
  const src = saved as Record<string, unknown>;
  for (const color of colors) {
    const row = cleanQtyMap(src[color], sizes);
    out[color] = Object.fromEntries(sizes.map((s) => [s, row[s] ?? 0]));
  }
  return out;
}
