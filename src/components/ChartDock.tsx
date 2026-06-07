'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { zoomDepth, SPAN_BOUNDS, zoomTo, panBy } from '@/chart/viewport';
import { formatSpan, dateToT } from '@/chart/time';
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
    <div className="wb-panel wb-in flex flex-col gap-2 p-2 w-full sm:w-[150px] text-[13px]">
      {/* Stat readouts: a row on phones, a column in the desktop side-dock. */}
      <div className="flex flex-row sm:flex-col gap-4 sm:gap-2">
        <div>
          <div className="wb-label">Span</div>
          <div className="font-bold">{formatSpan(span)}</div>
        </div>

        <div className="flex-1 sm:flex-none min-w-0">
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
      </div>

      <hr className="border-t-2 border-black/40 my-0.5 hidden sm:block w-full" />

      {/* Navigate: pan a third of a screen earlier/later, or jump to the present. */}
      <div className="flex flex-col gap-1">
        <div className="wb-label">Go</div>
        <div className="flex gap-1">
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Pan to earlier time"
            onClick={() => setView(panBy(view, span * 0.3))}
          >
            ◀
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold whitespace-nowrap"
            title="Jump to the present moment"
            onClick={() => { const t = dateToT(new Date()); setView({ tLeft: t + span / 2, tRight: t - span / 2 }); }}
          >
            NOW
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Pan to later time"
            onClick={() => setView(panBy(view, -span * 0.3))}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="wb-label">Zoom</div>

        {/* Phones: one grouped row — zoom out · reset · zoom in. */}
        <div className="flex gap-1 sm:hidden">
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Zoom out"
            onClick={() => setView(zoomTo(view, center, 1.25))}
          >
            −
          </button>
          <button
            type="button"
            className="wb-btn wb-out wb-btn--on flex-1 font-bold whitespace-nowrap"
            title="Zoom all the way out to the full timewave"
            onClick={() => setView({ tLeft: SPAN_BOUNDS.max / 2, tRight: -SPAN_BOUNDS.max / 2 })}
          >
            ⊟ FULL
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Zoom in"
            onClick={() => setView(zoomTo(view, center, 0.8))}
          >
            +
          </button>
        </div>

        {/* Desktop side-dock: −/+ row, then the prominent full-wave reset. */}
        <div className="hidden sm:flex sm:flex-col gap-1">
          <div className="flex gap-1">
            <button
              type="button"
              className="wb-btn wb-out flex-1 font-bold"
              aria-label="Zoom out"
              onClick={() => setView(zoomTo(view, center, 1.25))}
            >
              −
            </button>
            <button
              type="button"
              className="wb-btn wb-out flex-1 font-bold"
              aria-label="Zoom in"
              onClick={() => setView(zoomTo(view, center, 0.8))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="wb-btn wb-out wb-btn--on text-left font-bold"
            title="Zoom all the way out to the full timewave"
            onClick={() => setView({ tLeft: SPAN_BOUNDS.max / 2, tRight: -SPAN_BOUNDS.max / 2 })}
          >
            ⊟ FULL WAVE
          </button>
        </div>
      </div>

      <button type="button" className="wb-btn wb-out w-full mt-1" onClick={() => setGotoOpen(true)}>
        GOTO…
      </button>

      {gotoOpen && <DateGoto onClose={() => setGotoOpen(false)} />}
    </div>
  );
}
