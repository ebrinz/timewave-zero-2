import { describe, it, expect } from 'vitest';
import { novelty } from '@/chart/timewave';
describe('timewave characterization', () => {
  it('matches the recorded novelty profile over a fixed range', () => {
    const profile = Array.from({ length: 50 }, (_, i) => {
      const t = -10000 + i * 400;   // days; spans both sides of the zero point
      return Number(novelty(t).toFixed(8));
    });
    expect(profile).toMatchSnapshot();
  });
});
