'use client';
import { useChart } from '@/state/ChartProvider';
import { tToDate, formatDate } from '@/chart/time';

export function LiveReadout() {
  const { hover } = useChart();
  const text = hover ? `${formatDate(tToDate(hover.t))} · novelty ${hover.novelty.toFixed(4)}` : '';
  return (
    <div className="absolute top-1 left-2 pointer-events-none">
      <span aria-hidden="true" className="text-xs text-[var(--tw-dim)]">{text}</span>
      <span role="status" aria-live="polite" className="sr-only">{text}</span>
    </div>
  );
}
