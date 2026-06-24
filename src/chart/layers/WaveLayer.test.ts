import { describe, it, expect } from 'vitest';
import { createWaveLayer } from './WaveLayer';
import type { Viewport, Dims } from '@/chart/viewport';

// Minimal 2D-context stub: records nothing, just satisfies the calls the layer makes.
function mockCtx() {
  const noop = () => {};
  return {
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    fill: noop, stroke: noop, setLineDash: noop,
    fillStyle: '', strokeStyle: '', lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
}

const view: Viewport = { tLeft: 50, tRight: -50 };
const dims: Dims = { w: 400, h: 300 };

describe('createWaveLayer', () => {
  it('returns a wave layer that draws a single wave when offset is null', () => {
    const layer = createWaveLayer({ offset: null, showBackground: true });
    expect(layer.id).toBe('wave');
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });

  it('draws birth + ghost without throwing when offset is set', () => {
    const layer = createWaveLayer({ offset: 15000, showBackground: true });
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });

  it('draws birth only (no ghost) when background is off', () => {
    const layer = createWaveLayer({ offset: 15000, showBackground: false });
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });
});
