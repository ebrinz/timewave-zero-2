import { describe, it, expect } from 'vitest';
import { dateToT } from '@/chart/time';
import fixture from '@/chart/__fixtures__/time-parity.json';

describe('time parity fixture', () => {
  it('dateToT matches every fixture pair (the Python port targets this same file)', () => {
    for (const { iso, t } of fixture as Array<{ iso: string; t: number }>) {
      expect(dateToT(new Date(iso))).toBeCloseTo(t, 9);
    }
  });
});
