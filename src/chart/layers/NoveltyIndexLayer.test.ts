import { describe, it, expect } from 'vitest';
import { createNoveltyIndexLayer } from './NoveltyIndexLayer';
import type { Viewport, Dims } from '@/chart/viewport';

function mockCtx() {
  const calls: string[] = [];
  const ctx = {
    save: () => {}, restore: () => {},
    fillText: (s: string) => { calls.push(s); },
    fillStyle: '', font: '', textAlign: '', textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const view: Viewport = { tLeft: 50, tRight: -50 };
const dims: Dims = { w: 400, h: 300 };

describe('createNoveltyIndexLayer', () => {
  it('renders a NOVELTY WELL readout for the 2012 wave', () => {
    const { ctx, calls } = mockCtx();
    const layer = createNoveltyIndexLayer({ offset: null });
    expect(layer.id).toBe('novelty-index');
    layer.draw(ctx, view, dims);
    expect(calls.some((s) => s.startsWith('NOVELTY WELL'))).toBe(true);
  });

  it('does not throw for the birth wave', () => {
    const { ctx } = mockCtx();
    const layer = createNoveltyIndexLayer({ offset: 15000 });
    expect(() => layer.draw(ctx, view, dims)).not.toThrow();
  });
});
