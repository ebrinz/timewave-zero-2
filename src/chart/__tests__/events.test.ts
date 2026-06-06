import { describe, it, expect } from 'vitest';
import { selectVisibleEvents, type TimelineEvent } from '@/chart/events';
import type { Viewport, Dims } from '@/chart/viewport';

const ev = (id: string, t: number, score: number): TimelineEvent =>
  ({ id, t, date: '2000-01-01', year: 2000, title: id, summary: '', url: '', score });

const view: Viewport = { tLeft: 100, tRight: 0 };   // visible t in [0,100]
const dims: Dims = { w: 1000, h: 400 };             // 1px ≈ 0.1 t

describe('selectVisibleEvents', () => {
  it('drops events outside the visible t range', () => {
    const out = selectVisibleEvents([ev('in', 50, 1), ev('out', 250, 1)], view, dims, 10);
    expect(out.map((e) => e.id)).toEqual(['in']);
  });

  it('caps at maxLabels, keeping the highest-score events', () => {
    const evs = [ev('a', 10, 0.2), ev('b', 50, 0.9), ev('c', 90, 0.5)];
    const out = selectVisibleEvents(evs, view, dims, 2);
    expect(out.map((e) => e.id).sort()).toEqual(['b', 'c']); // top-2 by score
  });

  it('suppresses lower-score events that collide in x with a kept one', () => {
    // t=50 and t=50.5 are ~5px apart (< 70px gap) → only the higher score survives
    const out = selectVisibleEvents([ev('hi', 50, 0.9), ev('lo', 50.5, 0.1)], view, dims, 10);
    expect(out.map((e) => e.id)).toEqual(['hi']);
  });
});
