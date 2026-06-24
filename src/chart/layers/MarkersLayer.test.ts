import { describe, it, expect } from 'vitest';
import { createMarkersLayer } from './MarkersLayer';
import type { Viewport, Dims } from '@/chart/viewport';

const view: Viewport = { tLeft: 1e7, tRight: -1e7 }; // wide enough to include birth markers
const dims: Dims = { w: 400, h: 300 };

describe('createMarkersLayer', () => {
  it('hit-tests the BIRTH ZERO marker at t = -offset when birthwave is on', () => {
    const offset = 15000;
    const layer = createMarkersLayer({ offset, birthday: '1987-06-23', showBackground: true });
    // Map t = -offset to its pixel x, then hit-test there.
    const x = ((view.tLeft - (-offset)) / (view.tLeft - view.tRight)) * dims.w;
    const hit = layer.hitTest!(x, 0, view, dims);
    expect(hit).not.toBeNull();
    expect(hit!.label).toContain('BIRTH ZERO');
  });

  it('has no BIRTH ZERO marker when birthwave is off', () => {
    const layer = createMarkersLayer({ offset: null, birthday: '1987-06-23', showBackground: true });
    // The 2012 zero point is at t = 0.
    const x0 = (view.tLeft / (view.tLeft - view.tRight)) * dims.w;
    const hit = layer.hitTest!(x0, 0, view, dims);
    expect(hit!.label).toContain('ZERO POINT');
  });
});
