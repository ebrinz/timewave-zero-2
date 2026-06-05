'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { PRESETS, zoomDepth, SPAN_BOUNDS } from '@/chart/viewport';
import { formatSpan } from '@/chart/time';
import { novelty } from '@/chart/timewave';
import { DateGoto } from './DateGoto';

/**
 * The beveled side dock for Layout C: span readout, a log-scale depth gauge
 * (how far into the fractal you've dived), zoom presets, and GOTO.
 */
export function ChartDock() {
  const { view, setView } = useChart();
  const [gotoOpen, setGotoOpen] = useState(false);
  const center = (view.tLeft + view.tRight) / 2;
  const span = view.tLeft - view.tRight;
  const depth = zoomDepth(view);

  return (
    <div className="wb-panel wb-in flex flex-col gap-2 p-2 w-[150px] text-[13px]">
      <div>
        <div className="wb-label">Span</div>
        <div className="font-bold">{formatSpan(span)}</div>
      </div>

      <div>
        <div className="wb-label">Depth</div>
        <div className="wb-in h-3 bg-black/30 mt-1">
          <div className="h-full" style={{ width: `${depth * 100}%`, background: 'var(--wb-orange)' }} />
        </div>
        <div className="text-[11px] mt-0.5">{(depth * 100).toFixed(0)}% · {(span > 0 ? Math.max(1, Math.round(SPAN_BOUNDS.max / span)) : 1).toLocaleString()}×</div>
      </div>

      <div>
        <div className="wb-label">Novelty</div>
        <div className="font-bold tabular-nums">{novelty(center).toFixed(4)}</div>
      </div>

      <hr className="border-t-2 border-black/40 my-0.5" />

      <div className="flex flex-col gap-1">
        <div className="wb-label">Zoom</div>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="wb-btn wb-out text-left"
            onClick={() => setView({ tLeft: center + p.span / 2, tRight: center - p.span / 2 })}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button type="button" className="wb-btn wb-out mt-1" onClick={() => setGotoOpen(true)}>
        GOTO…
      </button>

      {gotoOpen && <DateGoto onClose={() => setGotoOpen(false)} />}
    </div>
  );
}
