import { describe, it, expect } from 'vitest';
import { detrend, wellProximity } from './noveltyIndex';

describe('detrend', () => {
  it('flattens a linear ramp to ~zero residuals', () => {
    const r = detrend([1, 2, 3, 4, 5]);
    for (const v of r) expect(Math.abs(v)).toBeLessThan(1e-9);
  });
});

describe('wellProximity', () => {
  it('reports proximity ~1 when the centre sits in a trough', () => {
    // lower novelty = more novel; a V puts the deepest point at the centre.
    const res = wellProximity([3, 2, 1, 2, 3], 2);
    expect(res.hasWell).toBe(true);
    expect(res.proximity).toBeCloseTo(1, 5);
  });

  it('reports no well on a monotonic (detrend-flat) window', () => {
    const res = wellProximity([1, 2, 3, 4, 5], 2);
    expect(res.hasWell).toBe(false);
    expect(res.proximity).toBe(0);
  });

  it('clamps proximity to [0, 1]', () => {
    const res = wellProximity([5, 3, 1, 3, 5, 7, 9], 2);
    expect(res.proximity).toBeGreaterThanOrEqual(0);
    expect(res.proximity).toBeLessThanOrEqual(1);
  });
});
