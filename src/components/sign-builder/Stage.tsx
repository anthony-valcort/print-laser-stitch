"use client";

/**
 * Real-scale preview: the customer's piece drawn on a window / door / wall /
 * van / sign board next to a 5′9″ person, so "24 × 18 inches" finally means
 * something. Drag the piece to move it, drag the corner dot to resize.
 *
 * Everything inside the <svg> is in INCHES.
 */

import { useId, useRef, useState } from "react";
import {
  fmtFtIn,
  getMaterial,
  getSurface,
  MAX_SIDE_IN,
  type MaterialKey,
  type ShapeKey,
  type SurfaceKey,
} from "@/lib/sign-decal-pricing";

export type StagePiece = {
  surface: SurfaceKey;
  shape: ShapeKey;
  material: MaterialKey;
  widthIn: number;
  heightIn: number;
  /** Visual placement — inches from the surface centre. */
  offsetX: number;
  offsetY: number;
  label: string;
  imageUrl?: string | null;
};

type Rect = { x: number; y: number; w: number; h: number };

const PERSON_H = 69;
const PERSON_W = 24;
const GAP = 18;

/** Where the surface sits in the scene (ground is y = 0, up is negative). */
export function surfaceRect(key: SurfaceKey): Rect {
  const s = getSurface(key)!;
  const x = PERSON_W + GAP;
  const bottom = key === "window" ? -30 : key === "sign" ? -30 : 0;
  return { x, y: bottom - s.refH, w: s.refW, h: s.refH };
}

function snap(v: number) {
  const step = v < 48 ? 0.5 : 1;
  return Math.round(v / step) * step;
}

export default function Stage({
  piece,
  onChange,
  interactive = true,
  className = "",
}: {
  piece: StagePiece;
  onChange?: (patch: Partial<StagePiece>) => void;
  interactive?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<null | {
    mode: "move" | "resize";
    px: number;
    py: number;
    ox: number;
    oy: number;
    left: number;
    top: number;
  }>(null);
  const [frozenVB, setFrozenVB] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const surf = getSurface(piece.surface)!;
  const S = surfaceRect(piece.surface);
  const w = Math.max(0.5, piece.widthIn || 0);
  const h = Math.max(0.5, piece.heightIn || 0);
  const hasSize = piece.widthIn > 0 && piece.heightIn > 0;

  const scx = S.x + S.w / 2;
  const scy = S.y + S.h / 2;
  const cx = scx + piece.offsetX;
  const cy = scy + piece.offsetY;
  const P: Rect = { x: cx - w / 2, y: cy - h / 2, w, h };

  // View box: person + surface + piece, with room for labels.
  const minX = Math.min(-6, P.x - 6);
  const maxX = Math.max(S.x + S.w + 6, P.x + P.w + 16);
  const minY = Math.min(-PERSON_H - 16, S.y - 10, P.y - 14);
  const maxY = 10;
  const vbW = maxX - minX;
  const vbH = maxY - minY;
  const pad = Math.max(vbW, vbH) * 0.04;
  const liveVB = `${minX - pad} ${minY - pad} ${vbW + pad * 2} ${vbH + pad * 2}`;
  const viewBox = frozenVB ?? liveVB;
  const fs = Math.max(3, (vbW + pad * 2) / 30);

  const mat = getMaterial(piece.material);
  const look = mat?.look ?? "print";

  function toSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function start(mode: "move" | "resize", e: React.PointerEvent) {
    if (!interactive || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e.clientX, e.clientY);
    drag.current = {
      mode,
      px: p.x,
      py: p.y,
      ox: piece.offsetX,
      oy: piece.offsetY,
      left: P.x,
      top: P.y,
    };
    setFrozenVB(liveVB);
    setDragging(true);
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !onChange) return;
    const p = toSvg(e.clientX, e.clientY);
    if (d.mode === "move") {
      const limX = Math.max(S.w / 2, w / 2);
      const limY = Math.max(S.h / 2, h / 2);
      const nx = Math.max(-limX, Math.min(limX, d.ox + (p.x - d.px)));
      const ny = Math.max(-limY, Math.min(limY, d.oy + (p.y - d.py)));
      onChange({ offsetX: Math.round(nx), offsetY: Math.round(ny) });
    } else {
      const nw = Math.min(MAX_SIDE_IN, Math.max(1, snap(p.x - d.left)));
      const nh = Math.min(MAX_SIDE_IN, Math.max(1, snap(p.y - d.top)));
      onChange({
        widthIn: nw,
        heightIn: nh,
        offsetX: Math.round(d.left + nw / 2 - scx),
        offsetY: Math.round(d.top + nh / 2 - scy),
      });
    }
  }

  function end() {
    drag.current = null;
    setFrozenVB(null);
    setDragging(false);
  }

  const handleR = fs * 0.75;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={`block h-full w-full select-none ${className}`}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label={`${fmtFtIn(w)} wide by ${fmtFtIn(h)} tall ${mat?.label ?? ""} on a ${surf.label.toLowerCase()}`}
    >
      <defs>
        <linearGradient id={`print-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#18d3e8" />
          <stop offset="55%" stopColor="#7be3a0" />
          <stop offset="100%" stopColor="#d9f000" />
        </linearGradient>
        <linearGradient id={`special-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="35%" stopColor="#f5f5f5" />
          <stop offset="60%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#e4e4e7" />
        </linearGradient>
        <pattern id={`perf-${uid}`} width="1.4" height="1.4" patternUnits="userSpaceOnUse">
          <circle cx="0.7" cy="0.7" r="0.38" fill="rgba(0,0,0,0.55)" />
        </pattern>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1d3a4a" />
          <stop offset="100%" stopColor="#0d1a22" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <ShapePath shape={piece.shape} box={P} />
        </clipPath>
      </defs>

      {/* ground */}
      <rect x={minX - 400} y={0} width={vbW + 800} height={200} fill="rgba(255,255,255,0.035)" />
      <line x1={minX - 400} x2={maxX + 400} y1={0} y2={0} stroke="rgba(255,255,255,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />

      <Backdrop surface={piece.surface} S={S} glass={`url(#glass-${uid})`} />

      <Person fs={fs} />

      {/* the piece */}
      {hasSize && (
        <g
          style={{ cursor: interactive ? (dragging ? "grabbing" : "grab") : "default", touchAction: "none" }}
          onPointerDown={(e) => start("move", e)}
        >
          {piece.shape === "contour" && !piece.imageUrl ? (
            <>
              <rect x={P.x} y={P.y} width={P.w} height={P.h} fill="rgba(217,240,0,0.05)" stroke="rgba(217,240,0,0.55)" strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <FitText r={P} text={piece.label || "YOUR LOGO"} fill={look === "tint" ? "#0b1220" : look === "special" ? `url(#special-${uid})` : look === "solid" ? "#f4f4f5" : `url(#print-${uid})`} />
            </>
          ) : (
            <g clipPath={`url(#clip-${uid})`}>
              <rect
                x={P.x}
                y={P.y}
                width={P.w}
                height={P.h}
                fill={
                  look === "tint"
                    ? "rgba(5,10,18,0.72)"
                    : look === "solid"
                      ? "#f4f4f5"
                      : look === "special"
                        ? `url(#special-${uid})`
                        : piece.imageUrl
                          ? "#ffffff"
                          : `url(#print-${uid})`
                }
              />
              {piece.imageUrl && look !== "tint" && (
                <image href={piece.imageUrl} x={P.x} y={P.y} width={P.w} height={P.h} preserveAspectRatio="xMidYMid meet" />
              )}
              {!piece.imageUrl && piece.label && look !== "tint" && (
                <FitText r={{ x: P.x + P.w * 0.08, y: P.y + P.h * 0.12, w: P.w * 0.84, h: P.h * 0.76 }} text={piece.label} fill={look === "solid" || look === "special" ? "#111" : "#0a0a0a"} />
              )}
              {look === "perf" && <rect x={P.x} y={P.y} width={P.w} height={P.h} fill={`url(#perf-${uid})`} />}
              {look === "tint" && (
                <path d={`M${P.x} ${P.y + P.h * 0.35} L${P.x + P.w * 0.35} ${P.y} L${P.x + P.w * 0.5} ${P.y} L${P.x} ${P.y + P.h * 0.5} Z`} fill="rgba(255,255,255,0.06)" />
              )}
            </g>
          )}
          <ShapePath shape={piece.shape === "contour" ? "rect" : piece.shape} box={P} fill="none" stroke={piece.shape === "contour" ? "none" : "rgba(255,255,255,0.85)"} strokeWidth={1.5} />

          {/* width dimension */}
          <g fill="#d9f000" stroke="#d9f000">
            <line x1={P.x} x2={P.x + P.w} y1={P.y - fs * 0.7} y2={P.y - fs * 0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={P.x} x2={P.x} y1={P.y - fs * 1.0} y2={P.y - fs * 0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={P.x + P.w} x2={P.x + P.w} y1={P.y - fs * 1.0} y2={P.y - fs * 0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={P.x + P.w / 2} y={P.y - fs * 1.05} fontSize={fs} textAnchor="middle" stroke="none" fontWeight={800} style={{ paintOrder: "stroke" }}>
              {fmtFtIn(w)}
            </text>
          </g>
          {/* height dimension */}
          <g fill="#ff7ad9" stroke="#ff7ad9">
            <line x1={P.x + P.w + fs * 0.7} x2={P.x + P.w + fs * 0.7} y1={P.y} y2={P.y + P.h} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={P.x + P.w + fs * 0.4} x2={P.x + P.w + fs * 1.0} y1={P.y} y2={P.y} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={P.x + P.w + fs * 0.4} x2={P.x + P.w + fs * 1.0} y1={P.y + P.h} y2={P.y + P.h} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text
              x={P.x + P.w + fs * 1.35}
              y={P.y + P.h / 2}
              fontSize={fs}
              textAnchor="middle"
              stroke="none"
              fontWeight={800}
              transform={`rotate(90 ${P.x + P.w + fs * 1.35} ${P.y + P.h / 2})`}
            >
              {fmtFtIn(h)}
            </text>
          </g>
        </g>
      )}

      {/* resize handle */}
      {hasSize && interactive && onChange && (
        <g style={{ cursor: "nwse-resize", touchAction: "none" }} onPointerDown={(e) => start("resize", e)}>
          <circle cx={P.x + P.w} cy={P.y + P.h} r={handleR * 2.2} fill="transparent" />
          <circle cx={P.x + P.w} cy={P.y + P.h} r={handleR} fill="#d9f000" stroke="#000" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <circle cx={P.x + P.w} cy={P.y + P.h} r={handleR * 0.35} fill="#000" />
        </g>
      )}
    </svg>
  );
}

// ─── pieces ───────────────────────────────────────────────────────────────

type ShapeExtra = Omit<React.SVGProps<SVGRectElement>, "ref" | "r">;

export function ShapePath({
  shape,
  box,
  ...rest
}: { shape: ShapeKey; box: Rect } & ShapeExtra) {
  if (shape === "oval") {
    return (
      <ellipse
        cx={box.x + box.w / 2}
        cy={box.y + box.h / 2}
        rx={box.w / 2}
        ry={box.h / 2}
        vectorEffect="non-scaling-stroke"
        {...(rest as Omit<React.SVGProps<SVGEllipseElement>, "ref">)}
      />
    );
  }
  const rad = shape === "rounded" ? Math.min(box.w, box.h) * 0.18 : 0;
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      rx={rad}
      vectorEffect="non-scaling-stroke"
      {...rest}
    />
  );
}

function FitText({ r, text, fill }: { r: Rect; text: string; fill: string }) {
  const t = text.slice(0, 60);
  const lines = t.split(/\n/).slice(0, 3);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const size = Math.max(0.5, Math.min(r.h / (lines.length * 1.15), (r.w / longest) * 1.6));
  const startY = r.y + r.h / 2 - ((lines.length - 1) * size * 1.1) / 2;
  return (
    <text
      x={r.x + r.w / 2}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontWeight={900}
      style={{ fontFamily: "var(--font-display, system-ui)", letterSpacing: "-0.02em" }}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={r.x + r.w / 2} y={startY + i * size * 1.1} textLength={l.length * size * 0.62 > r.w ? r.w : undefined} lengthAdjust="spacingAndGlyphs">
          {l}
        </tspan>
      ))}
    </text>
  );
}

function Person({ fs }: { fs: number }) {
  return (
    <g>
      <g fill="rgba(255,255,255,0.16)" transform={`translate(0 ${-PERSON_H})`}>
        <circle cx={12} cy={5.5} r={5} />
        <rect x={5} y={12} width={14} height={25} rx={5} />
        <rect x={1} y={13} width={4} height={23} rx={2} />
        <rect x={19} y={13} width={4} height={23} rx={2} />
        <rect x={6} y={34} width={5.6} height={35} rx={2.6} />
        <rect x={12.4} y={34} width={5.6} height={35} rx={2.6} />
      </g>
      <text x={12} y={-PERSON_H - fs * 0.6} fontSize={fs * 0.8} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontWeight={700}>
        5′9″
      </text>
    </g>
  );
}

function Backdrop({ surface, S, glass }: { surface: SurfaceKey; S: Rect; glass: string }) {
  const stroke = "rgba(255,255,255,0.35)";
  const nss = { vectorEffect: "non-scaling-stroke" as const };
  switch (surface) {
    case "window":
      return (
        <g>
          <rect x={S.x - 14} y={S.y - 18} width={S.w + 28} height={-(S.y - 18)} fill="#1b1b1f" />
          <rect x={S.x - 3} y={S.y - 3} width={S.w + 6} height={S.h + 6} fill="#2a2a30" />
          <rect x={S.x} y={S.y} width={S.w} height={S.h} fill={glass} stroke={stroke} strokeWidth={1} {...nss} />
          <path d={`M${S.x + S.w * 0.08} ${S.y + S.h} L${S.x + S.w * 0.55} ${S.y} L${S.x + S.w * 0.68} ${S.y} L${S.x + S.w * 0.21} ${S.y + S.h} Z`} fill="rgba(255,255,255,0.04)" />
          <rect x={S.x - 6} y={S.y + S.h + 3} width={S.w + 12} height={3} fill="#3a3a42" />
        </g>
      );
    case "door":
      return (
        <g>
          <rect x={S.x - 30} y={S.y - 16} width={S.w + 60} height={-(S.y - 16)} fill="#1b1b1f" />
          <rect x={S.x - 3} y={S.y - 3} width={S.w + 6} height={S.h + 3} fill="#2a2a30" />
          <rect x={S.x} y={S.y} width={S.w} height={S.h} fill={glass} stroke={stroke} strokeWidth={1} {...nss} />
          <path d={`M${S.x + 4} ${S.y + S.h} L${S.x + S.w * 0.8} ${S.y} L${S.x + S.w} ${S.y} L${S.x + S.w * 0.28} ${S.y + S.h} Z`} fill="rgba(255,255,255,0.035)" />
          <rect x={S.x + S.w - 6} y={S.y + 36} width={2} height={14} rx={1} fill="#9ca3af" />
          <rect x={S.x} y={S.y + S.h - 8} width={S.w} height={8} fill="#2a2a30" />
        </g>
      );
    case "wall":
      return (
        <g>
          <rect x={S.x} y={S.y} width={S.w} height={S.h} fill="#26262b" stroke={stroke} strokeWidth={1} {...nss} />
          <rect x={S.x} y={S.y + S.h - 5} width={S.w} height={5} fill="#34343b" />
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={S.x + S.w * f} x2={S.x + S.w * f} y1={S.y} y2={S.y + S.h - 5} stroke="rgba(255,255,255,0.03)" strokeWidth={1} {...nss} />
          ))}
        </g>
      );
    case "vehicle": {
      const X = S.x;
      const Y = S.y;
      return (
        <g>
          <path
            d={`M${X} ${Y + 18} Q${X} ${Y + 6} ${X + 12} ${Y + 6} L${X + 158} ${Y + 6} Q${X + 170} ${Y + 6} ${X + 178} ${Y + 16} L${X + 206} ${Y + 46} Q${X + 226} ${Y + 50} ${X + 228} ${Y + 62} L${X + 228} ${Y + 82} L${X} ${Y + 82} Z`}
            fill="#e8e8ea"
            stroke={stroke}
            strokeWidth={1}
            {...nss}
          />
          <path d={`M${X + 168} ${Y + 14} L${X + 198} ${Y + 46} L${X + 168} ${Y + 46} Z`} fill="#1d2a33" />
          <rect x={X + 132} y={Y + 14} width={30} height={28} rx={3} fill="#1d2a33" />
          <line x1={X + 128} x2={X + 128} y1={Y + 8} y2={Y + 82} stroke="rgba(0,0,0,0.18)" strokeWidth={1} {...nss} />
          <line x1={X + 166} x2={X + 166} y1={Y + 46} y2={Y + 82} stroke="rgba(0,0,0,0.18)" strokeWidth={1} {...nss} />
          <rect x={X + 220} y={Y + 64} width={8} height={6} rx={2} fill="#fbbf24" />
          {[46, 190].map((cx) => (
            <g key={cx}>
              <circle cx={X + cx} cy={Y + 84} r={14} fill="#111" />
              <circle cx={X + cx} cy={Y + 84} r={7} fill="#6b7280" />
            </g>
          ))}
        </g>
      );
    }
    case "sign":
      return (
        <g>
          <rect x={S.x + 12} y={S.y + S.h} width={4} height={-(S.y + S.h)} fill="#3a3a42" />
          <rect x={S.x + S.w - 16} y={S.y + S.h} width={4} height={-(S.y + S.h)} fill="#3a3a42" />
          <rect x={S.x} y={S.y} width={S.w} height={S.h} fill="#f4f4f5" stroke={stroke} strokeWidth={1} {...nss} />
        </g>
      );
  }
}

/** Small static thumbnail of a piece's shape — used in the pieces tray. */
export function ShapeThumb({
  shape,
  w,
  h,
  active,
}: {
  shape: ShapeKey;
  w: number;
  h: number;
  active?: boolean;
}) {
  const box = 28;
  const ratio = w > 0 && h > 0 ? w / h : 1;
  const tw = ratio >= 1 ? box : box * ratio;
  const th = ratio >= 1 ? box / ratio : box;
  const r = { x: (32 - tw) / 2, y: (32 - th) / 2, w: Math.max(2, tw), h: Math.max(2, th) };
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
      {shape === "contour" ? (
        <text x={16} y={17} fontSize={12} textAnchor="middle" dominantBaseline="central" fontWeight={900} fill={active ? "#d9f000" : "rgba(255,255,255,0.7)"}>
          Aa
        </text>
      ) : (
        <ShapePath shape={shape} box={r} fill={active ? "#d9f000" : "rgba(255,255,255,0.25)"} />
      )}
    </svg>
  );
}
