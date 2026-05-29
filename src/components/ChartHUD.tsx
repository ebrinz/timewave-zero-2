'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { PRESETS } from '@/chart/viewport';
import { DateGoto } from './DateGoto';

export function ChartHUD() {
  const { view, setView } = useChart();
  const [gotoOpen, setGotoOpen] = useState(false);
  const center = (view.tLeft + view.tRight) / 2;
  return (
    <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
      <div className="flex gap-1 pointer-events-auto">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="border border-[#163] px-2 text-xs"
            onClick={() => setView({ tLeft: center + p.span / 2, tRight: center - p.span / 2 })}
          >
            [ {p.label} ]
          </button>
        ))}
      </div>
      <button
        className="border border-[#163] px-2 text-xs pointer-events-auto"
        onClick={() => setGotoOpen(true)}
      >
        [ GOTO ]
      </button>
      {gotoOpen && <DateGoto onClose={() => setGotoOpen(false)} />}
    </div>
  );
}
