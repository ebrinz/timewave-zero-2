import { describe, it, expect } from 'vitest';
import { distance, midpoint, isTap, TAP_MOVE_PX } from '@/chart/gestures';

describe('gestures', () => {
  it('distance is euclidean', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it('midpoint averages both axes', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('isTap is true for travel at or under the threshold, false beyond', () => {
    expect(isTap(0)).toBe(true);
    expect(isTap(TAP_MOVE_PX)).toBe(true);
    expect(isTap(TAP_MOVE_PX + 0.01)).toBe(false);
  });
});
