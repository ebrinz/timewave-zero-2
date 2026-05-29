'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { parseFuzzyDate, dateToT } from '@/chart/time';

export function DateGoto({ onClose }: { onClose: () => void }) {
  const { view, setView } = useChart();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const span = view.tLeft - view.tRight;
  const go = () => {
    try {
      const c = dateToT(parseFuzzyDate(text));
      setView({ tLeft: c + span / 2, tRight: c - span / 2 });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div
      role="dialog"
      aria-label="Go to date"
      className="fixed inset-0 grid place-items-center bg-black/70"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="border border-[#163] bg-[#06090a] p-4 space-y-2">
        <label className="block text-xs" htmlFor="goto-input">GO TO DATE</label>
        <input
          id="goto-input"
          autoFocus
          className="bg-black border border-[#163] px-2 text-[#7fff9e]"
          value={text}
          onChange={(e) => { setText(e.target.value); setErr(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
        />
        <div className="flex gap-2">
          <button onClick={go}>[ GO ]</button>
          <button onClick={onClose}>[ CANCEL ]</button>
        </div>
        {err && <p className="text-[#ff5555] text-xs">{err}</p>}
      </div>
    </div>
  );
}
