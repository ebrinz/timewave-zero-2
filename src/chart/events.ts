import { tToX, type Viewport, type Dims } from '@/chart/viewport';

/** A historical event snapped to the timewave (see scripts/build-events). */
export interface TimelineEvent {
  id: string; t: number; date: string; year: number;
  title: string; summary: string; url: string; score: number;
}

/** Shape of public/data/events.json. */
export interface EventsData {
  wave_variant: string; generated: string; glove: string; events: TimelineEvent[];
}

/** Min horizontal gap (px) between two kept event ticks, so labels don't pile up. */
const MIN_LABEL_GAP_PX = 70;

/**
 * Choose which events to draw: those inside the visible span, highest-score first,
 * capped at `maxLabels`, with lower-score events suppressed when they'd collide in
 * x with one already kept. Pure — drives the zoom-adaptive density.
 */
export function selectVisibleEvents(
  events: TimelineEvent[], view: Viewport, dims: Dims, maxLabels: number,
): TimelineEvent[] {
  const inView = events.filter((e) => e.t <= view.tLeft && e.t >= view.tRight);
  const byScore = [...inView].sort((a, b) => b.score - a.score);
  const kept: TimelineEvent[] = [];
  const xs: number[] = [];
  for (const e of byScore) {
    if (kept.length >= maxLabels) break;
    const x = tToX(e.t, view, dims.w);
    if (xs.every((xx) => Math.abs(xx - x) >= MIN_LABEL_GAP_PX)) { kept.push(e); xs.push(x); }
  }
  return kept;
}
