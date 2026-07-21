"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BLEED_IN, SAFE_IN } from "@/lib/template-fit/constants";
import {
  baseFitWidthIn,
  effectiveNaturalSize,
  flattenToCanvas,
  type Rotation,
} from "@/lib/template-fit/flatten-to-canvas";

export type Side = "front" | "back";

type SideInput = { fileUrl: string; fileName: string | null };

type SideState = {
  naturalWidth: number;
  naturalHeight: number;
  fitMode: "fill" | "fit";
  zoom: number;
  offsetXIn: number;
  offsetYIn: number;
  rotation: Rotation;
  flipX: boolean;
  flipY: boolean;
  confirmed: boolean;
};

type TransformSnapshot = Pick<
  SideState,
  "fitMode" | "zoom" | "offsetXIn" | "offsetYIn" | "rotation" | "flipX" | "flipY"
>;

type HistoryState = { stack: TransformSnapshot[]; index: number };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const BASELINE: TransformSnapshot = {
  fitMode: "fill",
  zoom: 1,
  offsetXIn: 0,
  offsetYIn: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
};

function initialSideState(): SideState {
  return {
    naturalWidth: 0,
    naturalHeight: 0,
    confirmed: false,
    ...BASELINE,
  };
}

function snapshotOf(s: SideState): TransformSnapshot {
  return {
    fitMode: s.fitMode,
    zoom: s.zoom,
    offsetXIn: s.offsetXIn,
    offsetYIn: s.offsetYIn,
    rotation: s.rotation,
    flipX: s.flipX,
    flipY: s.flipY,
  };
}

function rotate90(rotation: Rotation, delta: 90 | -90): Rotation {
  return (((rotation + delta) % 360) + 360) % 360 as Rotation;
}

export default function TemplateFitStudio({
  widthIn,
  heightIn,
  sides,
  busy = false,
  error = null,
  onFinalize,
}: {
  widthIn: number;
  heightIn: number;
  sides: Partial<Record<Side, SideInput>>;
  busy?: boolean;
  error?: string | null;
  onFinalize: (blobs: Partial<Record<Side, Blob>>) => void;
}) {
  const bleedWIn = widthIn + 2 * BLEED_IN;
  const bleedHIn = heightIn + 2 * BLEED_IN;

  const availableSides = useMemo(
    () => (Object.keys(sides) as Side[]).filter((s) => sides[s]),
    [sides],
  );

  const [activeSide, setActiveSide] = useState<Side>(
    availableSides[0] ?? "front",
  );
  const [stateBySide, setStateBySide] = useState<Record<Side, SideState>>({
    front: initialSideState(),
    back: initialSideState(),
  });
  const [historyBySide, setHistoryBySide] = useState<Record<Side, HistoryState>>({
    front: { stack: [BASELINE], index: 0 },
    back: { stack: [BASELINE], index: 0 },
  });
  const [showAlign, setShowAlign] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);
  // While dragging, we mutate the image's `transform` directly on the DOM
  // node (see handlePointerMove) instead of going through setState on every
  // pointermove — a React re-render per mouse-move event is slow enough to
  // visibly lag behind the cursor. `liveOffsetXIn/YIn` track the position we
  // last painted so we can commit it to state once, on pointerup.
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetXIn: number;
    startOffsetYIn: number;
    liveOffsetXIn: number;
    liveOffsetYIn: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidthPx(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset the per-side view (and history) whenever the print dimensions
  // change — including on first mount — since a stale pan/zoom position in
  // inches from a *different* bleed rectangle would look wrong. Preserves
  // naturalWidth/naturalHeight (the underlying image hasn't changed).
  useEffect(() => {
    setStateBySide((prev) => ({
      front: { ...prev.front, ...BASELINE, confirmed: false },
      back: { ...prev.back, ...BASELINE, confirmed: false },
    }));
    setHistoryBySide({
      front: { stack: [BASELINE], index: 0 },
      back: { stack: [BASELINE], index: 0 },
    });
  }, [widthIn, heightIn]);

  // Preload each side's image so we know its natural size (needed for the
  // fit/fill base scale).
  useEffect(() => {
    for (const side of availableSides) {
      const input = sides[side];
      if (!input) continue;
      const img = new Image();
      img.onload = () => {
        setStateBySide((prev) => ({
          ...prev,
          [side]: {
            ...prev[side],
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          },
        }));
      };
      img.src = input.fileUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSides.join(","), sides.front?.fileUrl, sides.back?.fileUrl]);

  // Close the alignment popover on outside click.
  useEffect(() => {
    if (!showAlign) return;
    function onDocClick(e: MouseEvent) {
      if (alignRef.current && !alignRef.current.contains(e.target as Node)) {
        setShowAlign(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showAlign]);

  const current = stateBySide[activeSide];
  const currentInput = sides[activeSide];
  const history = historyBySide[activeSide];

  const rotated = current.rotation === 90 || current.rotation === 270;
  const eff = effectiveNaturalSize(
    current.naturalWidth,
    current.naturalHeight,
    current.rotation,
  );

  // drawnWidthIn/drawnHeightIn = the *visual* bounding box (post-rotation)
  // that the customer sees and that "W:/H:" reports.
  const drawnWidthIn = useMemo(() => {
    if (!currentInput || !current.naturalWidth) return 0;
    return (
      baseFitWidthIn(eff.width, eff.height, bleedWIn, bleedHIn, current.fitMode) *
      current.zoom
    );
  }, [currentInput, current.naturalWidth, current.fitMode, current.zoom, eff.width, eff.height, bleedWIn, bleedHIn]);

  const drawnHeightIn = eff.width ? drawnWidthIn * (eff.height / eff.width) : 0;

  // ownWidthIn/ownHeightIn = the image element's *own* (pre-rotation) draw
  // size — swapped back from the bounding box so that, once CSS/canvas
  // rotates it, the visual result matches drawnWidthIn × drawnHeightIn.
  const ownWidthIn = rotated ? drawnHeightIn : drawnWidthIn;
  const ownHeightIn = rotated ? drawnWidthIn : drawnHeightIn;

  const pxPerIn = containerWidthPx > 0 ? containerWidthPx / bleedWIn : 0;
  const containerHeightPx = containerWidthPx * (bleedHIn / bleedWIn);

  function updateSide(side: Side, patch: Partial<SideState>) {
    setStateBySide((prev) => ({ ...prev, [side]: { ...prev[side], ...patch } }));
  }

  function pushHistory(side: Side, snap: TransformSnapshot) {
    setHistoryBySide((prev) => {
      const h = prev[side];
      const truncated = h.stack.slice(0, h.index + 1);
      const stack = [...truncated, snap];
      return { ...prev, [side]: { stack, index: stack.length - 1 } };
    });
  }

  /** Applies a transform patch and records it as an undoable step. Use for
   * discrete actions (button clicks) — not for continuous drag/slide, which
   * commit once at the end instead. */
  function commitAndPush(side: Side, patch: Partial<SideState>) {
    const merged = { ...stateBySide[side], ...patch };
    updateSide(side, patch);
    pushHistory(side, snapshotOf(merged));
  }

  function applySnapshot(side: Side, snap: TransformSnapshot) {
    updateSide(side, snap);
  }

  function undo() {
    if (history.index <= 0) return;
    const newIndex = history.index - 1;
    applySnapshot(activeSide, history.stack[newIndex]);
    setHistoryBySide((prev) => ({
      ...prev,
      [activeSide]: { ...prev[activeSide], index: newIndex },
    }));
  }

  function redo() {
    if (history.index >= history.stack.length - 1) return;
    const newIndex = history.index + 1;
    applySnapshot(activeSide, history.stack[newIndex]);
    setHistoryBySide((prev) => ({
      ...prev,
      [activeSide]: { ...prev[activeSide], index: newIndex },
    }));
  }

  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  function setFitMode(mode: "fill" | "fit") {
    commitAndPush(activeSide, { fitMode: mode, zoom: 1, offsetXIn: 0, offsetYIn: 0 });
  }

  function fitToDesign() {
    commitAndPush(activeSide, { fitMode: "fit", zoom: 1, offsetXIn: 0, offsetYIn: 0 });
  }

  function adjustZoom(delta: number) {
    commitAndPush(activeSide, {
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom + delta)),
    });
  }

  function rotateBy(delta: 90 | -90) {
    commitAndPush(activeSide, { rotation: rotate90(current.rotation, delta) });
  }

  function toggleFlip(axis: "x" | "y") {
    commitAndPush(
      activeSide,
      axis === "x" ? { flipX: !current.flipX } : { flipY: !current.flipY },
    );
  }

  function alignOffsetX(h: "left" | "center" | "right"): number {
    if (h === "left") return BLEED_IN - bleedWIn / 2 + drawnWidthIn / 2;
    if (h === "right") return bleedWIn / 2 - BLEED_IN - drawnWidthIn / 2;
    return 0;
  }

  function alignOffsetY(v: "top" | "middle" | "bottom"): number {
    if (v === "top") return BLEED_IN - bleedHIn / 2 + drawnHeightIn / 2;
    if (v === "bottom") return bleedHIn / 2 - BLEED_IN - drawnHeightIn / 2;
    return 0;
  }

  function applyAlignX(h: "left" | "center" | "right") {
    commitAndPush(activeSide, { offsetXIn: alignOffsetX(h) });
    setShowAlign(false);
  }

  function applyAlignY(v: "top" | "middle" | "bottom") {
    commitAndPush(activeSide, { offsetYIn: alignOffsetY(v) });
    setShowAlign(false);
  }

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pxPerIn) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffsetXIn: current.offsetXIn,
        startOffsetYIn: current.offsetYIn,
        liveOffsetXIn: current.offsetXIn,
        liveOffsetYIn: current.offsetYIn,
        moved: false,
      };
    },
    [pxPerIn, current.offsetXIn, current.offsetYIn],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const img = imgRef.current;
      if (!drag || !pxPerIn || !img) return;
      const dxIn = (e.clientX - drag.startX) / pxPerIn;
      const dyIn = (e.clientY - drag.startY) / pxPerIn;
      const offsetXIn = drag.startOffsetXIn + dxIn;
      const offsetYIn = drag.startOffsetYIn + dyIn;
      drag.liveOffsetXIn = offsetXIn;
      drag.liveOffsetYIn = offsetYIn;
      drag.moved = true;

      const leftPx = (bleedWIn / 2 + offsetXIn - ownWidthIn / 2) * pxPerIn;
      const topPx = (bleedHIn / 2 + offsetYIn - ownHeightIn / 2) * pxPerIn;
      img.style.transform = `translate3d(${leftPx}px, ${topPx}px, 0) rotate(${current.rotation}deg) scale(${current.flipX ? -1 : 1}, ${current.flipY ? -1 : 1})`;
    },
    [pxPerIn, bleedWIn, bleedHIn, ownWidthIn, ownHeightIn, current.rotation, current.flipX, current.flipY],
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag && drag.moved) {
      const patch = { offsetXIn: drag.liveOffsetXIn, offsetYIn: drag.liveOffsetYIn };
      const merged = { ...stateBySide[activeSide], ...patch };
      updateSide(activeSide, patch);
      pushHistory(activeSide, snapshotOf(merged));
    }
    dragRef.current = null;
  }, [activeSide, stateBySide]);

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.1 : 0.02;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    commitAndPush(activeSide, {
      offsetXIn: current.offsetXIn + dx,
      offsetYIn: current.offsetYIn + dy,
    });
  }

  function handleZoomSliderRelease() {
    pushHistory(activeSide, snapshotOf(stateBySide[activeSide]));
  }

  function handleConfirmSide() {
    if (!currentInput) return;
    updateSide(activeSide, { confirmed: true });
    // Move to the next unconfirmed side, if any — actual flattening happens
    // once, for every side, in handleContinueToCart.
    const next = availableSides.find(
      (s) => s !== activeSide && !stateBySide[s].confirmed,
    );
    if (next) setActiveSide(next);
  }

  const allConfirmed = availableSides.every((s) => stateBySide[s].confirmed);

  async function handleContinueToCart() {
    setFinalizing(true);
    try {
      const blobs: Partial<Record<Side, Blob>> = {};
      for (const side of availableSides) {
        const input = sides[side];
        const st = stateBySide[side];
        if (!input) continue;
        const stEff = effectiveNaturalSize(st.naturalWidth, st.naturalHeight, st.rotation);
        const drawW =
          baseFitWidthIn(stEff.width, stEff.height, bleedWIn, bleedHIn, st.fitMode) *
          st.zoom;
        blobs[side] = await flattenToCanvas(input.fileUrl, bleedWIn, bleedHIn, {
          widthIn: drawW,
          offsetXIn: st.offsetXIn,
          offsetYIn: st.offsetYIn,
          rotation: st.rotation,
          flipX: st.flipX,
          flipY: st.flipY,
        });
      }
      onFinalize(blobs);
    } finally {
      setFinalizing(false);
    }
  }

  // Guide overlay insets, as % of container width/height.
  const trimLeftPct = (BLEED_IN / bleedWIn) * 100;
  const trimTopPct = (BLEED_IN / bleedHIn) * 100;
  const safeLeftPct = ((BLEED_IN + SAFE_IN) / bleedWIn) * 100;
  const safeTopPct = ((BLEED_IN + SAFE_IN) / bleedHIn) * 100;

  const imgLeftPx =
    (bleedWIn / 2 + current.offsetXIn - ownWidthIn / 2) * pxPerIn;
  const imgTopPx =
    (bleedHIn / 2 + current.offsetYIn - ownHeightIn / 2) * pxPerIn;
  const imgWidthPx = ownWidthIn * pxPerIn;
  const imgHeightPx = ownHeightIn * pxPerIn;

  // Quality — effective print resolution at the current zoom, so the
  // customer knows before ordering whether their file will look sharp.
  const effectiveDpi =
    current.naturalWidth && drawnWidthIn ? eff.width / drawnWidthIn : null;
  const quality: "high" | "medium" | "low" | null =
    effectiveDpi == null ? null : effectiveDpi >= 200 ? "high" : effectiveDpi >= 100 ? "medium" : "low";
  const recommendedPx =
    quality && quality !== "high"
      ? { w: Math.ceil(drawnWidthIn * 200), h: Math.ceil(drawnHeightIn * 200) }
      : null;

  return (
    <div>
      {availableSides.length > 1 && (
        <div className="mb-4 flex justify-center gap-2">
          {availableSides.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSide(s)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                s === activeSide
                  ? "border-[#18d3e8] bg-[#18d3e8]/15 text-white"
                  : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10"
              }`}
            >
              {stateBySide[s].confirmed && <span>✓</span>}
              {s === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar — above the board, matching a design-tool layout */}
      <div className="mx-auto mb-3 flex max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border-soft bg-surface px-3 py-2">
        {quality && (
          <span
            title={
              quality === "high"
                ? "Sharp at this zoom level"
                : "May look soft or blurry when printed at this zoom level"
            }
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              quality === "high"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : quality === "medium"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            {quality === "high" ? "✓ High" : quality === "medium" ? "⚠ Medium" : "⚠ Low"}
          </span>
        )}

        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setFitMode("fill")}
            className={current.fitMode === "fill" ? "text-[#d9f000]" : "text-foreground-muted hover:text-foreground"}
          >
            Fill
          </button>
          <span className="text-foreground-muted/30">/</span>
          <button
            type="button"
            onClick={() => setFitMode("fit")}
            className={current.fitMode === "fit" ? "text-[#d9f000]" : "text-foreground-muted hover:text-foreground"}
          >
            Fit
          </button>
        </div>
        <button
          type="button"
          onClick={fitToDesign}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-foreground-muted hover:bg-white/10 hover:text-foreground"
        >
          ⤢ Fit to design
        </button>

        <div className="flex flex-1 items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => adjustZoom(-0.1)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20"
            aria-label="Zoom out"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={current.zoom}
            onChange={(e) => updateSide(activeSide, { zoom: Number(e.target.value) })}
            onPointerUp={handleZoomSliderRelease}
            className="h-1 w-20 accent-[#18d3e8]"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => adjustZoom(0.1)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => rotateBy(-90)}
            title="Rotate left 90°"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20"
          >
            ⟲
          </button>
          <button
            type="button"
            onClick={() => rotateBy(90)}
            title="Rotate right 90°"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20"
          >
            ⟳
          </button>
          <button
            type="button"
            onClick={() => toggleFlip("x")}
            title="Flip horizontal (mirror)"
            aria-pressed={current.flipX}
            className={`grid h-7 w-7 place-items-center rounded-full text-sm ${current.flipX ? "bg-[#18d3e8]/20 text-[#18d3e8]" : "bg-white/10 hover:bg-white/20"}`}
          >
            ⇋
          </button>
          <button
            type="button"
            onClick={() => toggleFlip("y")}
            title="Flip vertical (mirror)"
            aria-pressed={current.flipY}
            className={`grid h-7 w-7 place-items-center rounded-full text-sm ${current.flipY ? "bg-[#18d3e8]/20 text-[#18d3e8]" : "bg-white/10 hover:bg-white/20"}`}
          >
            ⇵
          </button>

          <div className="relative" ref={alignRef}>
            <button
              type="button"
              onClick={() => setShowAlign((v) => !v)}
              title="Align"
              className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20"
            >
              ⚑
            </button>
            {showAlign && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-40 rounded-xl border border-border-strong bg-surface-elevated p-2 shadow-2xl shadow-black/40">
                <div className="grid grid-cols-3 gap-1">
                  <button type="button" onClick={() => applyAlignX("left")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Left</button>
                  <button type="button" onClick={() => applyAlignX("center")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Center</button>
                  <button type="button" onClick={() => applyAlignX("right")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Right</button>
                  <button type="button" onClick={() => applyAlignY("top")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Top</button>
                  <button type="button" onClick={() => applyAlignY("middle")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Middle</button>
                  <button type="button" onClick={() => applyAlignY("bottom")} className="rounded-md px-2 py-1.5 text-[11px] hover:bg-white/10">Bottom</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <span className="whitespace-nowrap text-[10px] font-medium text-foreground-muted">
          W:{drawnWidthIn.toFixed(2)}&quot; H:{drawnHeightIn.toFixed(2)}&quot;
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md">
        <div
          ref={containerRef}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative w-full touch-none overflow-hidden rounded-2xl border border-border-soft bg-[repeating-conic-gradient(#2a2a2a_0%_25%,#1e1e1e_0%_50%)] bg-size-[20px_20px] shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-[#18d3e8]/60"
          style={{ height: containerHeightPx || undefined, aspectRatio: `${bleedWIn} / ${bleedHIn}` }}
        >
          {currentInput && containerWidthPx > 0 && drawnWidthIn > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={activeSide}
              ref={imgRef}
              src={currentInput.fileUrl}
              alt="Your design"
              draggable={false}
              className="absolute left-0 top-0 cursor-grab select-none will-change-transform active:cursor-grabbing"
              style={{
                width: imgWidthPx,
                height: imgHeightPx,
                // Override Tailwind's preflight `img { max-width: 100% }` —
                // otherwise the browser clamps the rendered width whenever
                // the image is zoomed/filled beyond the board's own size,
                // desyncing the on-screen preview from the flattened export
                // (which draws via canvas and isn't subject to this CSS rule).
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate3d(${imgLeftPx}px, ${imgTopPx}px, 0) rotate(${current.rotation}deg) scale(${current.flipX ? -1 : 1}, ${current.flipY ? -1 : 1})`,
              }}
            />
          )}

          {/* Bleed line — outer edge */}
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-red-500/80" />
          {/* Trim line */}
          <div
            className="pointer-events-none absolute border-2 border-white/90"
            style={{
              left: `${trimLeftPct}%`,
              right: `${trimLeftPct}%`,
              top: `${trimTopPct}%`,
              bottom: `${trimTopPct}%`,
            }}
          />
          {/* Safe line */}
          <div
            className="pointer-events-none absolute border-2 border-dashed border-emerald-400/90"
            style={{
              left: `${safeLeftPct}%`,
              right: `${safeLeftPct}%`,
              top: `${safeTopPct}%`,
              bottom: `${safeTopPct}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-center gap-4 text-[10px] font-semibold uppercase tracking-wider">
          <span className="text-red-400">■ Bleed</span>
          <span className="text-white">■ Trim</span>
          <span className="text-emerald-400">■ Safe</span>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-md space-y-1 text-center">
        <p className="text-[11px] text-foreground-muted">
          Drag (or use arrow keys) to reposition. Keep important content
          inside the green safe line.
        </p>
        {recommendedPx && (
          <p className="text-[11px] text-amber-300/90">
            For crisp printing, use an image at least {recommendedPx.w}×
            {recommendedPx.h}px at this size — yours is {current.naturalWidth}×
            {current.naturalHeight}px.
          </p>
        )}
      </div>

      {error && (
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="mx-auto mt-6 max-w-md space-y-2 pb-4">
        {!current.confirmed && (
          <button
            type="button"
            disabled={finalizing || busy}
            onClick={handleConfirmSide}
            className="w-full rounded-2xl border border-[#18d3e8]/40 bg-[#18d3e8]/10 px-5 py-3 text-sm font-semibold text-[#18d3e8] transition hover:bg-[#18d3e8]/15 disabled:opacity-50"
          >
            {availableSides.length > 1
              ? `Looks good — confirm ${activeSide}`
              : "Looks good"}
          </button>
        )}
        <button
          type="button"
          disabled={!allConfirmed || finalizing || busy}
          onClick={handleContinueToCart}
          className="w-full rounded-2xl accent-gradient px-5 py-4 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finalizing || busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Preparing your design…
            </span>
          ) : (
            "Continue to Cart"
          )}
        </button>
      </div>
    </div>
  );
}
