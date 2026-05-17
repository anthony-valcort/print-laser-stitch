/** Outward polygon offsetting via clipper-lib — used for the white border
 * and the die-cut line. Round joins keep corners production-friendly (no
 * sharp messy spikes). Clipper works on integers, so we scale up/down. */

import ClipperLib from "clipper-lib";
import type { Polygon } from "./types";

const SCALE = 100; // sub-pixel precision for the integer clipper

function ringArea(ring: { X: number; Y: number }[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    a += p.X * q.Y - q.X * p.Y;
  }
  return a / 2;
}

/** Expand a closed polygon outward by `deltaPx`. Returns the largest
 * resulting ring (the outer one). */
export function offsetPolygon(poly: Polygon, deltaPx: number): Polygon {
  if (poly.length < 3) return poly;
  if (deltaPx === 0) return poly.map((p) => ({ ...p }));

  const path = poly.map((p) => ({
    X: Math.round(p.x * SCALE),
    Y: Math.round(p.y * SCALE),
  }));

  const co = new ClipperLib.ClipperOffset();
  co.AddPath(
    path,
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  );
  const solution: { X: number; Y: number }[][] = [];
  co.Execute(solution, deltaPx * SCALE);

  if (!solution.length) return poly.map((p) => ({ ...p }));

  let best = solution[0];
  let bestArea = Math.abs(ringArea(best));
  for (let i = 1; i < solution.length; i++) {
    const a = Math.abs(ringArea(solution[i]));
    if (a > bestArea) {
      bestArea = a;
      best = solution[i];
    }
  }
  return best.map((p) => ({ x: p.X / SCALE, y: p.Y / SCALE }));
}
