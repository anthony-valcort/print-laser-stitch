/** Shared types for the client-side sticker proof / preflight engine. */

export type Point = { x: number; y: number };
export type Polygon = Point[];

export type ProofShape =
  | "custom"
  | "circle"
  | "oval"
  | "square"
  | "rectangle";

export type BorderThickness = "thin" | "normal" | "wide";

export type RoundedCorners = "none" | "soft" | "medium" | "heavy";

/** Customer-tunable proof settings (the modal controls). */
export type ProofSettings = {
  shape: ProofShape;
  removeBackground: boolean;
  borderThickness: BorderThickness;
  /** Square / Rectangle only. */
  roundedCorners: RoundedCorners;
  /** Physical sticker size in inches — drives the 300-DPI canvas. */
  widthIn: number;
  heightIn: number;
};

/** Output of the proof engine — everything the modal needs to render. */
export type ProofResult = {
  /** Canvas size in px (physical size × DPI). */
  widthPx: number;
  heightPx: number;
  dpi: number;
  /** Processed artwork (bg-removed if requested) as a data URL. */
  imageDataUrl: string;
  /** The shape the artwork is clipped to. */
  baseShape: Polygon;
  /** White border ring (filled white behind the artwork). */
  whiteBorder: Polygon;
  /** Production die-cut line (separate layer). */
  cutline: Polygon;
  lowResolution: boolean;
  warnings: string[];
};

/** Border width per tier, in inches (real sticker white-border widths). */
export const BORDER_IN: Record<BorderThickness, number> = {
  thin: 0.0625,
  normal: 0.125,
  wide: 0.1875,
};

/** Corner radius as a fraction of the shorter side, per tier. */
export const CORNER_FRACTION: Record<RoundedCorners, number> = {
  none: 0,
  soft: 0.06,
  medium: 0.14,
  heavy: 0.26,
};

/** Print resolution used for real-world sizing + low-res warnings. */
export const PRINT_DPI = 300;
/** Below this effective DPI the print looks soft. */
export const MIN_DPI = 150;
/** Extra bleed between the white border edge and the cut line, in inches. */
export const CUT_BLEED_IN = 0.03125;
