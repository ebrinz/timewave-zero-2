# Birthwave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Birthwave" mode that draws a second timewave re-anchored to the user's birthday alongside the canonical 2012 wave, with an Amiga stepper date picker, localStorage persistence, and an upper-right "novelty well" index.

**Architecture:** A birth-anchored wave is the existing `novelty()` shifted in `t` by a constant `offset = birthOffsetDays(birthday)`, so the whole feature is `novelty(t + offset)` plus UI. Birthwave state lives in a new React context (`BirthwaveProvider` / `useBirthwave`) persisted to localStorage. The chart's `WaveLayer` and `MarkersLayer` become factory functions (matching the existing `createEventsLayer` pattern) that close over the birthwave config; a new `NoveltyIndexLayer` renders the well readout. All wiring happens at the single composition site in `ChartIsland.tsx`.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Canvas 2D, Tailwind v4 + hand-rolled Amiga Workbench CSS (`wb-*` classes), Vitest + @testing-library/react.

## Global Constraints

- **No new dependencies.** Use only what's already in the repo (the user enforces a 7-day package-age supply-chain gate).
- **Years are 365.25 days; the birth cycle is exactly `24576` days** (`64 × 384 = 67 × 365.25 + 104.25`). Define once as `BIRTH_CYCLE_DAYS = 24576`.
- **Do not change `ZERO_DATE`, `dateToT`, `tToDate`, the viewport, URL-sync, the oracle, or the grid.** The 2012 anchor stays canonical; the birth wave is a pure `t`-shift.
- **Birthwave state is persisted to `localStorage` only**, never the URL. Key: `twz.birthwave`.
- **Birthday stored as `"YYYY-MM-DD"`** (UTC, time component pinned to 12:00 to avoid DST/rounding drift).
- **Styling:** birth wave = amber (`#ffcc66` edge, `rgba(255,150,40,0.20)` fill); 2012 background "ghost" = faint blue dashed; markers VT323 11px; controls use existing `wb-btn` / `wb-out` / `wb-in` / `wb-panel` / `wb-win` / `wb-title` / `wb-label` / `wb-btn--on` classes.
- **Test files are colocated `*.test.ts(x)`.** Run a single file with `npx vitest run <path>`.

---

### Task 1: Birthwave domain helpers (`src/state/birthwave.ts`)

Pure functions for the offset math, date parsing/formatting, and localStorage load/save. No React.

**Files:**
- Create: `src/state/birthwave.ts`
- Test: `src/state/birthwave.test.ts`

**Interfaces:**
- Consumes: `ZERO_DATE` from `@/chart/time`.
- Produces:
  - `BIRTH_CYCLE_DAYS: number` (= 24576)
  - `type BirthwaveState = { birthday: string | null; birthwave: boolean; background: boolean }`
  - `DEFAULT_BIRTHWAVE: BirthwaveState`
  - `daysInMonth(year: number, month1to12: number): number`
  - `parseBirthday(s: string): Date | null`
  - `formatBirthday(d: Date): string`  // "YYYY-MM-DD"
  - `birthZeroDate(birthday: Date): Date`
  - `birthOffsetDays(birthday: Date): number`
  - `loadBirthwave(): BirthwaveState`
  - `saveBirthwave(s: BirthwaveState): void`

- [ ] **Step 1: Write the failing test**

Create `src/state/birthwave.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  daysInMonth, parseBirthday, formatBirthday, birthZeroDate, birthOffsetDays,
  loadBirthwave, saveBirthwave, DEFAULT_BIRTHWAVE, BIRTH_CYCLE_DAYS,
} from './birthwave';
import { dateToT } from '@/chart/time';

const DAY_MS = 86_400_000;

describe('birthwave helpers', () => {
  it('BIRTH_CYCLE_DAYS is 64 * 384', () => {
    expect(BIRTH_CYCLE_DAYS).toBe(24576);
    expect(BIRTH_CYCLE_DAYS).toBe(64 * 384);
  });

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth(2000, 2)).toBe(29); // divisible by 400
    expect(daysInMonth(1900, 2)).toBe(28); // divisible by 100, not 400
    expect(daysInMonth(1990, 2)).toBe(28);
    expect(daysInMonth(1990, 4)).toBe(30);
    expect(daysInMonth(1990, 1)).toBe(31);
  });

  it('parseBirthday accepts valid dates and rejects bad ones', () => {
    const d = parseBirthday('1987-06-23')!;
    expect(d).not.toBeNull();
    expect(d.getUTCFullYear()).toBe(1987);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(23);
    expect(parseBirthday('1987-13-01')).toBeNull();
    expect(parseBirthday('1987-02-30')).toBeNull();
    expect(parseBirthday('garbage')).toBeNull();
  });

  it('formatBirthday round-trips parseBirthday', () => {
    expect(formatBirthday(parseBirthday('2012-12-21')!)).toBe('2012-12-21');
  });

  it('birthZeroDate adds exactly BIRTH_CYCLE_DAYS', () => {
    const d = parseBirthday('1987-06-23')!;
    expect((birthZeroDate(d).getTime() - d.getTime()) / DAY_MS).toBe(BIRTH_CYCLE_DAYS);
  });

  it('birthOffsetDays: a birthday on the 2012 zero date yields offset = cycle', () => {
    // parseBirthday pins 12:00 UTC, == ZERO_DATE, so dateToT == 0.
    const d = parseBirthday('2012-12-21')!;
    expect(dateToT(d)).toBeCloseTo(0, 6);
    expect(birthOffsetDays(d)).toBeCloseTo(BIRTH_CYCLE_DAYS, 6);
  });

  it('loadBirthwave falls back to default on missing/corrupt storage', () => {
    expect(loadBirthwave()).toEqual(DEFAULT_BIRTHWAVE);
    localStorage.setItem('twz.birthwave', '{not json');
    expect(loadBirthwave()).toEqual(DEFAULT_BIRTHWAVE);
  });

  it('saveBirthwave round-trips through loadBirthwave', () => {
    const s = { birthday: '1987-06-23', birthwave: true, background: false };
    saveBirthwave(s);
    expect(loadBirthwave()).toEqual(s);
  });
});

beforeEach(() => localStorage.clear());
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/birthwave.test.ts`
Expected: FAIL — cannot import from `./birthwave` (module does not exist).

- [ ] **Step 3: Write minimal implementation**

Create `src/state/birthwave.ts`:

```ts
import { ZERO_DATE } from '@/chart/time';

const DAY_MS = 86_400_000;
const STORAGE_KEY = 'twz.birthwave';

/** Personal eschaton offset: 64 × 384 days (== 67 × 365.25 + 104.25). */
export const BIRTH_CYCLE_DAYS = 24576;

export interface BirthwaveState {
  birthday: string | null; // "YYYY-MM-DD"
  birthwave: boolean;       // mode on/off
  background: boolean;      // show the 2012 ghost while birthwave is on
}

export const DEFAULT_BIRTHWAVE: BirthwaveState = { birthday: null, birthwave: false, background: true };

/** Days in a given 1-based month (handles leap years via the day-0-of-next-month trick). */
export const daysInMonth = (year: number, month1to12: number): number =>
  new Date(Date.UTC(year, month1to12, 0)).getUTCDate();

/** Parse "YYYY-MM-DD" to a UTC date pinned at noon, or null if invalid. */
export function parseBirthday(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

export const formatBirthday = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** The personal zero point: birthday + 24576 days. */
export const birthZeroDate = (birthday: Date): Date =>
  new Date(birthday.getTime() + BIRTH_CYCLE_DAYS * DAY_MS);

/** Constant `t`-shift that re-anchors the wave to the birth zero point. */
export const birthOffsetDays = (birthday: Date): number =>
  (birthZeroDate(birthday).getTime() - ZERO_DATE.getTime()) / DAY_MS;

export function loadBirthwave(): BirthwaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BIRTHWAVE;
    const p = JSON.parse(raw) as Partial<BirthwaveState>;
    return {
      birthday: typeof p.birthday === 'string' ? p.birthday : null,
      birthwave: !!p.birthwave,
      background: p.background !== false, // default true
    };
  } catch {
    return DEFAULT_BIRTHWAVE;
  }
}

export function saveBirthwave(s: BirthwaveState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable — ignore */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/birthwave.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/birthwave.ts src/state/birthwave.test.ts
git commit -m "feat: birthwave domain helpers (offset math, date parse, persistence)"
```

---

### Task 2: Novelty-well index math (`src/chart/noveltyIndex.ts`)

Pure detrend + local-trough proximity. The layer (Task 8) samples novelty and calls this.

**Files:**
- Create: `src/chart/noveltyIndex.ts`
- Test: `src/chart/noveltyIndex.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `detrend(samples: number[]): number[]`  // subtract linear least-squares fit
  - `interface WellResult { proximity: number; hasWell: boolean }`
  - `wellProximity(samples: number[], centerIndex: number): WellResult`

- [ ] **Step 1: Write the failing test**

Create `src/chart/noveltyIndex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detrend, wellProximity } from './noveltyIndex';

describe('detrend', () => {
  it('flattens a linear ramp to ~zero residuals', () => {
    const r = detrend([1, 2, 3, 4, 5]);
    for (const v of r) expect(Math.abs(v)).toBeLessThan(1e-9);
  });
});

describe('wellProximity', () => {
  it('reports proximity ~1 when the centre sits in a trough', () => {
    // lower novelty = more novel; a V puts the deepest point at the centre.
    const res = wellProximity([3, 2, 1, 2, 3], 2);
    expect(res.hasWell).toBe(true);
    expect(res.proximity).toBeCloseTo(1, 5);
  });

  it('reports no well on a monotonic (detrend-flat) window', () => {
    const res = wellProximity([1, 2, 3, 4, 5], 2);
    expect(res.hasWell).toBe(false);
    expect(res.proximity).toBe(0);
  });

  it('clamps proximity to [0, 1]', () => {
    const res = wellProximity([5, 3, 1, 3, 5, 7, 9], 2);
    expect(res.proximity).toBeGreaterThanOrEqual(0);
    expect(res.proximity).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chart/noveltyIndex.test.ts`
Expected: FAIL — cannot import from `./noveltyIndex`.

- [ ] **Step 3: Write minimal implementation**

Create `src/chart/noveltyIndex.ts`:

```ts
/**
 * Novelty-well index. The wave has a dominant macro ramp at any zoom, so a raw
 * value buries the local structure. We DETREND (subtract the window's linear
 * least-squares fit) and then measure how deep into the nearest local trough
 * the centre sits. Lower novelty = more novel, so a deep residual reads high.
 */

export interface WellResult {
  proximity: number; // 0 (on a crest) .. 1 (sitting in a trough)
  hasWell: boolean;  // false when the detrended window has no interior trough around the centre
}

/** Remove the linear least-squares trend over evenly-spaced samples (x = index). */
export function detrend(samples: number[]): number[] {
  const n = samples.length;
  if (n < 2) return samples.slice();
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += samples[i]; sxx += i * i; sxy += i * samples[i]; }
  const denom = n * sxx - sx * sx;
  const b = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return samples.map((y, i) => y - (a + b * i));
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function wellProximity(samples: number[], centerIndex: number): WellResult {
  const r = detrend(samples);
  const n = r.length;
  if (n < 3) return { proximity: 0, hasWell: false };
  const isCrest = (i: number) => i > 0 && i < n - 1 && r[i] >= r[i - 1] && r[i] >= r[i + 1];

  // Crests immediately bracketing the centre (else the window edges).
  let lc = 0;
  for (let i = centerIndex - 1; i > 0; i--) { if (isCrest(i)) { lc = i; break; } }
  let rc = n - 1;
  for (let i = centerIndex + 1; i < n - 1; i++) { if (isCrest(i)) { rc = i; break; } }

  // Deepest residual within the bracket = the local trough.
  let trough = Infinity, ti = lc;
  for (let i = lc; i <= rc; i++) { if (r[i] < trough) { trough = r[i]; ti = i; } }

  const crest = Math.max(r[lc], r[rc]);
  const denom = crest - trough;
  if (!(denom > 0) || ti <= lc || ti >= rc) return { proximity: 0, hasWell: false };

  return { proximity: clamp01((crest - r[centerIndex]) / denom), hasWell: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/chart/noveltyIndex.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/noveltyIndex.ts src/chart/noveltyIndex.test.ts
git commit -m "feat: novelty-well index (detrend + local trough proximity)"
```

---

### Task 3: Birthwave context (`src/state/BirthwaveProvider.tsx`)

React context holding `{birthday, birthwave, background}`, persisting to localStorage, exposing the derived `offset`.

**Files:**
- Create: `src/state/BirthwaveProvider.tsx`
- Test: `src/state/BirthwaveProvider.test.tsx`

**Interfaces:**
- Consumes: helpers from `./birthwave` (Task 1).
- Produces:
  - `BirthwaveProvider({ children }): JSX.Element`
  - `useBirthwave(): { birthday: string | null; birthwave: boolean; background: boolean; offset: number | null; setBirthday: (s: string) => void; setBirthwave: (on: boolean) => void; setBackground: (on: boolean) => void }`
  - `offset` is `birthOffsetDays(birthday)` when `birthwave && birthday` parse, else `null`.
  - `setBirthday(s)` also sets `birthwave: true` (picking a date enables the mode).

- [ ] **Step 1: Write the failing test**

Create `src/state/BirthwaveProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BirthwaveProvider, useBirthwave } from './BirthwaveProvider';

let api: ReturnType<typeof useBirthwave>;
function Probe() {
  api = useBirthwave();
  return <div data-testid="offset">{String(api.offset)}</div>;
}

beforeEach(() => localStorage.clear());

describe('BirthwaveProvider', () => {
  it('defaults to birthwave off with a null offset', async () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    expect(api.birthwave).toBe(false);
    expect(screen.getByTestId('offset').textContent).toBe('null');
  });

  it('setBirthday enables birthwave, derives an offset, and persists', async () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    await act(async () => { api.setBirthday('1987-06-23'); });
    expect(api.birthwave).toBe(true);
    expect(typeof api.offset).toBe('number');
    expect(JSON.parse(localStorage.getItem('twz.birthwave')!).birthday).toBe('1987-06-23');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/BirthwaveProvider.test.tsx`
Expected: FAIL — cannot import from `./BirthwaveProvider`.

- [ ] **Step 3: Write minimal implementation**

Create `src/state/BirthwaveProvider.tsx`:

```tsx
'use client';
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react';
import {
  DEFAULT_BIRTHWAVE, loadBirthwave, saveBirthwave, parseBirthday, birthOffsetDays,
  type BirthwaveState,
} from './birthwave';

interface BirthwaveCtx {
  birthday: string | null;
  birthwave: boolean;
  background: boolean;
  offset: number | null;
  setBirthday: (s: string) => void;
  setBirthwave: (on: boolean) => void;
  setBackground: (on: boolean) => void;
}

const Ctx = createContext<BirthwaveCtx | null>(null);
export const useBirthwave = (): BirthwaveCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBirthwave outside provider');
  return c;
};

export function BirthwaveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BirthwaveState>(DEFAULT_BIRTHWAVE);
  const hydrated = useRef(false);

  // Load from localStorage (an external system) once on mount, like ChartProvider's URL sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
    setState(loadBirthwave());
    hydrated.current = true;
  }, []);

  // Persist after hydration so the default doesn't clobber stored state before we read it.
  useEffect(() => { if (hydrated.current) saveBirthwave(state); }, [state]);

  const setBirthday = useCallback((birthday: string) => setState((s) => ({ ...s, birthday, birthwave: true })), []);
  const setBirthwave = useCallback((birthwave: boolean) => setState((s) => ({ ...s, birthwave })), []);
  const setBackground = useCallback((background: boolean) => setState((s) => ({ ...s, background })), []);

  const offset = useMemo(() => {
    if (!state.birthwave || !state.birthday) return null;
    const d = parseBirthday(state.birthday);
    return d ? birthOffsetDays(d) : null;
  }, [state.birthwave, state.birthday]);

  const value = useMemo<BirthwaveCtx>(() => ({
    birthday: state.birthday, birthwave: state.birthwave, background: state.background,
    offset, setBirthday, setBirthwave, setBackground,
  }), [state, offset, setBirthday, setBirthwave, setBackground]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/BirthwaveProvider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/BirthwaveProvider.tsx src/state/BirthwaveProvider.test.tsx
git commit -m "feat: birthwave React context with localStorage persistence"
```

---

### Task 4: Amiga stepper date picker (`src/components/BirthdatePicker.tsx`)

A controlled modal (props only — no context — so it's trivially testable). `DD / MM / YYYY` steppers with leap-aware day clamping.

**Files:**
- Create: `src/components/BirthdatePicker.tsx`
- Test: `src/components/BirthdatePicker.test.tsx`

**Interfaces:**
- Consumes: `parseBirthday`, `formatBirthday`, `daysInMonth` from `@/state/birthwave`.
- Produces: `BirthdatePicker({ initial, onSet, onClose }: { initial: string | null; onSet: (iso: string) => void; onClose: () => void }): JSX.Element`
  - `onSet` is called with a `"YYYY-MM-DD"` string when SET is pressed.

- [ ] **Step 1: Write the failing test**

Create `src/components/BirthdatePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BirthdatePicker } from './BirthdatePicker';

describe('BirthdatePicker', () => {
  it('clamps the day when stepping into a shorter month, and SET emits the clamped date', async () => {
    const onSet = vi.fn();
    render(<BirthdatePicker initial="1990-01-31" onSet={onSet} onClose={() => {}} />);
    // Jan 31 shown.
    expect(screen.getByTestId('bp-day').textContent).toBe('31');
    // Step month forward: Jan -> Feb 1990 (28 days) clamps the day to 28.
    await userEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByTestId('bp-month').textContent).toBe('Feb');
    expect(screen.getByTestId('bp-day').textContent).toBe('28');
    // SET emits the clamped date.
    await userEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(onSet).toHaveBeenCalledWith('1990-02-28');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BirthdatePicker.test.tsx`
Expected: FAIL — cannot import `./BirthdatePicker`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/BirthdatePicker.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { parseBirthday, formatBirthday, daysInMonth } from '@/state/birthwave';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOW_YEAR = new Date().getUTCFullYear();
const MIN_YEAR = 1900;

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

  const Stepper = ({ value, onDec, onInc, decLabel, incLabel, testid }: {
    value: string; onDec: () => void; onInc: () => void; decLabel: string; incLabel: string; testid: string;
  }) => (
    <div className="flex items-center gap-1">
      <button type="button" className="wb-btn wb-out font-bold" aria-label={decLabel} onClick={onDec}>◀</button>
      <span data-testid={testid} className="wb-in bg-white text-black px-2 py-0.5 min-w-[3ch] text-center tabular-nums">{value}</span>
      <button type="button" className="wb-btn wb-out font-bold" aria-label={incLabel} onClick={onInc}>▶</button>
    </div>
  );

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/BirthdatePicker.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/BirthdatePicker.tsx src/components/BirthdatePicker.test.tsx
git commit -m "feat: Amiga stepper birthdate picker (leap-aware day clamp)"
```

---

### Task 5: ChartDock controls + wire BirthwaveProvider into ChartIsland

Add the BIRTHWAVE section to the dock and wrap the app in `BirthwaveProvider`. Layers are unchanged this task — deliverable is working, persisting controls + picker.

**Files:**
- Modify: `src/components/ChartDock.tsx`
- Modify: `src/components/ChartIsland.tsx:24-30` (wrap return in `BirthwaveProvider`)
- Test: `src/components/ChartDock.birthwave.test.tsx`

**Interfaces:**
- Consumes: `useBirthwave` (Task 3), `BirthdatePicker` (Task 4), `BirthwaveProvider` (Task 3).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Create `src/components/ChartDock.birthwave.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartProvider } from '@/state/ChartProvider';
import { BirthwaveProvider } from '@/state/BirthwaveProvider';
import { ChartDock } from './ChartDock';

const wrap = (ui: React.ReactNode) => (
  <BirthwaveProvider><ChartProvider layers={[]}>{ui}</ChartProvider></BirthwaveProvider>
);

beforeEach(() => localStorage.clear());

describe('ChartDock birthwave controls', () => {
  it('shows the BIRTHWAVE control and opens the picker when no birthday is set', async () => {
    render(wrap(<ChartDock />));
    expect(screen.getByText('Birthwave')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /BIRTHDATE/i }));
    expect(screen.getByRole('dialog', { name: 'Birthdate' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ChartDock.birthwave.test.tsx`
Expected: FAIL — no "Birthwave" text / no BIRTHDATE button.

- [ ] **Step 3: Wire the provider into ChartIsland**

In `src/components/ChartIsland.tsx`, add the import and wrap the returned tree. Change the import block to include:

```tsx
import { BirthwaveProvider } from '@/state/BirthwaveProvider';
```

Replace the `return (...)` (currently lines 24-30) with:

```tsx
  return (
    <BirthwaveProvider>
      <Suspense fallback={null}>
        <ChartProvider layers={layers}>
          <ChartShell />
        </ChartProvider>
      </Suspense>
    </BirthwaveProvider>
  );
```

- [ ] **Step 4: Add the controls to ChartDock**

In `src/components/ChartDock.tsx`:

Add imports after the existing imports (after line 7):

```tsx
import { useBirthwave } from '@/state/BirthwaveProvider';
import { BirthdatePicker } from './BirthdatePicker';
```

Inside `ChartDock()`, after `const [gotoOpen, setGotoOpen] = useState(false);` add:

```tsx
  const { birthday, birthwave, background, setBirthday, setBirthwave, setBackground } = useBirthwave();
  const [pickerOpen, setPickerOpen] = useState(false);
```

Add this section immediately before the `GOTO…` button (before line 140's `<button ... GOTO…>`):

```tsx
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
```

Add the picker render right after the existing `{gotoOpen && <DateGoto ... />}` line (after line 144):

```tsx
      {pickerOpen && (
        <BirthdatePicker
          initial={birthday}
          onSet={(iso) => { setBirthday(iso); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ChartDock.birthwave.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/ChartDock.tsx src/components/ChartIsland.tsx src/components/ChartDock.birthwave.test.tsx
git commit -m "feat: birthwave dock controls + provider wiring"
```

---

### Task 6: Two-wave `createWaveLayer` factory

Convert `WaveLayer` to a factory that draws the birth wave (amber) plus the optional 2012 ghost, sharing one vertical scale.

**Files:**
- Modify: `src/chart/layers/WaveLayer.ts` (full rewrite)
- Modify: `src/components/ChartIsland.tsx` (use the factory)
- Test: `src/chart/layers/WaveLayer.test.ts`

**Interfaces:**
- Consumes: `novelty` (`@/chart/timewave`), `xToT`, `Viewport`, `Dims` (`@/chart/viewport`), `OverlayLayer`.
- Produces: `createWaveLayer(opts: { offset: number | null; showBackground: boolean }): OverlayLayer` (id `'wave'`).
  - `offset === null` → single 2012 wave in the original blue/white style.
  - `offset` number → amber birth wave; plus a faint blue dashed 2012 ghost when `showBackground`.

- [ ] **Step 1: Write the failing test**

Create `src/chart/layers/WaveLayer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createWaveLayer } from './WaveLayer';
import type { Viewport, Dims } from '@/chart/viewport';

// Minimal 2D-context stub: records nothing, just satisfies the calls the layer makes.
function mockCtx() {
  const noop = () => {};
  return {
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    fill: noop, stroke: noop, setLineDash: noop,
    fillStyle: '', strokeStyle: '', lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
}

const view: Viewport = { tLeft: 50, tRight: -50 };
const dims: Dims = { w: 400, h: 300 };

describe('createWaveLayer', () => {
  it('returns a wave layer that draws a single wave when offset is null', () => {
    const layer = createWaveLayer({ offset: null, showBackground: true });
    expect(layer.id).toBe('wave');
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });

  it('draws birth + ghost without throwing when offset is set', () => {
    const layer = createWaveLayer({ offset: 15000, showBackground: true });
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });

  it('draws birth only (no ghost) when background is off', () => {
    const layer = createWaveLayer({ offset: 15000, showBackground: false });
    expect(() => layer.draw(mockCtx(), view, dims)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chart/layers/WaveLayer.test.ts`
Expected: FAIL — `createWaveLayer` is not exported (file still exports the `WaveLayer` const).

- [ ] **Step 3: Rewrite WaveLayer as a factory**

Replace the entire contents of `src/chart/layers/WaveLayer.ts`:

```ts
import type { OverlayLayer } from './types';
import { xToT, type Dims, type Viewport } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';

const PAD_TOP = 30, PAD_BOT = 30, SUPERSAMPLE = 4;

interface WaveStyle { fill: string; edge: string; width: number; dash: number[]; }
const ORIGINAL: WaveStyle = { fill: 'rgba(90,150,230,0.22)', edge: '#ffffff', width: 1.4, dash: [] };
const GHOST: WaveStyle = { fill: 'rgba(90,150,230,0.10)', edge: 'rgba(120,170,255,0.55)', width: 1, dash: [4, 4] };
const BIRTH: WaveStyle = { fill: 'rgba(255,150,40,0.20)', edge: '#ffcc66', width: 1.6, dash: [] };

interface Env { mins: number[]; maxs: number[]; }

// Sample the novelty envelope for one wave (shifted in t by `offset`).
function sample(view: Viewport, dims: Dims, cols: number, offset: number): Env {
  const mins = new Array<number>(cols), maxs = new Array<number>(cols);
  for (let c = 0; c < cols; c++) {
    let lo = Infinity, hi = -Infinity;
    for (let s = 0; s < SUPERSAMPLE; s++) {
      const x = ((c + s / SUPERSAMPLE) / cols) * dims.w;
      const n = novelty(xToT(x, view, dims.w) + offset);
      if (n < lo) lo = n; if (n > hi) hi = n;
    }
    mins[c] = lo; maxs[c] = hi;
  }
  return { mins, maxs };
}

export function createWaveLayer(opts: { offset: number | null; showBackground: boolean }): OverlayLayer {
  return {
    id: 'wave',
    visible: () => true,
    draw(ctx, view, dims) {
      const usableH = dims.h - PAD_TOP - PAD_BOT;
      const cols = Math.min(dims.w, 2000);

      // Back-to-front draw list. Birthwave off = the original single wave; on =
      // optional 2012 ghost behind the amber birth wave.
      const waves: { env: Env; style: WaveStyle }[] = [];
      if (opts.offset === null) {
        waves.push({ env: sample(view, dims, cols, 0), style: ORIGINAL });
      } else {
        if (opts.showBackground) waves.push({ env: sample(view, dims, cols, 0), style: GHOST });
        waves.push({ env: sample(view, dims, cols, opts.offset), style: BIRTH });
      }

      // Shared vertical fit across every drawn wave so they're directly comparable.
      let vMin = Infinity, vMax = -Infinity;
      for (const { env } of waves) for (let c = 0; c < cols; c++) {
        if (env.mins[c] < vMin) vMin = env.mins[c];
        if (env.maxs[c] > vMax) vMax = env.maxs[c];
      }
      const HEADROOM = 0.07;
      const rawRange = vMax - vMin;
      if (rawRange > 0) { const pad = rawRange * HEADROOM; vMin -= pad; vMax += pad; }
      else { vMin -= 1; vMax += 1; }
      const range = vMax - vMin;
      const yOf = (v: number) => PAD_TOP + (1 - (v - vMin) / range) * usableH;

      for (const { env, style } of waves) {
        // Envelope fill.
        ctx.beginPath();
        for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; if (c === 0) ctx.moveTo(x, yOf(env.maxs[c])); else ctx.lineTo(x, yOf(env.maxs[c])); }
        for (let c = cols - 1; c >= 0; c--) { const x = (c / cols) * dims.w; ctx.lineTo(x, yOf(env.mins[c])); }
        ctx.closePath();
        ctx.fillStyle = style.fill; ctx.fill();
        // Top edge.
        ctx.strokeStyle = style.edge; ctx.lineWidth = style.width; ctx.setLineDash(style.dash);
        ctx.beginPath();
        for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; if (c === 0) ctx.moveTo(x, yOf(env.maxs[c])); else ctx.lineTo(x, yOf(env.maxs[c])); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
  };
}
```

- [ ] **Step 4: Update ChartIsland to use the factory**

In `src/components/ChartIsland.tsx`:

Change the import `import { WaveLayer } from '@/chart/layers/WaveLayer';` to:

```tsx
import { createWaveLayer } from '@/chart/layers/WaveLayer';
import { useBirthwave } from '@/state/BirthwaveProvider';
```

The layer array must now read birthwave state, so the body that builds `layers` must run inside `BirthwaveProvider`. Restructure `ChartIsland` into an outer provider + inner builder. Replace the whole component body with:

```tsx
export function ChartIsland() {
  return (
    <BirthwaveProvider>
      <ChartIslandInner />
    </BirthwaveProvider>
  );
}

function ChartIslandInner() {
  // Historical events load post-mount; until then the events layer is inert.
  const [events, setEvents] = useState<EventsData | null>(null);
  useEffect(() => { loadEvents().then(setEvents); }, []);

  const { offset, background } = useBirthwave();

  // Rebuild when events arrive or birthwave config changes (later layer = on top).
  const layers = useMemo(
    () => [
      GridLayer,
      createWaveLayer({ offset, showBackground: background }),
      MarkersLayer,
      createEventsLayer(events),
    ],
    [events, offset, background],
  );

  return (
    <Suspense fallback={null}>
      <ChartProvider layers={layers}>
        <ChartShell />
      </ChartProvider>
    </Suspense>
  );
}
```

(This supersedes the `BirthwaveProvider`-wrapping edit from Task 5; the provider now wraps `ChartIslandInner`. `MarkersLayer` stays the static import for now — Task 7 swaps it.)

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/chart/layers/WaveLayer.test.ts`
Expected: PASS (3 tests).

Run: `npx vitest run src/components/ChartIsland.tsx src/state src/components/ChartDock.birthwave.test.tsx`
Expected: existing suites still PASS (no import breakage).

- [ ] **Step 6: Commit**

```bash
git add src/chart/layers/WaveLayer.ts src/chart/layers/WaveLayer.test.ts src/components/ChartIsland.tsx
git commit -m "feat: two-wave WaveLayer factory (amber birthwave + 2012 ghost)"
```

---

### Task 7: Birth markers via `createMarkersLayer` factory

Add `BIRTH ZERO` and faint `BORN` markers; dim the 2012 `ZERO POINT` when the ghost is hidden.

**Files:**
- Modify: `src/chart/layers/MarkersLayer.ts` (full rewrite, keep existing `MARKERS`/colors)
- Modify: `src/components/ChartIsland.tsx` (use the factory)
- Test: `src/chart/layers/MarkersLayer.test.ts`

**Interfaces:**
- Consumes: `tToX` (`@/chart/viewport`), `dateToT`, `yearToDate` (`@/chart/time`), `parseBirthday`, `birthZeroDate`, `formatBirthday` (`@/state/birthwave`), `OverlayLayer`, `HitResult`.
- Produces: `createMarkersLayer(opts: { offset: number | null; birthday: string | null; showBackground: boolean }): OverlayLayer` (id `'markers'`).

- [ ] **Step 1: Write the failing test**

Create `src/chart/layers/MarkersLayer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createMarkersLayer } from './MarkersLayer';
import type { Viewport, Dims } from '@/chart/viewport';

const view: Viewport = { tLeft: 1e7, tRight: -1e7 }; // wide enough to include birth markers
const dims: Dims = { w: 400, h: 300 };

describe('createMarkersLayer', () => {
  it('hit-tests the BIRTH ZERO marker at t = -offset when birthwave is on', () => {
    const offset = 15000;
    const layer = createMarkersLayer({ offset, birthday: '1987-06-23', showBackground: true });
    // Map t = -offset to its pixel x, then hit-test there.
    const x = ((view.tLeft - (-offset)) / (view.tLeft - view.tRight)) * dims.w;
    const hit = layer.hitTest!(x, 0, view, dims);
    expect(hit).not.toBeNull();
    expect(hit!.label).toContain('BIRTH ZERO');
  });

  it('has no BIRTH ZERO marker when birthwave is off', () => {
    const layer = createMarkersLayer({ offset: null, birthday: '1987-06-23', showBackground: true });
    // The 2012 zero point is at t = 0.
    const x0 = (view.tLeft / (view.tLeft - view.tRight)) * dims.w;
    const hit = layer.hitTest!(x0, 0, view, dims);
    expect(hit!.label).toContain('ZERO POINT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chart/layers/MarkersLayer.test.ts`
Expected: FAIL — `createMarkersLayer` not exported.

- [ ] **Step 3: Rewrite MarkersLayer as a factory**

Replace the entire contents of `src/chart/layers/MarkersLayer.ts`:

```ts
import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT, yearToDate } from '@/chart/time';
import { parseBirthday, birthZeroDate, formatBirthday } from '@/state/birthwave';

const yearT = (y: number) => dateToT(yearToDate(y));

const NOW_COLOR = '#00e676';   // phosphor green — the present moment ("you are here")
const BIRTH_COLOR = '#ffaa33';  // amber — the personal anchor

// Fixed historical markers (2012 zero point + events). `anchor2012` flags the one
// marker that belongs to the 2012 wave, so it can dim when the ghost is hidden.
const BASE = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444', anchor2012: true },
  { t: yearT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearT(1492), label: '1492', color: '#ffb84a' },
  { t: yearT(1), label: 'Year 1 CE', color: '#ffb84a' },
] as const;

interface Marker { t: number; label: string; color: string; solid: boolean; dim: boolean; }

export function createMarkersLayer(opts: { offset: number | null; birthday: string | null; showBackground: boolean }): OverlayLayer {
  // Recomputed each draw so NOW reflects the real current instant.
  const markers = (): Marker[] => {
    const list: Marker[] = [
      { t: dateToT(new Date()), label: 'NOW', color: NOW_COLOR, solid: true, dim: false },
      ...BASE.map((m) => ({
        t: m.t, label: m.label, color: m.color,
        solid: m.t === 0,
        dim: 'anchor2012' in m && m.anchor2012 === true && opts.offset !== null && !opts.showBackground,
      })),
    ];
    if (opts.offset !== null && opts.birthday) {
      const bd = parseBirthday(opts.birthday);
      if (bd) {
        list.push({ t: -opts.offset, label: `BIRTH ZERO · ${formatBirthday(birthZeroDate(bd))}`, color: BIRTH_COLOR, solid: true, dim: false });
        list.push({ t: dateToT(bd), label: `BORN · ${formatBirthday(bd)}`, color: BIRTH_COLOR, solid: false, dim: true });
      }
    }
    return list;
  };

  return {
    id: 'markers',
    visible: () => true,
    draw(ctx, view, dims) {
      ctx.font = '11px "VT323", ui-monospace, monospace';
      for (const m of markers()) {
        const x = tToX(m.t, view, dims.w);
        if (x < -50 || x > dims.w + 50) continue;
        const alphaHex = m.color === NOW_COLOR ? 'cc' : m.dim ? '22' : '55';
        ctx.strokeStyle = m.color + alphaHex;
        ctx.lineWidth = m.solid ? 2 : 1;
        ctx.setLineDash(m.solid ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = m.dim ? 0.5 : 1;
        ctx.fillStyle = m.color; ctx.fillText(m.label, x + 4, 14);
        ctx.globalAlpha = 1;
      }
    },
    hitTest(x, _y, view, dims): HitResult | null {
      for (const m of markers()) {
        if (Math.abs(tToX(m.t, view, dims.w) - x) < 4) return { kind: 'marker', t: m.t, label: m.label };
      }
      return null;
    },
  };
}
```

Note: the mock context in the markers test needs `globalAlpha`/`font`/`fillText` — but the test only calls `hitTest`, which touches none of them, so no ctx is needed there.

- [ ] **Step 4: Update ChartIsland to use the factory**

In `src/components/ChartIsland.tsx`:

Change `import { MarkersLayer } from '@/chart/layers/MarkersLayer';` to:

```tsx
import { createMarkersLayer } from '@/chart/layers/MarkersLayer';
```

In `ChartIslandInner`, pull `birthday` from the hook and use the factory:

```tsx
  const { offset, background, birthday } = useBirthwave();

  const layers = useMemo(
    () => [
      GridLayer,
      createWaveLayer({ offset, showBackground: background }),
      createMarkersLayer({ offset, birthday, showBackground: background }),
      createEventsLayer(events),
    ],
    [events, offset, background, birthday],
  );
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/chart/layers/MarkersLayer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/chart/layers/MarkersLayer.ts src/chart/layers/MarkersLayer.test.ts src/components/ChartIsland.tsx
git commit -m "feat: birth-anchored markers (BIRTH ZERO + BORN), dim 2012 zero with ghost"
```

---

### Task 8: Novelty-well HUD via `createNoveltyIndexLayer`

Top-right canvas readout reading the primary wave's local well proximity.

**Files:**
- Create: `src/chart/layers/NoveltyIndexLayer.ts`
- Modify: `src/components/ChartIsland.tsx` (add the layer last so it's on top)
- Test: `src/chart/layers/NoveltyIndexLayer.test.ts`

**Interfaces:**
- Consumes: `novelty` (`@/chart/timewave`), `xToT` (`@/chart/viewport`), `wellProximity` (`@/chart/noveltyIndex`), `OverlayLayer`.
- Produces: `createNoveltyIndexLayer(opts: { offset: number | null }): OverlayLayer` (id `'novelty-index'`). Reads the birth wave when `offset` is set, else the 2012 wave.

- [ ] **Step 1: Write the failing test**

Create `src/chart/layers/NoveltyIndexLayer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createNoveltyIndexLayer } from './NoveltyIndexLayer';
import type { Viewport, Dims } from '@/chart/viewport';

function mockCtx() {
  const calls: string[] = [];
  const ctx = {
    save: () => {}, restore: () => {},
    fillText: (s: string) => { calls.push(s); },
    fillStyle: '', font: '', textAlign: '', textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const view: Viewport = { tLeft: 50, tRight: -50 };
const dims: Dims = { w: 400, h: 300 };

describe('createNoveltyIndexLayer', () => {
  it('renders a NOVELTY WELL readout for the 2012 wave', () => {
    const { ctx, calls } = mockCtx();
    const layer = createNoveltyIndexLayer({ offset: null });
    expect(layer.id).toBe('novelty-index');
    layer.draw(ctx, view, dims);
    expect(calls.some((s) => s.startsWith('NOVELTY WELL'))).toBe(true);
  });

  it('does not throw for the birth wave', () => {
    const { ctx } = mockCtx();
    const layer = createNoveltyIndexLayer({ offset: 15000 });
    expect(() => layer.draw(ctx, view, dims)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chart/layers/NoveltyIndexLayer.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the layer**

Create `src/chart/layers/NoveltyIndexLayer.ts`:

```ts
import type { OverlayLayer } from './types';
import { xToT } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';
import { wellProximity } from '@/chart/noveltyIndex';

const SAMPLES = 256;

export function createNoveltyIndexLayer(opts: { offset: number | null }): OverlayLayer {
  return {
    id: 'novelty-index',
    visible: () => true,
    draw(ctx, view, dims) {
      const off = opts.offset ?? 0;
      const s = new Array<number>(SAMPLES);
      for (let i = 0; i < SAMPLES; i++) {
        const x = ((i + 0.5) / SAMPLES) * dims.w;
        s[i] = novelty(xToT(x, view, dims.w) + off);
      }
      const { proximity, hasWell } = wellProximity(s, Math.floor(SAMPLES / 2));
      const dots = hasWell ? Math.round(proximity * 5) : 0;
      const bar = '●'.repeat(dots) + '○'.repeat(5 - dots);
      const label = hasWell ? `NOVELTY WELL ${bar} ${proximity.toFixed(2)}` : 'NOVELTY WELL —';

      const pad = 8;
      ctx.save();
      ctx.font = '13px "VT323", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      // Amber when reading the birth wave, cool white for the 2012 wave.
      ctx.fillStyle = opts.offset !== null ? '#ffcc66' : 'rgba(200,220,255,0.85)';
      ctx.fillText(label, dims.w - pad, pad);
      ctx.restore();
    },
  };
}
```

- [ ] **Step 4: Add the layer to ChartIsland (on top)**

In `src/components/ChartIsland.tsx`, add the import:

```tsx
import { createNoveltyIndexLayer } from '@/chart/layers/NoveltyIndexLayer';
```

Add it as the last layer in the `useMemo` array:

```tsx
  const layers = useMemo(
    () => [
      GridLayer,
      createWaveLayer({ offset, showBackground: background }),
      createMarkersLayer({ offset, birthday, showBackground: background }),
      createEventsLayer(events),
      createNoveltyIndexLayer({ offset }),
    ],
    [events, offset, background, birthday],
  );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/chart/layers/NoveltyIndexLayer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/chart/layers/NoveltyIndexLayer.ts src/chart/layers/NoveltyIndexLayer.test.ts src/components/ChartIsland.tsx
git commit -m "feat: novelty-well HUD layer (top-right, primary-wave aware)"
```

---

### Task 9: Full-suite + build verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all suites green (including the new birthwave tests and all pre-existing tests).

- [ ] **Step 2: Type-check / build the static export**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors (verifies the factory refactor didn't break any importer and the static export still emits).

- [ ] **Step 3: Manual smoke (record result in the PR/commit)**

Run: `npm run dev`, then in the browser:
- Dock shows a `BIRTHWAVE OFF` button → click it with no birthday → the Birthdate picker opens.
- Set a birthday → an **amber** wave appears, plus a faint blue dashed **2012 ghost**; `BIRTH ZERO` and `BORN` markers appear.
- Toggle `2012 WAVE OFF` → ghost disappears and the 2012 `ZERO POINT` marker dims.
- Pan/zoom → the top-right `NOVELTY WELL ●●●… 0.xx` updates and stays meaningful at intra-week zoom.
- Reload the page → birthday + toggles persist (localStorage).

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: birthwave full-suite + build verification"
```

---

## Notes / out of scope

- The dock's `Novelty` numeric readout and the hover readout continue to report the **2012** wave's `novelty()` value (canonical). The birthwave-aware "how novel" signal is the new `NOVELTY WELL` HUD. Re-pointing the dock/hover readouts at the primary wave is intentionally out of scope.
- Birthwave state is **not** URL-encoded (localStorage only). URL sharing is a possible future extension.
- The oracle/hexagram reading still follows the 2012 anchor — unchanged by design.
