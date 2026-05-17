/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  generateProof,
  rasterizeSvgToPng,
  type Fit,
  type GenerateProofOutput,
} from "@/lib/proof/build-proof";
import { buildCutlineSvg, buildProofSvg } from "@/lib/proof/to-svg";
import type {
  BorderThickness,
  ProofShape,
  RoundedCorners,
} from "@/lib/proof/types";

export type ProofApprovalData = {
  shape: ProofShape;
  borderThickness: BorderThickness;
  roundedCorners: RoundedCorners;
  removedBackground: boolean;
  fit: Fit;
  zoom: number;
  lowResolution: boolean;
  /** Flattened proof preview (border + artwork + cutline) for the order. */
  proofPng: Blob;
  /** Production die-cut line as a standalone SVG layer. */
  cutlineSvg: string;
};

type Props = {
  open: boolean;
  file: File;
  initialShape: ProofShape;
  initialBorder: BorderThickness;
  initialRounded: RoundedCorners;
  widthIn: number;
  heightIn: number;
  onClose: () => void;
  onApprove: (data: ProofApprovalData) => void;
  onRequestChanges: (note: string, data: ProofApprovalData) => void;
};

const SHAPES: { key: ProofShape; label: string; icon: string }[] = [
  { key: "custom", label: "Custom Shape", icon: "/custom_shape-removebg-preview.png" },
  { key: "circle", label: "Circle", icon: "/circle-removebg-preview.png" },
  { key: "oval", label: "Oval", icon: "/oval-removebg-preview.png" },
  { key: "square", label: "Square", icon: "/square-removebg-preview.png" },
  { key: "rectangle", label: "Rectangle", icon: "/rectangle-removebg-preview.png" },
];

const BORDERS: BorderThickness[] = ["thin", "normal", "wide"];
const ROUNDED: RoundedCorners[] = ["none", "soft", "medium", "heavy"];

export default function ProofModal({
  open,
  file,
  initialShape,
  initialBorder,
  initialRounded,
  widthIn,
  heightIn,
  onClose,
  onApprove,
  onRequestChanges,
}: Props) {
  const [shape, setShape] = useState<ProofShape>(initialShape);
  const [border, setBorder] = useState<BorderThickness>(initialBorder);
  const [rounded, setRounded] = useState<RoundedCorners>(initialRounded);
  const [fit, setFit] = useState<Fit>("fill");
  const [zoom, setZoom] = useState(1);
  const [showCutline, setShowCutline] = useState(true);

  const [result, setResult] = useState<GenerateProofOutput | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"proof" | "changes">("proof");
  const [note, setNote] = useState("");

  const runToken = useRef(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const regenerate = useCallback(async () => {
    const token = ++runToken.current;
    setBusy(true);
    setError(null);
    try {
      const out = await generateProof({
        file,
        settings: {
          shape,
          removeBackground: false,
          borderThickness: border,
          roundedCorners: rounded,
          widthIn,
          heightIn,
        },
        fit,
        zoom,
      });
      if (token !== runToken.current) return; // superseded
      setResult(out);
      const svg = buildProofSvg(out, out.artworkRect, showCutline);
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" }),
      );
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } catch (e) {
      if (token === runToken.current) {
        setError(
          e instanceof Error ? e.message : "Could not generate the proof.",
        );
      }
    } finally {
      if (token === runToken.current) setBusy(false);
    }
  }, [
    file,
    shape,
    border,
    rounded,
    fit,
    zoom,
    widthIn,
    heightIn,
    showCutline,
  ]);

  useEffect(() => {
    if (open) void regenerate();
  }, [open, regenerate]);

  // Cleanup object URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  async function buildApprovalData(): Promise<ProofApprovalData | null> {
    if (!result) return null;
    const svg = buildProofSvg(result, result.artworkRect, showCutline);
    const proofPng = await rasterizeSvgToPng(
      svg,
      result.widthPx,
      result.heightPx,
    );
    return {
      shape,
      borderThickness: border,
      roundedCorners: rounded,
      removedBackground: false,
      fit,
      zoom,
      lowResolution: result.lowResolution,
      proofPng,
      cutlineSvg: buildCutlineSvg(result),
    };
  }

  async function handleApprove() {
    setBusy(true);
    try {
      const data = await buildApprovalData();
      if (data) onApprove(data);
    } catch {
      setError("Could not finalise the proof. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitChanges() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const data = await buildApprovalData();
      if (data) onRequestChanges(note.trim(), data);
    } catch {
      setError("Could not save your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isSquareish = shape === "square" || shape === "rectangle";

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0a0f2c]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0f2c]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="font-display text-base font-black uppercase tracking-tight">
              Preflight
            </span>
            <span className="rounded-full bg-[#6c5ce7]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a99bff]">
              Beta
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-foreground-muted hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">
        {view === "proof" ? (
          <>
            {/* Shape switcher row */}
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              {SHAPES.map((s) => {
                const active = s.key === shape;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setShape(s.key)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-[#6c5ce7] bg-[#6c5ce7]/25 text-white"
                        : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"
                    }`}
                  >
                    <span className="relative h-5 w-5 shrink-0">
                      <Image src={s.icon} alt="" fill className="object-contain" sizes="20px" />
                    </span>
                    {active && <span>{s.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Preview */}
            <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-1 px-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
                className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
                aria-label="Zoom out"
              >
                −
              </button>
              <div className="aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl">
                {previewUrl && !busy ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Sticker proof preview"
                    className="h-full w-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-xs text-foreground-muted">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="ml-2">Generating proof…</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            {/* Preview row controls */}
            <div className="mx-auto mt-3 flex max-w-md items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setFit("fill")}
                  className={fit === "fill" ? "text-[#39e600]" : "text-foreground-muted"}
                >
                  Fill
                </button>
                <button
                  type="button"
                  onClick={() => setFit("fit")}
                  className={fit === "fit" ? "text-[#39e600]" : "text-foreground-muted"}
                >
                  Fit
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCutline((v) => !v)}
                  className={`grid h-7 w-7 place-items-center rounded-full ${
                    showCutline ? "text-[#39e600]" : "text-foreground-muted"
                  } hover:bg-white/10`}
                  aria-label="Toggle cutline"
                  title="Show / hide cutline"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                {BORDERS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBorder(b)}
                    title={`${b} border`}
                    className={`h-1.5 rounded-full transition ${
                      b === "thin" ? "w-4" : b === "normal" ? "w-6" : "w-8"
                    } ${border === b ? "bg-[#39e600]" : "bg-white/25 hover:bg-white/40"}`}
                  />
                ))}
              </div>
            </div>

            {/* Rounded corners (square / rectangle only) */}
            {isSquareish && (
              <div className="mx-auto mt-6 max-w-md">
                <div className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Rounded corners
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ROUNDED.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRounded(r)}
                      className={`rounded-xl border px-2 py-3 text-xs font-semibold capitalize transition ${
                        rounded === r
                          ? "border-[#6c5ce7] bg-[#6c5ce7]/25 text-white"
                          : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result?.warnings.length ? (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            ) : null}
            {error && (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mx-auto mt-6 max-w-md space-y-2 pb-8">
              <button
                type="button"
                disabled={busy || !result}
                onClick={handleApprove}
                className="w-full rounded-2xl bg-[#23b85a] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#23b85a]/30 transition hover:brightness-110 disabled:opacity-50"
              >
                Yes, print this
              </button>
              <button
                type="button"
                disabled={busy || !result}
                onClick={() => setView("changes")}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-foreground-muted hover:bg-white/10 disabled:opacity-50"
              >
                No, I need changes
              </button>
            </div>
          </>
        ) : (
          /* Requested-changes view */
          <div className="mx-auto max-w-md py-4">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Sticker proof"
                className="mx-auto mb-5 h-48 w-48 rounded-2xl object-contain"
              />
            )}
            <div className="mb-2 text-center text-sm font-bold">
              Requested changes
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Describe the look you're going for…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-[#6c5ce7]/40 focus:ring-2"
              autoFocus
            />
            <button
              type="button"
              disabled={!note.trim() || busy}
              onClick={handleSubmitChanges}
              className={`mt-3 w-full rounded-2xl px-5 py-4 text-sm font-bold transition ${
                note.trim() && !busy
                  ? "bg-[#6c5ce7] text-white hover:brightness-110"
                  : "cursor-not-allowed bg-white/5 text-foreground-muted"
              }`}
            >
              {note.trim() ? "Send & add to cart" : "Type to continue"}
            </button>
            <button
              type="button"
              onClick={() => setView("proof")}
              className="mt-3 block w-full text-center text-sm text-foreground-muted hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
