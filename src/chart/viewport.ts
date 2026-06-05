export interface Viewport { tLeft: number; tRight: number; }   // tLeft > tRight
export interface Dims { w: number; h: number; }

const YEAR = 365.25;
// minSpanDays: ~0.86 ms. The Sheliak wave is self-similar at every scale, so the
// only real floor is double-precision drift in waveValue() at extreme depth far
// from t=0 — near interesting dates the descent stays clean. This replaces the
// old 0.5-day floor so zoom-in keeps revealing fractal structure ("infinite zoom").
// maxSpanDays: the zoom-OUT cap — the widest view "fits the meaningful wave"
// (~12k years, comfortably containing the 10ky preset) so you can never zoom out
// into the vast, near-flat ±50k-year tails of the domain.
export const LIMITS = { maxT: 50000 * YEAR, minT: -50000 * YEAR, minSpanDays: 1e-8, maxSpanDays: 12000 * YEAR };

// Span bounds used by the depth gauge to map zoom level onto a 0..1 fraction.
// max == the zoom-out cap, so the gauge reads 0% exactly when fully zoomed out.
export const SPAN_BOUNDS = { max: LIMITS.maxSpanDays, min: LIMITS.minSpanDays };

/** 0 (fully zoomed out) .. 1 (deepest zoom) on a log scale — drives the depth gauge. */
export const zoomDepth = (v: Viewport): number => {
  const span = Math.max(SPAN_BOUNDS.min, v.tLeft - v.tRight);
  const f = (Math.log(SPAN_BOUNDS.max) - Math.log(span)) / (Math.log(SPAN_BOUNDS.max) - Math.log(SPAN_BOUNDS.min));
  return Math.min(1, Math.max(0, f));
};

export const PRESETS = [
  { label: '1y',   span: YEAR },
  { label: '10y',  span: 10 * YEAR },
  { label: '100y', span: 100 * YEAR },
  { label: '1ky',  span: 1000 * YEAR },
  { label: '10ky', span: 10000 * YEAR },
] as const;

export const tToX = (t: number, v: Viewport, w: number): number =>
  ((v.tLeft - t) / (v.tLeft - v.tRight)) * w;

export const xToT = (x: number, v: Viewport, w: number): number =>
  v.tLeft - (x / w) * (v.tLeft - v.tRight);

export function clamp(v: Viewport): Viewport {
  let { tLeft, tRight } = v;
  const { minSpanDays: min, maxSpanDays: max } = LIMITS;
  const m = (tLeft + tRight) / 2;
  const span = tLeft - tRight;
  // Pin the span to [min, max]: never zoom in past precision, never zoom out
  // past the meaningful wave. (span <= 0 also lands here and recenters.)
  if (span < min) { tLeft = m + min / 2; tRight = m - min / 2; }
  else if (span > max) { tLeft = m + max / 2; tRight = m - max / 2; }
  // Keep within the deep-time domain (only ever shrinks/shifts the span).
  tLeft = Math.min(tLeft, LIMITS.maxT);
  tRight = Math.max(tRight, LIMITS.minT);
  return { tLeft, tRight };
}

export function zoomTo(v: Viewport, anchorT: number, factor: number): Viewport {
  return clamp({
    tLeft: anchorT + (v.tLeft - anchorT) * factor,
    tRight: anchorT + (v.tRight - anchorT) * factor,
  });
}

export const panBy = (v: Viewport, deltaT: number): Viewport =>
  clamp({ tLeft: v.tLeft + deltaT, tRight: v.tRight + deltaT });
