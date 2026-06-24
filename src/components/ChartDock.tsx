'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { zoomDepth, SPAN_BOUNDS, zoomTo, panBy } from '@/chart/viewport';
import { formatSpan, dateToT } from '@/chart/time';
import { novelty } from '@/chart/timewave';
import { DateGoto } from './DateGoto';
import { useBirthwave } from '@/state/BirthwaveProvider';
import { BirthdatePicker } from './BirthdatePicker';

/**
 * The beveled side dock for Layout C: span readout, a log-scale depth gauge
 * (how far into the fractal you've dived), zoom presets, and GOTO.
 */
export function ChartDock() {
  const { view, setView, setHover } = useChart();
  const [gotoOpen, setGotoOpen] = useState(false);
  const { birthday, birthwave, background, setBirthday, setBirthwave, setBackground } = useBirthwave();
  const [pickerOpen, setPickerOpen] = useState(false);
  const center = (view.tLeft + view.tRight) / 2;
  const span = view.tLeft - view.tRight;
  const depth = zoomDepth(view);
  // Navigate, dropping any sticky hover so the oracle tracks the new view centre.
  const nav = (v: Parameters<typeof setView>[0]) => { setHover(null); setView(v); };

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
            onClick={() => nav(panBy(view, span * 0.3))}
          >
            ◀
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold whitespace-nowrap"
            title="Jump to the present moment"
            onClick={() => { const t = dateToT(new Date()); nav({ tLeft: t + span / 2, tRight: t - span / 2 }); }}
          >
            NOW
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Pan to later time"
            onClick={() => nav(panBy(view, -span * 0.3))}
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
            onClick={() => nav(zoomTo(view, center, 1.25))}
          >
            −
          </button>
          <button
            type="button"
            className="wb-btn wb-out wb-btn--on flex-1 font-bold whitespace-nowrap"
            title="Zoom all the way out to the full timewave"
            onClick={() => nav({ tLeft: SPAN_BOUNDS.max / 2, tRight: -SPAN_BOUNDS.max / 2 })}
          >
            ⊟ FULL
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Zoom in"
            onClick={() => nav(zoomTo(view, center, 0.8))}
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
              onClick={() => nav(zoomTo(view, center, 1.25))}
            >
              −
            </button>
            <button
              type="button"
              className="wb-btn wb-out flex-1 font-bold"
              aria-label="Zoom in"
              onClick={() => nav(zoomTo(view, center, 0.8))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="wb-btn wb-out wb-btn--on text-left font-bold"
            title="Zoom all the way out to the full timewave"
            onClick={() => nav({ tLeft: SPAN_BOUNDS.max / 2, tRight: -SPAN_BOUNDS.max / 2 })}
          >
            ⊟ FULL WAVE
          </button>
        </div>
      </div>

      <hr className="border-t-2 border-black/40 my-0.5 w-full" />

      <div className="flex flex-col gap-1">
        <div className="wb-label">Birthwave</div>
        <button
          type="button"
          className={`wb-btn wb-out w-full font-bold ${birthwave ? 'wb-btn--on' : ''}`}
          aria-pressed={birthwave}
          title="Re-anchor the wave to your birthday"
          onClick={() => { if (!birthday) setPickerOpen(true); else setBirthwave(!birthwave); }}
        >
          BIRTHWAVE {birthwave ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="wb-btn wb-out w-full text-[11px]" onClick={() => setPickerOpen(true)}>
          BIRTHDATE… {birthday ? `(${birthday})` : ''}
        </button>
        <button
          type="button"
          className={`wb-btn wb-out w-full text-[11px] ${background ? 'wb-btn--on' : ''}`}
          aria-pressed={background}
          disabled={!birthwave}
          style={{ opacity: birthwave ? 1 : 0.5 }}
          title="Show the original 2012 wave behind the birthwave"
          onClick={() => setBackground(!background)}
        >
          2012 WAVE {background ? 'ON' : 'OFF'}
        </button>
      </div>

      <button type="button" className="wb-btn wb-out w-full mt-1" onClick={() => setGotoOpen(true)}>
        GOTO…
      </button>

      {gotoOpen && <DateGoto onClose={() => setGotoOpen(false)} />}
      {pickerOpen && (
        <BirthdatePicker
          initial={birthday}
          onSet={(iso) => { setBirthday(iso); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
