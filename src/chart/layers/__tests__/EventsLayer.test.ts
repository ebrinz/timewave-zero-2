import { describe, it, expect } from 'vitest';
import { createEventsLayer } from '@/chart/layers/EventsLayer';
import type { EventsData } from '@/chart/events';
import type { Viewport, Dims } from '@/chart/viewport';

const data: EventsData = {
  wave_variant: 'sheliak-tw1', generated: '2026-06-06', glove: 'x',
  events: [{ id: 'Q1', t: 50, date: '2000-01-01', year: 2000, title: 'Test Event', summary: '', url: '', score: 1 }],
};
const view: Viewport = { tLeft: 100, tRight: 0 };
const dims: Dims = { w: 1000, h: 400 };

describe('createEventsLayer', () => {
  it('is invisible with null data and visible with events', () => {
    expect(createEventsLayer(null).visible(view)).toBe(false);
    expect(createEventsLayer(data).visible(view)).toBe(true);
  });

  it('hitTest returns the event under the cursor x', () => {
    const layer = createEventsLayer(data);
    const x = (1 - 50 / 100) * 1000; // tToX(50) = 500
    const hit = layer.hitTest!(x, 0, view, dims);
    expect(hit?.kind).toBe('event');
    expect(hit?.label).toContain('Test Event');
  });
});
