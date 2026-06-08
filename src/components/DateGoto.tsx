'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { parseFuzzyDate, dateToT } from '@/chart/time';

export function DateGoto({ onClose }: { onClose: () => void }) {
  const { view, setView, setHover } = useChart();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const span = view.tLeft - view.tRight;
  const go = () => {
    try {
      const c = dateToT(parseFuzzyDate(text));
      setHover(null); // oracle tracks the jumped-to centre
      setView({ tLeft: c + span / 2, tRight: c - span / 2 });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Go to date"
      className="fixed inset-0 grid place-items-center bg-black/70"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="wb-win min-w-[280px]" onClick={(e) => e.stopPropagation()}>
        <div className="wb-title"><span className="phosphor-glow font-bold">Go To Date</span></div>
        <div className="wb-panel p-3 space-y-2">
          <label className="wb-label block" htmlFor="goto-input">Date or year (e.g. 1969-07-20, -3000)</label>
          <input
            id="goto-input"
            autoFocus
            className="wb-in bg-white text-black px-2 py-0.5 w-full"
            value={text}
            onChange={(e) => { setText(e.target.value); setErr(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
          />
          <div className="flex gap-2 pt-1">
            <button className="wb-btn wb-out" onClick={go}>OK</button>
            <button className="wb-btn wb-out" onClick={onClose}>Cancel</button>
          </div>
          {err && <p className="text-xs" style={{ color: 'var(--wb-orange)' }}>{err}</p>}
        </div>
      </div>
    </div>
  );
}
