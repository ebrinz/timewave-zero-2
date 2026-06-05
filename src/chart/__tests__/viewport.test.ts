import { describe, it, expect } from 'vitest';
import { tToX, xToT, zoomTo, panBy, clamp, PRESETS, LIMITS, type Viewport } from '@/chart/viewport';

const view: Viewport = { tLeft: 40000, tRight: -4000 };   // past left, future right
const W = 1000;

describe('viewport math', () => {
  it('tToX/xToT are inverses', () => {
    for (const t of [-4000, 0, 12345, 40000]) {
      expect(xToT(tToX(t, view, W), view, W)).toBeCloseTo(t, 6);
    }
  });
  it('zoomTo keeps the anchor pixel stationary', () => {
    const anchorT = xToT(300, view, W);
    const zoomed = zoomTo(view, anchorT, 0.5);
    expect(tToX(anchorT, zoomed, W)).toBeCloseTo(300, 6);
  });
  it('clamp never yields tLeft <= tRight', () => {
    const bad = clamp({ tLeft: -10, tRight: 10 });
    expect(bad.tLeft).toBeGreaterThan(bad.tRight);
  });
  it('clamp respects deep-time limits', () => {
    const c = clamp({ tLeft: 1e12, tRight: -1e12 });
    expect(c.tLeft).toBeLessThanOrEqual(LIMITS.maxT);
    expect(c.tRight).toBeGreaterThanOrEqual(LIMITS.minT);
  });
  it('clamp caps zoom-out at the meaningful-wave span (never past the interface)', () => {
    const c = clamp({ tLeft: 1e9, tRight: -1e9 });
    expect(c.tLeft - c.tRight).toBeCloseTo(LIMITS.maxSpanDays, 3);
  });
  it('clamp keeps the center stationary when capping the span', () => {
    const c = clamp({ tLeft: 5000 + 1e9, tRight: 5000 - 1e9 });
    expect((c.tLeft + c.tRight) / 2).toBeCloseTo(5000, 3);
    expect(c.tLeft - c.tRight).toBeCloseTo(LIMITS.maxSpanDays, 3);
  });
  it('panBy shifts both edges equally', () => {
    const p = panBy(view, 1000);
    expect(p.tLeft - view.tLeft).toBeCloseTo(1000, 6);
    expect(p.tRight - view.tRight).toBeCloseTo(1000, 6);
  });
  it('exposes the documented zoom presets', () => {
    expect(PRESETS.map(p => p.label)).toEqual(['1y','10y','100y','1ky','10ky']);
  });
});
