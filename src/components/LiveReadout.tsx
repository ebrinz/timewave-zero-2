'use client';
import { useChart } from '@/state/ChartProvider';
import { tToDate, formatInstant } from '@/chart/time';

/**
 * Cursor readout overlaid on the plot. Resolution tracks zoom depth (years →
 * date → clock → sub-second), matching the title-bar instant. Hover-only: the
 * always-on instant lives in the window title bar.
 */
export function LiveReadout() {
  const { view, hover } = useChart();
  const span = view.tLeft - view.tRight;
  const text = hover ? `${formatInstant(tToDate(hover.t), span)} · novelty ${hover.novelty.toFixed(4)}` : '';
  return (
    <div className="absolute top-1 left-2 pointer-events-none">
      <span aria-hidden="true" className="text-xs tabular-nums" style={{ color: 'var(--wb-orange)' }}>{text}</span>
      <span role="status" aria-live="polite" className="sr-only">{text}</span>
    </div>
  );
}
