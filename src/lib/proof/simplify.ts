/** Douglas–Peucker polygon simplification.
 *
 * A traced pixel contour has thousands of points — too jittery for a clean
 * cut path. We thin it down while keeping the shape faithful. `tolerance` is
 * in px (perpendicular distance below which a point is dropped).
 */

import type { Polygon, Point } from "./types";

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // Distance from point p to the line segment a→b.
  const cross = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return cross / Math.sqrt(len2);
}

function dp(points: Point[], first: number, last: number, tol: number, keep: boolean[]) {
  if (last <= first + 1) return;
  let maxDist = 0;
  let idx = -1;
  for (let i = first + 1; i < last; i++) {
    const d = perpDist(points[i], points[first], points[last]);
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }
  if (maxDist > tol && idx !== -1) {
    keep[idx] = true;
    dp(points, first, idx, tol, keep);
    dp(points, idx, last, tol, keep);
  }
}

export function simplifyPolygon(poly: Polygon, tolerance = 1.5): Polygon {
  if (poly.length < 4) return poly;
  const keep = new Array<boolean>(poly.length).fill(false);
  keep[0] = true;
  keep[poly.length - 1] = true;
  dp(poly, 0, poly.length - 1, tolerance, keep);
  const out = poly.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : poly;
}
