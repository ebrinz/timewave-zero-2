/**
 * Novelty-well index. The wave has a dominant macro ramp at any zoom, so a raw
 * value buries the local structure. We DETREND (subtract the window's linear
 * least-squares fit) and then measure how deep into the nearest local trough
 * the centre sits. Lower novelty = more novel, so a deep residual reads high.
 */

export interface WellResult {
  proximity: number; // 0 (on a crest) .. 1 (sitting in a trough)
  hasWell: boolean;  // false when the detrended window has no interior trough around the centre
}

/** Remove the linear least-squares trend over evenly-spaced samples (x = index). */
export function detrend(samples: number[]): number[] {
  const n = samples.length;
  if (n < 2) return samples.slice();
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += samples[i]; sxx += i * i; sxy += i * samples[i]; }
  const denom = n * sxx - sx * sx;
  const b = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return samples.map((y, i) => y - (a + b * i));
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function wellProximity(samples: number[], centerIndex: number): WellResult {
  const r = detrend(samples);
  const n = r.length;
  if (n < 3) return { proximity: 0, hasWell: false };
  const isCrest = (i: number) => i > 0 && i < n - 1 && r[i] >= r[i - 1] && r[i] >= r[i + 1];

  // Crests immediately bracketing the centre (else the window edges).
  let lc = 0;
  for (let i = centerIndex - 1; i > 0; i--) { if (isCrest(i)) { lc = i; break; } }
  let rc = n - 1;
  for (let i = centerIndex + 1; i < n - 1; i++) { if (isCrest(i)) { rc = i; break; } }

  // Deepest residual within the bracket = the local trough.
  let trough = Infinity, ti = lc;
  for (let i = lc; i <= rc; i++) { if (r[i] < trough) { trough = r[i]; ti = i; } }

  const crest = Math.max(r[lc], r[rc]);
  const denom = crest - trough;
  if (!(denom > 0) || ti <= lc || ti >= rc) return { proximity: 0, hasWell: false };

  return { proximity: clamp01((crest - r[centerIndex]) / denom), hasWell: true };
}
