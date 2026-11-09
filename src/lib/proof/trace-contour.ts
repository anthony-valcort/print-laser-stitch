/** Trace the artwork outline from its alpha channel (custom die-cut shape).
 *
 * Pure browser implementation: build a binary mask from the alpha channel,
 * keep the largest connected blob, then Moore-neighbour boundary-trace it.
 * Tracing is done on a downscaled mask for speed, then scaled back to the
 * original image coordinate space.
 */

import type { Point, Polygon } from "./types";

const ALPHA_THRESHOLD = 16;
const MAX_TRACE_DIM = 600; // downscale ceiling for the working mask

// 8-neighbourhood, clockwise, starting West.
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [-1, -1], [0, -1], [1, -1],
  [1, 0], [1, 1], [0, 1], [-1, 1],
];

function buildMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (data[p + 3] > ALPHA_THRESHOLD) mask[i] = 1;
  }
  return mask;
}

// A traced die-cut has to be one contiguous piece of vinyl — it can't be cut
// into disconnected floating islands. If the largest blob doesn't account
// for nearly all the opaque pixels, the art is really multiple separate
// pieces (e.g. a photo collage), and tracing "the biggest one" would silently
// throw away the rest. DOMINANT_RATIO draws the line between that case and
// ordinary single-subject art with a few stray anti-aliased/noise pixels.
const DOMINANT_RATIO = 0.9;

/** Keep only the largest 4-connected foreground component, unless it isn't
 * clearly the *only* significant one — see DOMINANT_RATIO above. */
function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array | null {
  const label = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  let best = -1;
  let bestSize = 0;
  let totalSize = 0;
  let cur = 0;

  for (let s = 0; s < mask.length; s++) {
    if (mask[s] !== 1 || label[s] !== -1) continue;
    let size = 0;
    stack.length = 0;
    stack.push(s);
    label[s] = cur;
    while (stack.length) {
      const idx = stack.pop() as number;
      size++;
      const x = idx % w;
      const y = (idx - x) / w;
      if (x > 0 && mask[idx - 1] === 1 && label[idx - 1] === -1) {
        label[idx - 1] = cur;
        stack.push(idx - 1);
      }
      if (x < w - 1 && mask[idx + 1] === 1 && label[idx + 1] === -1) {
        label[idx + 1] = cur;
        stack.push(idx + 1);
      }
      if (y > 0 && mask[idx - w] === 1 && label[idx - w] === -1) {
        label[idx - w] = cur;
        stack.push(idx - w);
      }
      if (y < h - 1 && mask[idx + w] === 1 && label[idx + w] === -1) {
        label[idx + w] = cur;
        stack.push(idx + w);
      }
    }
    totalSize += size;
    if (size > bestSize) {
      bestSize = size;
      best = cur;
    }
    cur++;
  }

  if (best === -1 || bestSize < totalSize * DOMINANT_RATIO) return null;

  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) if (label[i] === best) out[i] = 1;
  return out;
}

function mooreTrace(mask: Uint8Array, w: number, h: number): Point[] {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;

  // First foreground pixel in raster order.
  let start = -1;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      start = i;
      break;
    }
  }
  if (start === -1) return [];

  const sx = start % w;
  const sy = (start - sx) / w;
  const contour: Point[] = [{ x: sx, y: sy }];

  let px = sx;
  let py = sy;
  let fromDir = 0; // we entered the start pixel from the West
  const maxSteps = 8 * (w + h) * 4 + 1000;

  for (let step = 0; step < maxSteps; step++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (fromDir + k) % 8;
      const nx = px + DIRS[d][0];
      const ny = py + DIRS[d][1];
      if (at(nx, ny)) {
        px = nx;
        py = ny;
        fromDir = (d + 4) % 8; // direction back toward the previous pixel
        contour.push({ x: px, y: py });
        moved = true;
        break;
      }
    }
    if (!moved) break; // isolated pixel
    if (px === sx && py === sy && contour.length > 2) break;
  }
  return contour;
}

/** Grow the mask by `r` pixels (square structuring element, separable). */
function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let last = -1e9;
    // forward: distance since last foreground
    const fwd = new Int32Array(w);
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) last = x;
      fwd[x] = x - last;
    }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[row + x]) last = x;
      if (fwd[x] <= r || last - x <= r) tmp[row + x] = 1;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    const fwd = new Int32Array(h);
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      fwd[y] = y - last;
    }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (fwd[y] <= r || last - y <= r) out[y * w + x] = 1;
    }
  }
  return out;
}

/** Convex hull of every foreground pixel — last resort so a sticker made of
 * separate pieces still gets one cut line around the whole thing. */
function convexHull(mask: Uint8Array, w: number, h: number): Point[] {
  const pts: Point[] = [];
  for (let y = 0; y < h; y++) {
    let l = -1;
    let rr = -1;
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        if (l < 0) l = x;
        rr = x;
      }
    }
    if (l >= 0) {
      pts.push({ x: l, y });
      if (rr !== l) pts.push({ x: rr, y });
    }
  }
  pts.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Returns the artwork's outer outline as a polygon in the ORIGINAL image
 * pixel coordinate space, or null if nothing opaque was found.
 */
export function traceAlphaContour(img: ImageData): Polygon | null {
  const { width: ow, height: oh, data } = img;

  const scale = Math.min(1, MAX_TRACE_DIM / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * scale));
  const h = Math.max(1, Math.round(oh * scale));

  let mask: Uint8Array;
  if (scale === 1) {
    mask = buildMask(data, ow, oh);
  } else {
    // Nearest-neighbour downsample of the alpha channel.
    mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(oh - 1, Math.floor(y / scale));
      for (let x = 0; x < w; x++) {
        const sx = Math.min(ow - 1, Math.floor(x / scale));
        if (data[(sy * ow + sx) * 4 + 3] > ALPHA_THRESHOLD) mask[y * w + x] = 1;
      }
    }
  }

  let any = false;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      any = true;
      break;
    }
  }
  if (!any) return null;

  // One piece? Trace it. Several pieces (e.g. a logo with separate letters)?
  // Bridge small gaps by growing the mask a little, then trace; if the
  // pieces are far apart, wrap them all in a convex outline instead.
  let blob = largestComponent(mask, w, h);
  if (!blob) {
    const dim = Math.max(w, h);
    for (const frac of [0.02, 0.04, 0.07]) {
      const grown = dilate(mask, w, h, Math.max(2, Math.round(dim * frac)));
      blob = largestComponent(grown, w, h);
      if (blob) break;
    }
  }
  let traced: Point[];
  if (blob) {
    traced = mooreTrace(blob, w, h);
  } else {
    traced = convexHull(mask, w, h);
  }
  if (traced.length < 3) return null;

  // Back to original coordinates.
  const inv = 1 / scale;
  return traced.map((p) => ({ x: p.x * inv, y: p.y * inv }));
}
