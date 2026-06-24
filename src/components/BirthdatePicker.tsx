'use client';
import { useState } from 'react';
import { parseBirthday, formatBirthday, daysInMonth } from '@/state/birthwave';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOW_YEAR = new Date().getUTCFullYear();
const MIN_YEAR = 1900;

// Declared at module scope (not inside render) so it keeps a stable identity and
// satisfies react-hooks/static-components.
function Stepper({ value, onDec, onInc, decLabel, incLabel, testid }: {
  value: string; onDec: () => void; onInc: () => void; decLabel: string; incLabel: string; testid: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="wb-btn wb-out font-bold" aria-label={decLabel} onClick={onDec}>◀</button>
      <span data-testid={testid} className="wb-in bg-white text-black px-2 py-0.5 min-w-[3ch] text-center tabular-nums">{value}</span>
      <button type="button" className="wb-btn wb-out font-bold" aria-label={incLabel} onClick={onInc}>▶</button>
    </div>
  );
}

export function BirthdatePicker({
  initial, onSet, onClose,
}: { initial: string | null; onSet: (iso: string) => void; onClose: () => void }) {
  const init = initial ? parseBirthday(initial) : null;
  const [y, setY] = useState(init ? init.getUTCFullYear() : 1990);
  const [m, setM] = useState(init ? init.getUTCMonth() + 1 : 1);
  const [d, setD] = useState(init ? init.getUTCDate() : 1);

  const clampDay = (yy: number, mm: number, dd: number) => Math.min(dd, daysInMonth(yy, mm));
  const stepM = (delta: number) => { const mm = ((m - 1 + delta + 12) % 12) + 1; setM(mm); setD((cur) => clampDay(y, mm, cur)); };
  const stepY = (delta: number) => { const yy = Math.min(NOW_YEAR, Math.max(MIN_YEAR, y + delta)); setY(yy); setD((cur) => clampDay(yy, m, cur)); };
  const stepD = (delta: number) => { const max = daysInMonth(y, m); setD(((d - 1 + delta + max) % max) + 1); };

  const set = () => { onSet(formatBirthday(new Date(Date.UTC(y, m - 1, d, 12)))); };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Birthdate"
      className="fixed inset-0 grid place-items-center bg-black/70"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="wb-win min-w-[280px]" onClick={(e) => e.stopPropagation()}>
        <div className="wb-title"><span className="phosphor-glow font-bold">Birthdate</span></div>
        <div className="wb-panel p-3 space-y-3">
          <div className="flex items-end justify-center gap-3">
            <div className="text-center"><div className="wb-label">Day</div>
              <Stepper value={String(d)} onDec={() => stepD(-1)} onInc={() => stepD(1)} decLabel="Previous day" incLabel="Next day" testid="bp-day" /></div>
            <div className="text-center"><div className="wb-label">Month</div>
              <Stepper value={MONTHS[m - 1]} onDec={() => stepM(-1)} onInc={() => stepM(1)} decLabel="Previous month" incLabel="Next month" testid="bp-month" /></div>
            <div className="text-center"><div className="wb-label">Year</div>
              <Stepper value={String(y)} onDec={() => stepY(-1)} onInc={() => stepY(1)} decLabel="Previous year" incLabel="Next year" testid="bp-year" /></div>
          </div>
          <div className="flex gap-2 pt-1 justify-center">
            <button type="button" className="wb-btn wb-out wb-btn--on font-bold" onClick={set}>SET</button>
            <button type="button" className="wb-btn wb-out" onClick={onClose}>CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
}
