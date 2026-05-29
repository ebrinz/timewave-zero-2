export interface Viewport { tLeft: number; tRight: number; }   // tLeft > tRight
export interface Dims { w: number; h: number; }

const YEAR = 365.25;
export const LIMITS = { maxT: 50000 * YEAR, minT: -50000 * YEAR, minSpanDays: 0.5 };

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
  if (tLeft <= tRight) { const m = (tLeft + tRight) / 2; tLeft = m + LIMITS.minSpanDays / 2; tRight = m - LIMITS.minSpanDays / 2; }
  if (tLeft - tRight < LIMITS.minSpanDays) { const m = (tLeft + tRight) / 2; tLeft = m + LIMITS.minSpanDays / 2; tRight = m - LIMITS.minSpanDays / 2; }
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
