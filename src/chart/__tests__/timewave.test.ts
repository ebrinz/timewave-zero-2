import { describe, it, expect } from 'vitest';
import { novelty, interp, DATA_SET, KING_WEN, WAVE_VARIANT } from '@/chart/timewave';
import { REFERENCE_SAMPLES } from '@/chart/__fixtures__/sheliak-reference';

describe('data set + constants', () => {
  it('declares sheliak-tw1', () => { expect(WAVE_VARIANT).toBe('sheliak-tw1'); });
  it('data set has exactly 384 non-negative integers', () => {
    expect(DATA_SET).toHaveLength(384);
    for (const v of DATA_SET) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
  });
  it('King Wen is a permutation of 0..63', () => {
    expect(KING_WEN).toHaveLength(64);
    expect([...KING_WEN].sort((a,b)=>a-b)).toEqual(Array.from({length:64},(_,i)=>i));
  });
});

describe('novelty(t) fidelity', () => {
  it('is exactly 0 at the zero point', () => { expect(novelty(0)).toBe(0); });
  it('reproduces Meyer reference samples', () => {
    // Guard against silent fixture truncation: the loop below is only meaningful
    // if the fixture still carries its full set of published anchors.
    expect(REFERENCE_SAMPLES.length).toBeGreaterThanOrEqual(10);
    for (const { t, value } of REFERENCE_SAMPLES) {
      // relative tolerance ~1e-6; values span 1e-6 .. ~19
      expect(novelty(t)).toBeCloseTo(value, 6);
    }
  });
  it('interp wraps from index 383 to 0 (linear across the data-set seam)', () => {
    // At y=383.5, interp must blend DATA_SET[383] with the wrapped DATA_SET[0].
    const last = DATA_SET[383];
    const first = DATA_SET[0];
    expect(interp(383)).toBe(last);            // integer y -> exact sample
    expect(interp(384)).toBe(DATA_SET[0]);     // 384 mod 384 = 0
    expect(interp(383.5)).toBeCloseTo((first - last) * 0.5 + last, 12);
    expect(interp(383.25)).toBeCloseTo((first - last) * 0.25 + last, 12);
  });
  it('hits the clean self-similarity anchor f(24576)=3/64', () => {
    expect(novelty(24576)).toBeCloseTo(3/64, 9);
  });
  it('is symmetric about the zero point (post-eschaton mirror)', () => {
    expect(novelty(-24576)).toBeCloseTo(novelty(24576), 9);
  });
  it('is finite and non-negative across a wide sweep', () => {
    const YEAR = 365.25;
    for (let k = 0; k < 5000; k++) {
      const t = (-50000 + (k/5000)*100000) * YEAR;
      const n = novelty(t);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});
