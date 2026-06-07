import { describe, it, expect } from 'vitest';
import { homeView, DEFAULT_VIEW } from '@/state/urlSync';
import { dateToT } from '@/chart/time';

describe('homeView', () => {
  it('centers on today with the default span', () => {
    const v = homeView();
    const center = (v.tLeft + v.tRight) / 2;
    expect(center).toBeCloseTo(dateToT(new Date()), 0);   // within ~1 day
    expect(v.tLeft - v.tRight).toBeCloseTo(DEFAULT_VIEW.tLeft - DEFAULT_VIEW.tRight, 6);
    expect(v.tLeft).toBeGreaterThan(v.tRight);
  });
});
