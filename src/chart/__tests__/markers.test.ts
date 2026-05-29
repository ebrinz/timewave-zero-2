import { describe, it, expect } from 'vitest';
import { MARKERS } from '@/chart/layers/MarkersLayer';

describe('historical markers', () => {
  it('are display decoration with a label and a finite t', () => {
    expect(MARKERS.length).toBeGreaterThan(0);
    for (const m of MARKERS) {
      expect(typeof m.label).toBe('string');
      expect(Number.isFinite(m.t)).toBe(true);
    }
  });
  it('include the zero point at t=0', () => {
    expect(MARKERS.some(m => m.t === 0)).toBe(true);
  });
});
