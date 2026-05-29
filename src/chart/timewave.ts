/**
 * Sheliak Timewave (TW1) — the fidelity-critical math layer.
 *
 * This is a faithful reimplementation of Peter Meyer's wave-value function from
 * `TW_EN.C` (rev. 1993-03-09), driving the verified 384-number Sheliak data set.
 * The algorithm and provenance are documented in:
 *   src/chart/references/sheliak-algorithm.md  (Section 4 is the load-bearing part)
 *
 * The running wave consumes the verified DATA_SET directly. The King Wen -> 384
 * derivation is documented but NOT verified, so it is exported only as a
 * conceptual seed; it is never used to (re)generate the data set here.
 *
 * Source of truth for the arrays: src/chart/__fixtures__/sheliak-reference.ts
 * (the fixture IS the verified data; we re-export to keep one source of truth).
 */

import {
  KING_WEN_REFERENCE,
  DATA_SET_REFERENCE,
} from '@/chart/__fixtures__/sheliak-reference';

/** Identifies which canonical number set / variant this wave uses. */
export const WAVE_VARIANT = 'sheliak-tw1' as const;

/**
 * The 64 I Ching hexagrams in King Wen sequence (conceptual seed only — the wave
 * does NOT recompute the data set from this at runtime).
 */
export const KING_WEN: readonly number[] = KING_WEN_REFERENCE;

/**
 * The verified Sheliak (TW1) 384-number data set — the actual input to the wave
 * fractal-sum. Consumed directly; never regenerated from KING_WEN.
 */
export const DATA_SET: readonly number[] = DATA_SET_REFERENCE;

const WAVE_FACTOR = 64;
const CALC_PREC = 10;
const DATA_LEN = DATA_SET.length; // 384

/** powers[i] = 64^i, precomputed up to the highest index the algorithm needs. */
const powers: number[] = (() => {
  // term (B) caps i at CALC_PREC + 2 = 12; the convergence test reads
  // powers[CALC_PREC - i + 2] with i down to 1 -> index up to 11. Term (A)
  // never exceeds ~5 for our domain. Index 12 is the max ever touched.
  const p: number[] = [];
  for (let i = 0; i <= CALC_PREC + 2; i++) p.push(Math.pow(WAVE_FACTOR, i));
  return p;
})();

/**
 * Linear interpolation into the data set at a real position y >= 0.
 *
 *   i = floor(y) mod 384,  j = (i + 1) mod 384,  z = y - floor(y)
 *   v(y) = z == 0 ? w[i] : (w[j] - w[i]) * z + w[i]
 *
 * Matches Meyer's `v` in TW_EN.C. (`fmod(y,384)` truncated to int == floor(y) mod
 * 384 for y >= 0, which is the only domain used since wave_value takes |t|.)
 */
export function interp(y: number): number {
  const fl = Math.floor(y);
  const i = ((fl % DATA_LEN) + DATA_LEN) % DATA_LEN;
  const z = y - fl;
  if (z === 0) return DATA_SET[i];
  const j = (i + 1) % DATA_LEN;
  return (DATA_SET[j] - DATA_SET[i]) * z + DATA_SET[i];
}

/**
 * The internal wave value f(x) for x = days before the zero point, x >= 0.
 * Self-similar fractal sum from TW_EN.C. f(0) = 0 exactly.
 *
 * Summation ORDER is preserved exactly as in the C source (term A ascending i,
 * then term B ascending i) so double-precision accumulation matches the reference.
 */
export function waveValue(x: number): number {
  let sum = 0;
  if (x !== 0) {
    // (A) large scales: i = 0,1,2,... while 64^i <= x. The `i < powers.length`
    // bound is belt-and-suspenders (our domain |t| <= ~1.8e7 days only reaches
    // i=4); it guards against an out-of-range powers[] read for absurd inputs
    // instead of relying on `x >= undefined` evaluating false.
    for (let i = 0; i < powers.length && x >= powers[i]; i++) {
      sum += powers[i] * interp(x / powers[i]);
    }
    // (B) fractal small scales: i = 1,2,... until convergence
    let i = 0;
    do {
      if (++i > CALC_PREC + 2) break; // cap i at 12
      sum += interp(x * powers[i]) / powers[i];
    } while (sum < powers[CALC_PREC - i + 2]);
  }
  return sum / powers[3]; // divide by 64^3
}

/**
 * App-facing novelty. `t` = days-before-zero (PAST dates have t > 0; dates after
 * the zero point 2012-12-21 have t < 0).
 *
 * Using Math.abs(t) keeps the data-set index valid and MIRRORS the wave about the
 * zero point for post-eschaton dates. The t < 0 mirror is a visualization choice,
 * NOT part of McKenna's forward theory (the wave is only defined for days-before-
 * zero); it is provided so the app can still draw a curve for today (already past).
 */
export function novelty(t: number): number {
  return waveValue(Math.abs(t)); // f(|t|); novelty(0) === 0
}
