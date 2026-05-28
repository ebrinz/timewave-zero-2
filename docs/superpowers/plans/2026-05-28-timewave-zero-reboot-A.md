# Timewave Zero 2 — Subproject A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static Next.js site that renders the Sheliak TW1 timewave as a pannable/zoomable green-phosphor DOS-homage chart, deployed to GitHub Pages, with shareable URL state, help/about pages, and a math layer verified against primary-source reference data.

**Architecture:** Next.js 15 App Router with `output: 'export'` (fully static). A pure, React-free `src/chart/` core (math, time, viewport, canvas draw-layers) is consumed by a thin React layer in `src/components/`. The canvas is drawn as an ordered stack of `OverlayLayer`s so future subprojects (Wikipedia events, echo prediction) attach without touching the core. URL state and a layered overlay model are the two seams that keep A extensible.

**Tech Stack:** TypeScript, Next.js 15 (App Router, static export), Tailwind CSS, Vitest + React Testing Library, Playwright (one smoke test), npm (gated by `~/.npmrc min-release-age=7`), GitHub Actions + `actions/deploy-pages`.

**Source spec:** `docs/superpowers/specs/2026-05-28-timewave-zero-reboot-A-design.md`

---

## File Structure (decomposition)

```
src/chart/                 PURE TypeScript — no React, no DOM, no window. Reusable by subproject B.
  timewave.ts              WAVE_VARIANT, KING_WEN, generateDataSet(), novelty()
  time.ts                  ZERO_DATE, dateToT, tToDate, formatDate, parseFuzzyDate
  viewport.ts              Viewport/Dims types, tToX, xToT, zoomTo, panBy, clamp, PRESETS, LIMITS
  layers/types.ts          OverlayLayer, HitResult interfaces
  layers/GridLayer.ts      time-axis gridlines + year ticks
  layers/WaveLayer.ts      min/max envelope renderer
  layers/MarkersLayer.ts   named historical date markers (decoration only)
  __fixtures__/sheliak-reference.ts   verified data set (produced in Task 4)
  references/sheliak-algorithm.md     transcribed generation procedure + provenance (Task 4)
  EXTENSION-POINTS.md      contract inherited by subprojects B and C
  __tests__/*.test.ts      fidelity, characterization, contract tests

src/components/            React layer. Imports from chart/, never the reverse.
  DOSFrame.tsx             title strip + status line chrome (used by layout)
  ChartCanvas.tsx          <canvas> + rAF loop + DPR + ResizeObserver + pointer events
  ChartHUD.tsx             zoom-preset chips + GOTO button
  DateGoto.tsx             date-entry modal
  HelpScreen.tsx           content for /help
  AboutScreen.tsx          content for /about
  Hotkeys.tsx              window-level key handler (no UI)
  ShareButton.tsx          copy current URL + toast
  LiveReadout.tsx          visually-hidden aria-live region (a11y)

src/state/
  ChartProvider.tsx        React context: view, setView, hover, layers
  urlSync.ts               serialize/parse viewport <-> querystring (numeric + readable)

src/app/
  layout.tsx               <DOSFrame> wraps <ChartProvider> + <Hotkeys> + children
  page.tsx                 "/" chart route (Suspense-wrapped client island)
  help/page.tsx            "/help"
  about/page.tsx           "/about"
  not-found.tsx            DOS-styled 404

public/                    .nojekyll, fonts/VT323.woff2, og/*.png, data/README.md
.github/workflows/deploy.yml
next.config.ts, vitest.config.ts, playwright.config.ts
```

**Pre-existing in repo:** `CLAUDE.md`, `test1.jsx` (visual reference only — do NOT import from it), `.gitignore`, `docs/`. Git is already initialized; the spec is already committed.

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: project scaffold via `create-next-app` into the existing repo root
- Modify: `package.json` (scripts)

- [ ] **Step 1: Scaffold into the current directory**

The repo already contains `CLAUDE.md`, `test1.jsx`, `.gitignore`, `docs/`. `create-next-app` refuses a non-empty dir, so scaffold into a temp subdir and move files up.

Run:
```bash
cd /Users/crashy/Development/timewave-zero-2
npx create-next-app@latest .scaffold --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm
# move everything (including dotfiles) up, keeping existing repo files
shopt -s dotglob
cp -rn .scaffold/* .
# merge: keep our .gitignore; take scaffold's if ours lacks entries (ours already covers node_modules/.next/out)
rm -rf .scaffold
shopt -u dotglob
```
Expected: `src/app/`, `next.config.*`, `tsconfig.json`, `package.json`, `node_modules/` now exist at repo root.

- [ ] **Step 2: Normalize `next.config` to TypeScript**

If `create-next-app` produced `next.config.mjs` or `.js`, rename to `next.config.ts` (Next 15 supports TS config). Leave content for Task 2.

Run: `ls next.config.* && node --version`
Expected: a single `next.config.ts`; node ≥ 18 (CI uses 24).

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev` (Ctrl-C after it prints the local URL), then `npm run build`
Expected: dev prints `http://localhost:3000`; build completes without error.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (TS, Tailwind, App Router, src dir)"
```

---

## Task 2: Install and configure the test toolchain

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install test deps**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```
Expected: installs succeed. (All packages are well over 7 days old, so `min-release-age` won't block.)

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add scripts to `package.json`**

Merge into the `"scripts"` block:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "npx serve out -l 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Add a trivial passing test to prove the harness works**

Create `src/chart/__tests__/harness.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('test harness', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```

Run: `npm run test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add Vitest + RTL toolchain"
```

---

## Task 3: GitHub Pages static-export config

**Files:**
- Modify: `next.config.ts`
- Create: `public/.nojekyll`, `public/data/README.md`
- Create: `src/styles/` palette via `src/app/globals.css` (modify existing)

- [ ] **Step 1: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/timewave-zero-2';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? basePath : '',
  assetPrefix: isProd ? basePath : '',
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: isProd ? basePath : '' },
};

export default nextConfig;
```

- [ ] **Step 2: Create `public/.nojekyll`**

Empty file (stops GitHub Pages' Jekyll from stripping `_next/`).
Run: `touch public/.nojekyll`

- [ ] **Step 3: Create `public/data/README.md`**

```markdown
# Reserved for subproject B (Wikipedia event index)

Subproject B writes `events.json` here. Contract:
- Top-level field `wave_variant` MUST equal the app's `WAVE_VARIANT` (`sheliak-tw1`).
- The app fetches `${NEXT_PUBLIC_BASE_PATH}/data/events.json` at mount and renders nothing if the file is absent (404 is expected until B ships).
See `src/chart/EXTENSION-POINTS.md`.
```

- [ ] **Step 4: Verify static export produces `out/`**

Run: `npm run build`
Expected: build prints "Exporting" and an `out/` directory appears with `index.html` and `_next/`.

- [ ] **Step 5: Verify subpath preview**

Note: `next build` always runs as `NODE_ENV=production`, so EVERY build is prefixed for the subpath (there is no unprefixed build, and that's fine — builds are only for deploy). The local dev server (`next dev`, development) is the unprefixed one. Verify the build output is prefixed:
```bash
npm run build
grep -o '/timewave-zero-2/_next[^"]*' out/index.html | head -3   # expect prefixed asset paths
npm run preview   # serves out/ ; open http://localhost:3001/timewave-zero-2/
```
Open `http://localhost:3001/timewave-zero-2/` — the page renders with assets loading (no 404s). Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: configure static export for GitHub Pages subpath"
```

---

## Task 4: Source & transcribe the Sheliak TW1 reference (HARD GATE)

> This is a research/transcription task, not a coding task. **No timewave math (Task 5) may begin until this produces a verified fixture.** The test in Task 5 is meaningless if the fixture is wrong, so cross-checking against a second source is mandatory.

**Files:**
- Create: `src/chart/references/sheliak-algorithm.md`
- Create: `src/chart/__fixtures__/sheliak-reference.ts`

- [ ] **Step 1: Gather the primary source**

Fetch and read the timewave data-set definition from the references in `CLAUDE.md`:
- https://www.fractal-timewave.com/ (Sheliak's revised timewave; look for the data-set / number-set definition and the generating algorithm)
- https://archive.org/details/twz_20200405 (Peter Meyer's original program + documentation, for cross-reference)

Record, in `src/chart/references/sheliak-algorithm.md`:
1. The King Wen sequence used (64 hexagrams, 6-bit encoding).
2. The exact procedure that turns the King Wen sequence into the timewave number set (the order-of-difference construction and how Sheliak's TW1 differs from Meyer's original — the "Watkins Objection" fix).
3. The cardinality of the number set (confirm whether it is 384 or another value).
4. How the number set is summed across fractal scales to produce a wave value at time `t` (the infinite-sum formulation and how terms are weighted — confirm there is NO arbitrary `1/1.7^s` damping like the prototype used).
5. The novelty/habit convention (low value = high novelty; zero point = max novelty at top) and any normalization.
6. The zero date (confirm 21 Dec 2012 anchor and that the wave shape is calendar-independent).
7. At least two independent source URLs/citations.

- [ ] **Step 2: Transcribe the reference number set into a fixture**

Create `src/chart/__fixtures__/sheliak-reference.ts`. Header comment must cite both sources from Step 1.
```ts
// Sheliak TW1 reference number set.
// Source 1: https://www.fractal-timewave.com/  (retrieved <DATE>)
// Source 2: <second independent source/citation>
// Cross-checked element-by-element on <DATE>. See ../references/sheliak-algorithm.md
// for the generation procedure this array must reproduce.

/** The canonical King Wen sequence as 6-bit integers (bit 0 = bottom line). */
export const KING_WEN_REFERENCE: readonly number[] = [
  // 64 values, transcribed from the primary source.
];

/** The full timewave number set produced by the generation procedure. */
export const DATA_SET_REFERENCE: readonly number[] = [
  // N values (confirmed cardinality from Step 1), transcribed from the primary source.
];

/** Sample (t -> wave value) pairs published in the source, for spot-checking novelty(). */
export const REFERENCE_SAMPLES: ReadonlyArray<{ t: number; value: number }> = [
  // a handful of published values, if available
];
```

- [ ] **Step 3: Cross-check transcription**

Re-read the two sources and verify the arrays match both. Fix any discrepancy. Note in the file header that the cross-check passed.

- [ ] **Step 4: Commit**

```bash
git add src/chart/references/sheliak-algorithm.md src/chart/__fixtures__/sheliak-reference.ts
git commit -m "docs: transcribe & cross-check Sheliak TW1 reference data"
```

---

## Task 5: Math layer — hexagram set, data-set generation, novelty (TDD)

**Files:**
- Create: `src/chart/timewave.ts`
- Test: `src/chart/__tests__/hexagram.test.ts`, `src/chart/__tests__/timewave.test.ts`, `src/chart/__tests__/characterization.test.ts`

- [ ] **Step 1: Write the failing hexagram + data-set test**

`src/chart/__tests__/hexagram.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { KING_WEN, generateDataSet, WAVE_VARIANT } from '@/chart/timewave';
import { KING_WEN_REFERENCE, DATA_SET_REFERENCE } from '@/chart/__fixtures__/sheliak-reference';

describe('King Wen sequence', () => {
  it('has 64 hexagrams', () => { expect(KING_WEN).toHaveLength(64); });
  it('every value is a 6-bit integer in [0,63]', () => {
    for (const h of KING_WEN) { expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThanOrEqual(63); }
  });
  it('contains each of the 64 hexagrams exactly once', () => {
    expect(new Set(KING_WEN).size).toBe(64);
  });
  it('matches the transcribed reference sequence', () => {
    expect([...KING_WEN]).toEqual([...KING_WEN_REFERENCE]);
  });
});

describe('timewave data set', () => {
  it('reproduces the published Sheliak number set exactly', () => {
    expect([...generateDataSet(KING_WEN)]).toEqual([...DATA_SET_REFERENCE]);
  });
  it('declares the sheliak-tw1 variant', () => {
    expect(WAVE_VARIANT).toBe('sheliak-tw1');
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm run test -- hexagram`
Expected: FAIL — `timewave.ts` has no exports yet.

- [ ] **Step 3: Implement `timewave.ts` hexagram set + generation**

Create `src/chart/timewave.ts`. Use the King Wen array from the fixture as the canonical source, and implement `generateDataSet` following the procedure documented in `references/sheliak-algorithm.md` (Task 4). **The Step-1 test (`generateDataSet(KING_WEN) === DATA_SET_REFERENCE`) is the arbiter of correctness** — implement until it passes; do not hand-tune the array to match.
```ts
export const WAVE_VARIANT = 'sheliak-tw1' as const;

/** King Wen sequence, 6-bit encoded (bit 0 = bottom line; 1 = yang). */
export const KING_WEN: readonly number[] = [
  63, 0, 17, 34, 23, 58, 2, 16, 55, 59, 7, 56, 61, 47, 4, 8,
  25, 38, 3, 48, 41, 37, 32, 1, 57, 39, 33, 30, 18, 45, 28, 14,
  60, 15, 40, 5, 53, 43, 20, 10, 35, 49, 31, 62, 24, 6, 26, 22,
  29, 46, 9, 36, 52, 11, 13, 44, 54, 27, 50, 19, 51, 12, 21, 42,
];
// NOTE: replace the above with KING_WEN_REFERENCE values if Task 4 found any discrepancy.

const popcount = (n: number): number => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };

/**
 * Generate the timewave number set from the King Wen sequence per the Sheliak TW1
 * procedure documented in references/sheliak-algorithm.md. Implement the documented
 * order-of-difference construction here; the hexagram.test.ts data-set assertion gates it.
 */
export function generateDataSet(kingWen: readonly number[]): number[] {
  // Implement the transcribed Sheliak generation algorithm.
  // (The exact steps come from Task 4. popcount() above gives line-change counts
  //  between hexagrams, the building block of the difference construction.)
  throw new Error('implement per references/sheliak-algorithm.md');
}

export const DATA_SET: readonly number[] = generateDataSet(KING_WEN);
```

- [ ] **Step 4: Run hexagram test; verify it passes**

Run: `npm run test -- hexagram`
Expected: PASS (all 6 assertions).

- [ ] **Step 5: Write the failing novelty test**

`src/chart/__tests__/timewave.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { novelty } from '@/chart/timewave';
import { REFERENCE_SAMPLES } from '@/chart/__fixtures__/sheliak-reference';

const sweep = (n: number, lo: number, hi: number) =>
  Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo));

describe('novelty(t)', () => {
  it('is finite across the full clamp range', () => {
    for (const t of sweep(10000, -50000 * 365.25, 50000 * 365.25)) {
      expect(Number.isFinite(novelty(t))).toBe(true);
    }
  });
  it('matches published reference samples within tolerance', () => {
    for (const { t, value } of REFERENCE_SAMPLES) {
      expect(novelty(t)).toBeCloseTo(value, 4);
    }
  });
  it('is stable under increased fractal-sum term count (adaptive truncation)', () => {
    // novelty() chooses term count from sample spacing; passing a tighter spacing hint
    // must not change the value beyond epsilon.
    const t = 1234.5;
    expect(Math.abs(novelty(t, { minSpacingDays: 1 }) - novelty(t, { minSpacingDays: 0.001 })))
      .toBeLessThan(1e-9);
  });
});
```

- [ ] **Step 6: Run it; verify it fails**

Run: `npm run test -- timewave`
Expected: FAIL — `novelty` not exported.

- [ ] **Step 7: Implement `novelty` with adaptive truncation**

Append to `src/chart/timewave.ts`. Implement the fractal sum per `references/sheliak-algorithm.md`, with term count derived from `minSpacingDays` (Nyquist-style) rather than hardcoded. Apply the reference novelty/habit convention (low value = high novelty → invert so higher return = more novelty). Do NOT reintroduce the prototype's `1/1.7^s` damping unless Task 4 confirms it.
```ts
export interface NoveltyOptions { minSpacingDays?: number; }

const ZERO_VALUE = /* value of the raw wave at t=0, per the reference normalization */ 0;

export function novelty(t: number, opts: NoveltyOptions = {}): number {
  // 1. Choose number of fractal scales so the finest scale period >= minSpacingDays.
  // 2. Sum DATA_SET samples across those scales per the documented weighting.
  // 3. Normalize and orient per the reference convention.
  throw new Error('implement per references/sheliak-algorithm.md');
}
```

- [ ] **Step 8: Run timewave test; verify it passes**

Run: `npm run test -- timewave`
Expected: PASS.

- [ ] **Step 9: Write the characterization snapshot test**

`src/chart/__tests__/characterization.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { novelty } from '@/chart/timewave';

// Locks the CURRENT computed shape to catch drift. Makes NO claim about history.
describe('timewave characterization', () => {
  it('matches the recorded novelty profile over a fixed range', () => {
    const profile = Array.from({ length: 50 }, (_, i) => {
      const t = -10000 + i * 400;            // ~ -27y .. +27y around the zero point, in days
      return Number(novelty(t).toFixed(6));
    });
    expect(profile).toMatchSnapshot();
  });
});
```

- [ ] **Step 10: Run it to record the snapshot, then re-run to confirm stability**

Run: `npm run test -- characterization` (writes snapshot), then `npm run test -- characterization` again
Expected: first run writes a `__snapshots__` file; second run PASSES against it.

- [ ] **Step 11: Commit**

```bash
git add src/chart/timewave.ts src/chart/__tests__ src/chart/__snapshots__
git commit -m "feat: Sheliak TW1 math layer (data set + novelty) with fidelity tests"
```

---

## Task 6: Time conversions (TDD)

**Files:**
- Create: `src/chart/time.ts`
- Test: `src/chart/__tests__/time.test.ts`

- [ ] **Step 1: Write the failing test**

`src/chart/__tests__/time.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ZERO_DATE, dateToT, tToDate, formatDate, parseFuzzyDate } from '@/chart/time';

describe('time conversions', () => {
  it('zero date maps to t=0', () => {
    expect(dateToT(ZERO_DATE)).toBeCloseTo(0, 9);
  });
  it('roundtrips date->t->date across ±1e6 days', () => {
    for (const x of [-1e6, -5000, -1, 0, 1, 5000, 1e6]) {
      expect(dateToT(tToDate(x))).toBeCloseTo(x, 6);
    }
  });
  it('formats CE and BCE years', () => {
    expect(formatDate(new Date(Date.UTC(1969, 6, 20)))).toContain('1969');
    expect(formatDate(new Date(Date.UTC(-44, 0, 1)))).toContain('BCE');
  });
});

describe('parseFuzzyDate', () => {
  it('accepts ISO', () => { expect(parseFuzzyDate('1969-07-20')).toBeInstanceOf(Date); });
  it('accepts month-name form', () => { expect(parseFuzzyDate('Jul 20 1969')).toBeInstanceOf(Date); });
  it('accepts a bare negative year as BCE', () => { expect(parseFuzzyDate('-5000')).toBeInstanceOf(Date); });
  it('rejects garbage with a typed error', () => {
    expect(() => parseFuzzyDate('not a date')).toThrow(/unrecognized date/i);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm run test -- time`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/chart/time.ts`**

```ts
/** Eschaton anchor. The wave shape is calendar-independent; this only sets the t=0 date. */
export const ZERO_DATE = new Date(Date.UTC(2012, 11, 21, 12, 0, 0));
const DAY_MS = 86_400_000;

/** Days from the zero date (positive = past, toward larger t). */
export const dateToT = (d: Date): number => (ZERO_DATE.getTime() - d.getTime()) / DAY_MS;
export const tToDate = (t: number): Date => new Date(ZERO_DATE.getTime() - t * DAY_MS);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = MONTHS[d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()}, ${y < 0 ? `${-y + 1} BCE` : `${y} CE`}`;
}

export function parseFuzzyDate(input: string): Date {
  const s = input.trim();
  if (/^-?\d{1,7}$/.test(s)) {                       // bare year (allow BCE via negative)
    const y = parseInt(s, 10);
    const d = new Date(Date.UTC(0, 5, 15));
    d.setUTCFullYear(y);
    return d;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  throw new Error(`unrecognized date: ${input}`);
}
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npm run test -- time`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/chart/time.ts src/chart/__tests__/time.test.ts
git commit -m "feat: time<->t conversions and fuzzy date parser"
```

---

## Task 7: Viewport math (TDD)

**Files:**
- Create: `src/chart/viewport.ts`
- Test: `src/chart/__tests__/viewport.test.ts`

- [ ] **Step 1: Write the failing test**

`src/chart/__tests__/viewport.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tToX, xToT, zoomTo, panBy, clamp, PRESETS, LIMITS, type Viewport } from '@/chart/viewport';

const view: Viewport = { tLeft: 40000, tRight: -4000 };   // past left, future right
const W = 1000;

describe('viewport math', () => {
  it('tToX/xToT are inverses', () => {
    for (const t of [-4000, 0, 12345, 40000]) {
      expect(xToT(tToX(t, view, W), view, W)).toBeCloseTo(t, 6);
    }
  });
  it('zoomTo keeps the anchor pixel stationary', () => {
    const anchorT = xToT(300, view, W);
    const zoomed = zoomTo(view, anchorT, 0.5);
    expect(tToX(anchorT, zoomed, W)).toBeCloseTo(300, 6);
  });
  it('clamp never yields tLeft <= tRight', () => {
    const bad = clamp({ tLeft: -10, tRight: 10 });
    expect(bad.tLeft).toBeGreaterThan(bad.tRight);
  });
  it('clamp respects deep-time limits', () => {
    const c = clamp({ tLeft: 1e12, tRight: -1e12 });
    expect(c.tLeft).toBeLessThanOrEqual(LIMITS.maxT);
    expect(c.tRight).toBeGreaterThanOrEqual(LIMITS.minT);
  });
  it('panBy shifts both edges equally', () => {
    const p = panBy(view, 1000);
    expect(p.tLeft - view.tLeft).toBeCloseTo(1000, 6);
    expect(p.tRight - view.tRight).toBeCloseTo(1000, 6);
  });
  it('exposes the documented zoom presets', () => {
    expect(PRESETS.map(p => p.label)).toEqual(['1y','10y','100y','1ky','10ky']);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm run test -- viewport`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/chart/viewport.ts`**

```ts
export interface Viewport { tLeft: number; tRight: number; }   // tLeft > tRight
export interface Dims { w: number; h: number; }

const YEAR = 365.25;
export const LIMITS = { maxT: 50000 * YEAR, minT: -50000 * YEAR, minSpanDays: 0.5 };

export const PRESETS = [
  { label: '1y',   span: YEAR },
  { label: '10y',  span: 10 * YEAR },
  { label: '100y', span: 100 * YEAR },
  { label: '1ky',  span: 1000 * YEAR },
  { label: '10ky', span: 10000 * YEAR },
] as const;

export const tToX = (t: number, v: Viewport, w: number): number =>
  ((v.tLeft - t) / (v.tLeft - v.tRight)) * w;

export const xToT = (x: number, v: Viewport, w: number): number =>
  v.tLeft - (x / w) * (v.tLeft - v.tRight);

export function clamp(v: Viewport): Viewport {
  let { tLeft, tRight } = v;
  if (tLeft <= tRight) { const m = (tLeft + tRight) / 2; tLeft = m + LIMITS.minSpanDays / 2; tRight = m - LIMITS.minSpanDays / 2; }
  if (tLeft - tRight < LIMITS.minSpanDays) { const m = (tLeft + tRight) / 2; tLeft = m + LIMITS.minSpanDays / 2; tRight = m - LIMITS.minSpanDays / 2; }
  tLeft = Math.min(tLeft, LIMITS.maxT);
  tRight = Math.max(tRight, LIMITS.minT);
  return { tLeft, tRight };
}

export function zoomTo(v: Viewport, anchorT: number, factor: number): Viewport {
  return clamp({
    tLeft: anchorT + (v.tLeft - anchorT) * factor,
    tRight: anchorT + (v.tRight - anchorT) * factor,
  });
}

export const panBy = (v: Viewport, deltaT: number): Viewport =>
  clamp({ tLeft: v.tLeft + deltaT, tRight: v.tRight + deltaT });
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npm run test -- viewport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/chart/viewport.ts src/chart/__tests__/viewport.test.ts
git commit -m "feat: pure viewport math (map/zoom/pan/clamp + presets)"
```

---

## Task 8: URL state sync (TDD)

**Files:**
- Create: `src/state/urlSync.ts`
- Test: `src/state/urlSync.test.ts`

- [ ] **Step 1: Write the failing test**

`src/state/urlSync.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { serializeView, parseView } from '@/state/urlSync';
import type { Viewport } from '@/chart/viewport';

describe('url sync', () => {
  it('numeric serialize->parse is exact for random viewports', () => {
    for (let i = 0; i < 100; i++) {
      const a = Math.random() * 1e6 - 5e5;
      const b = a - (Math.random() * 1e5 + 1);          // ensure tLeft > tRight
      const v: Viewport = { tLeft: a, tRight: b };
      const parsed = parseView(new URLSearchParams(serializeView(v)));
      expect(parsed.view.tLeft).toBeCloseTo(v.tLeft, 6);
      expect(parsed.view.tRight).toBeCloseTo(v.tRight, 6);
      expect(parsed.error).toBeNull();
    }
  });
  it('resolves readable ?d=&z= shorthand to a centered view', () => {
    const parsed = parseView(new URLSearchParams('d=1969-07-20&z=10y'));
    expect(parsed.error).toBeNull();
    expect(parsed.view.tLeft).toBeGreaterThan(parsed.view.tRight);
  });
  it('returns default + typed error on invalid input', () => {
    const parsed = parseView(new URLSearchParams('l=abc&r=def'));
    expect(parsed.error).toMatch(/could not parse/i);
    expect(parsed.view.tLeft).toBeGreaterThan(parsed.view.tRight);   // defaulted
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm run test -- urlSync`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/urlSync.ts`**

```ts
import { clamp, type Viewport } from '@/chart/viewport';
import { dateToT, parseFuzzyDate } from '@/chart/time';

const YEAR = 365.25;
const SPANS: Record<string, number> = { '1y': YEAR, '10y': 10*YEAR, '100y': 100*YEAR, '1ky': 1000*YEAR, '10ky': 10000*YEAR };

export const DEFAULT_VIEW: Viewport = clamp({ tLeft: dateToT(new Date(Date.UTC(1900,0,1))), tRight: dateToT(new Date(Date.UTC(2030,0,1))) });

/** Numeric form is the exact source of truth. */
export function serializeView(v: Viewport): string {
  const p = new URLSearchParams();
  p.set('l', v.tLeft.toFixed(4));
  p.set('r', v.tRight.toFixed(4));
  return p.toString();
}

export interface ParseResult { view: Viewport; error: string | null; }

export function parseView(p: URLSearchParams): ParseResult {
  // 1. Exact numeric form wins.
  if (p.has('l') && p.has('r')) {
    const l = Number(p.get('l')); const r = Number(p.get('r'));
    if (Number.isFinite(l) && Number.isFinite(r)) return { view: clamp({ tLeft: l, tRight: r }), error: null };
    return { view: DEFAULT_VIEW, error: 'could not parse l/r params' };
  }
  // 2. Readable shorthand ?d=&z=
  if (p.has('d')) {
    try {
      const center = dateToT(parseFuzzyDate(p.get('d')!));
      const span = SPANS[p.get('z') ?? '10y'] ?? SPANS['10y'];
      return { view: clamp({ tLeft: center + span/2, tRight: center - span/2 }), error: null };
    } catch {
      return { view: DEFAULT_VIEW, error: 'could not parse d param' };
    }
  }
  return { view: DEFAULT_VIEW, error: null };
}
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npm run test -- urlSync`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/urlSync.ts src/state/urlSync.test.ts
git commit -m "feat: URL state sync (exact numeric + readable shorthand)"
```

---

## Task 9: Layer interfaces + draw layers

**Files:**
- Create: `src/chart/layers/types.ts`, `GridLayer.ts`, `WaveLayer.ts`, `MarkersLayer.ts`
- Test: `src/chart/__tests__/markers.test.ts`

- [ ] **Step 1: Define `src/chart/layers/types.ts`**

```ts
import type { Viewport, Dims } from '@/chart/viewport';

export interface HitResult { kind: string; t: number; label?: string; }

export interface OverlayLayer {
  id: string;
  visible: (view: Viewport) => boolean;
  draw: (ctx: CanvasRenderingContext2D, view: Viewport, dims: Dims, data?: unknown) => void;
  hitTest?: (x: number, y: number, view: Viewport, dims: Dims) => HitResult | null;
}
```

- [ ] **Step 2: Implement `GridLayer.ts`**

```ts
import type { OverlayLayer } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT, tToDate } from '@/chart/time';

const YEAR = 365.25;
function tickStep(spanYears: number): number {
  if (spanYears < 5) return 1; if (spanYears < 25) return 5; if (spanYears < 120) return 10;
  if (spanYears < 600) return 50; if (spanYears < 3000) return 250; if (spanYears < 15000) return 1000;
  return Math.pow(10, Math.floor(Math.log10(spanYears / 8)));
}

export const GridLayer: OverlayLayer = {
  id: 'grid',
  visible: () => true,
  draw(ctx, view, dims) {
    ctx.strokeStyle = 'rgba(64,255,150,0.10)';
    ctx.fillStyle = 'rgba(127,255,127,0.55)';
    ctx.font = '13px "VT323", ui-monospace, monospace';
    const spanYears = (view.tLeft - view.tRight) / YEAR;
    const step = tickStep(spanYears);
    const yL = tToDate(view.tLeft).getUTCFullYear();
    const yR = tToDate(view.tRight).getUTCFullYear();
    for (let yr = Math.ceil(yL/step)*step; yr <= Math.floor(yR/step)*step; yr += step) {
      const t = dateToT(new Date(Date.UTC(yr, 5, 15)));
      const x = tToX(t, view, dims.w);
      if (x < 0 || x > dims.w) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
      ctx.fillText(yr < 0 ? `${-yr}BC` : `${yr}`, x + 4, dims.h - 6);
    }
  },
};
```

- [ ] **Step 3: Implement `WaveLayer.ts` (min/max envelope)**

```ts
import type { OverlayLayer } from './types';
import { xToT } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';

const PAD_TOP = 30, PAD_BOT = 30, SUPERSAMPLE = 4;

export const WaveLayer: OverlayLayer = {
  id: 'wave',
  visible: () => true,
  draw(ctx, view, dims) {
    const usableH = dims.h - PAD_TOP - PAD_BOT;
    const cols = Math.min(dims.w, 2000);
    const mins = new Array<number>(cols), maxs = new Array<number>(cols);
    let vMin = Infinity, vMax = -Infinity;
    const spacingDays = Math.abs(view.tLeft - view.tRight) / (cols * SUPERSAMPLE);
    for (let c = 0; c < cols; c++) {
      let lo = Infinity, hi = -Infinity;
      for (let s = 0; s < SUPERSAMPLE; s++) {
        const x = ((c + s / SUPERSAMPLE) / cols) * dims.w;
        const n = novelty(xToT(x, view, dims.w), { minSpacingDays: spacingDays });
        if (n < lo) lo = n; if (n > hi) hi = n;
      }
      mins[c] = lo; maxs[c] = hi;
      if (lo < vMin) vMin = lo; if (hi > vMax) vMax = hi;
    }
    const range = Math.max(1e-6, vMax - vMin);
    const yOf = (v: number) => PAD_TOP + (1 - (v - vMin) / range) * usableH;  // higher novelty = higher on screen
    // envelope fill
    ctx.beginPath();
    for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; c === 0 ? ctx.moveTo(x, yOf(maxs[c])) : ctx.lineTo(x, yOf(maxs[c])); }
    for (let c = cols - 1; c >= 0; c--) { const x = (c / cols) * dims.w; ctx.lineTo(x, yOf(mins[c])); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(80,255,140,0.18)'; ctx.fill();
    // crisp top edge
    ctx.strokeStyle = '#7fff9e'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; c === 0 ? ctx.moveTo(x, yOf(maxs[c])) : ctx.lineTo(x, yOf(maxs[c])); }
    ctx.stroke();
  },
};
```

- [ ] **Step 4: Write the failing markers test**

`src/chart/__tests__/markers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MARKERS } from '@/chart/layers/MarkersLayer';

describe('historical markers', () => {
  it('are display decoration with a label and a finite t', () => {
    expect(MARKERS.length).toBeGreaterThan(0);
    for (const m of MARKERS) {
      expect(typeof m.label).toBe('string');
      expect(Number.isFinite(m.t)).toBe(true);
    }
  });
  it('include the zero point at t=0', () => {
    expect(MARKERS.some(m => m.t === 0)).toBe(true);
  });
});
```

- [ ] **Step 5: Run it; verify it fails, then implement `MarkersLayer.ts`**

Run: `npm run test -- markers` → FAIL (module not found). Then:
```ts
import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT } from '@/chart/time';

const yearT = (y: number) => dateToT(new Date(Date.UTC(y, 5, 15)));

export const MARKERS = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444' },
  { t: yearT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearT(1492), label: '1492', color: '#ffb84a' },
  { t: yearT(1), label: 'Year 1 CE', color: '#ffb84a' },
] as const;

export const MarkersLayer: OverlayLayer = {
  id: 'markers',
  visible: () => true,
  draw(ctx, view, dims) {
    ctx.font = '11px "VT323", ui-monospace, monospace';
    for (const m of MARKERS) {
      const x = tToX(m.t, view, dims.w);
      if (x < -50 || x > dims.w + 50) continue;
      ctx.strokeStyle = m.color + '55'; ctx.lineWidth = m.t === 0 ? 2 : 1;
      ctx.setLineDash(m.t === 0 ? [] : [4, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = m.color; ctx.fillText(m.label, x + 4, 14);
    }
  },
  hitTest(x, _y, view, dims): HitResult | null {
    for (const m of MARKERS) { if (Math.abs(tToX(m.t, view, dims.w) - x) < 4) return { kind: 'marker', t: m.t, label: m.label }; }
    return null;
  },
};
```

- [ ] **Step 6: Run markers test; verify it passes**

Run: `npm run test -- markers`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/chart/layers src/chart/__tests__/markers.test.ts
git commit -m "feat: overlay layer interface + grid/wave/markers layers"
```

---

## Task 10: ChartProvider + globals styling

**Files:**
- Create: `src/state/ChartProvider.tsx`
- Modify: `src/app/globals.css` (font + palette)
- Create: `public/fonts/VT323.woff2`

- [ ] **Step 1: Add the VT323 font**

Download the VT323 woff2 (SIL Open Font License) into `public/fonts/VT323.woff2`.
Run:
```bash
mkdir -p public/fonts
curl -fsSL "https://raw.githubusercontent.com/google/fonts/main/ofl/vt323/VT323-Regular.ttf" -o /tmp/VT323.ttf
# Convert to woff2 if woff2_compress is available; otherwise ship the .ttf and update the @font-face src.
which woff2_compress && woff2_compress /tmp/VT323.ttf && mv /tmp/VT323.woff2 public/fonts/VT323.woff2 || cp /tmp/VT323.ttf public/fonts/VT323.ttf
ls public/fonts/
```
Expected: a font file exists in `public/fonts/`.

- [ ] **Step 2: Set up `globals.css`**

Replace the body of `src/app/globals.css` (keep the Tailwind import line) with:
```css
@font-face {
  font-family: 'VT323';
  src: url('/fonts/VT323.woff2') format('woff2');   /* basePath prefix applied at runtime where needed */
  font-display: swap;
}
:root {
  --tw-bg: #06090a; --tw-fg: #7fff9e; --tw-dim: rgba(127,255,127,0.45); --tw-accent: #ffb84a;
}
html, body { background: var(--tw-bg); color: var(--tw-fg); font-family: 'VT323', ui-monospace, monospace; }
.phosphor-glow { text-shadow: 0 0 6px currentColor; }
```

- [ ] **Step 3: Implement `ChartProvider.tsx`**

```tsx
'use client';
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { clamp, type Viewport } from '@/chart/viewport';
import type { OverlayLayer } from '@/chart/layers/types';
import { DEFAULT_VIEW } from '@/state/urlSync';

type Hover = { t: number; x: number; y: number; novelty: number } | null;
interface ChartCtx { view: Viewport; setView: (v: Viewport) => void; hover: Hover; setHover: (h: Hover) => void; layers: OverlayLayer[]; }

const Ctx = createContext<ChartCtx | null>(null);
export const useChart = (): ChartCtx => { const c = useContext(Ctx); if (!c) throw new Error('useChart outside provider'); return c; };

export function ChartProvider({ layers, children }: { layers: OverlayLayer[]; children: ReactNode }) {
  const [view, setViewRaw] = useState<Viewport>(DEFAULT_VIEW);
  const [hover, setHover] = useState<Hover>(null);
  const setView = useCallback((v: Viewport) => setViewRaw(clamp(v)), []);
  const value = useMemo(() => ({ view, setView, hover, setHover, layers }), [view, setView, hover, layers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/state/ChartProvider.tsx src/app/globals.css public/fonts
git commit -m "feat: ChartProvider context + phosphor palette + VT323 font"
```

---

## Task 11: DOSFrame chrome + route shells

**Files:**
- Create: `src/components/DOSFrame.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/help/page.tsx`, `src/app/about/page.tsx`, `src/app/not-found.tsx`
- Replace: `src/app/page.tsx` (temporary placeholder; real chart in Task 12)

- [ ] **Step 1: Implement `DOSFrame.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV = [ { href: '/', label: 'CHART' }, { href: '/help', label: 'HELP' }, { href: '/about', label: 'ABOUT' } ];

export function DOSFrame({ status, children }: { status?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center px-2 h-8 border-b border-[#163] text-sm phosphor-glow">
        <span>TIMEWAVE ZERO 2 · NOVELTY THEORY ENGINE</span>
        <nav className="flex gap-2">
          {NAV.map(n => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return <Link key={n.href} href={n.href} className={active ? 'text-[#7fff9e]' : 'text-[var(--tw-dim)]'}>[{n.label}]</Link>;
          })}
        </nav>
      </header>
      <main className="flex-1 min-h-0 relative">{children}</main>
      <footer className="flex gap-3 items-center px-2 h-6 border-t border-[#163] text-xs text-[var(--tw-dim)]">
        {status ?? <span>[H] HELP</span>}
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Wire `layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { DOSFrame } from '@/components/DOSFrame';

export const metadata: Metadata = {
  title: 'TIMEWAVE ZERO 2',
  description: 'A DOS-homage reboot of McKenna & Meyer’s Timewave Zero (Sheliak TW1).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><DOSFrame>{children}</DOSFrame></body></html>;
}
```

- [ ] **Step 3: Temporary `page.tsx` placeholder**

```tsx
export default function Page() {
  return <div className="grid place-items-center h-full text-[var(--tw-dim)]">CHART LOADING — implemented in Task 12</div>;
}
```

- [ ] **Step 4: `help/page.tsx`, `about/page.tsx` (shells; content in Task 16)**

`src/app/help/page.tsx`:
```tsx
import { HelpScreen } from '@/components/HelpScreen';
export const metadata = { title: 'TWZ2 · HELP', openGraph: { images: ['/og/help.png'] } };
export default function HelpPage() { return <HelpScreen />; }
```
`src/app/about/page.tsx`:
```tsx
import { AboutScreen } from '@/components/AboutScreen';
export const metadata = { title: 'TWZ2 · ABOUT', openGraph: { images: ['/og/about.png'] } };
export default function AboutPage() { return <AboutScreen />; }
```

- [ ] **Step 5: Stub the screen components so build passes**

`src/components/HelpScreen.tsx`:
```tsx
export function HelpScreen() { return <article className="max-w-[80ch] mx-auto p-6">HELP — content in Task 16</article>; }
```
`src/components/AboutScreen.tsx`:
```tsx
export function AboutScreen() { return <article className="max-w-[80ch] mx-auto p-6">ABOUT — content in Task 16</article>; }
```

- [ ] **Step 6: `not-found.tsx`**

```tsx
import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="grid place-items-center h-full">
      <div className="text-center space-y-3">
        <p className="phosphor-glow">ERR · 404 · ROUTE NOT FOUND</p>
        <p className="text-[var(--tw-dim)]">The address you entered does not exist in this build.</p>
        <Link href="/" className="underline">[ RETURN TO CHART ]</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify all routes build and render**

Run: `npm run build` then `npm run dev` and visit `/`, `/help`, `/about`, `/nope`
Expected: build succeeds; each route shows correct chrome; active-route bracket highlights; 404 page shows on `/nope`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: DOSFrame chrome + route shells (chart/help/about/404)"
```

---

## Task 12: ChartCanvas — first paint

**Files:**
- Create: `src/components/ChartCanvas.tsx`
- Replace: `src/app/page.tsx` (real chart, Suspense-wrapped)

- [ ] **Step 1: Implement `ChartCanvas.tsx` (render only; interactions in Task 13)**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import type { Dims } from '@/chart/viewport';

export function ChartCanvas() {
  const { view, layers } = useChart();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 800, h: 480 });

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setDims({ w: Math.max(320, r.width), h: Math.max(320, r.height) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = dims.w * dpr; c.height = dims.h * dpr;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.fillStyle = '#06090a'; ctx.fillRect(0, 0, dims.w, dims.h);
    let raf = requestAnimationFrame(() => { for (const l of layers) if (l.visible(view)) l.draw(ctx, view, dims, (l as { data?: unknown }).data); });
    return () => cancelAnimationFrame(raf);
  }, [view, dims, layers]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {typeof window !== 'undefined' && !('getContext' in HTMLCanvasElement.prototype)
        ? <p className="p-4">Your browser does not support &lt;canvas&gt;.</p>
        : <canvas ref={canvasRef} aria-label="Timewave novelty chart" style={{ width: dims.w, height: dims.h }} />}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx` with the real chart island**

```tsx
'use client';
import { Suspense } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartCanvas } from '@/components/ChartCanvas';
import { GridLayer } from '@/chart/layers/GridLayer';
import { WaveLayer } from '@/chart/layers/WaveLayer';
import { MarkersLayer } from '@/chart/layers/MarkersLayer';

const LAYERS = [GridLayer, WaveLayer, MarkersLayer];

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChartProvider layers={LAYERS}>
        <ChartCanvas />
      </ChartProvider>
    </Suspense>
  );
}
```

- [ ] **Step 3: Visual checkpoint**

Run: `npm run dev`, visit `/`
Expected: the green timewave envelope renders with year gridlines and the dashed marker lines (Zero Point, Apollo 11, etc.), filling the area between header and footer. Compare against `test1.jsx` opened separately — shapes should be consistent (allowing for the corrected Sheliak math vs the prototype's approximation). **STOP and review with the user here per the spec's phase-7 checkpoint.**

- [ ] **Step 4: Commit**

```bash
git add src/components/ChartCanvas.tsx src/app/page.tsx
git commit -m "feat: ChartCanvas first paint (DPR + layered render)"
```

---

## Task 13: Interactions + post-mount URL hydration

**Files:**
- Modify: `src/components/ChartCanvas.tsx`
- Modify: `src/state/ChartProvider.tsx` (debounced URL write + popstate)

- [ ] **Step 1: Add debounced URL write + popstate hydration to ChartProvider**

Add inside `ChartProvider`, after `setView` is defined:
```tsx
import { useEffect, useRef } from 'react';
import { serializeView, parseView } from '@/state/urlSync';
// ...
const didHydrate = useRef(false);
useEffect(() => {                                   // post-mount: apply URL -> view once
  const parsed = parseView(new URLSearchParams(window.location.search));
  if (parsed.error) console.warn(parsed.error);
  setViewRaw(parsed.view);
  didHydrate.current = true;
  const onPop = () => setViewRaw(parseView(new URLSearchParams(window.location.search)).view);
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}, []);
useEffect(() => {                                   // view -> URL, debounced
  if (!didHydrate.current) return;
  const id = setTimeout(() => {
    const url = `${window.location.pathname}?${serializeView(view)}`;
    window.history.replaceState(null, '', url);
  }, 150);
  return () => clearTimeout(id);
}, [view]);
```

- [ ] **Step 2: Add pointer interactions to ChartCanvas**

Add handlers (wheel zoom, drag pan, hover) using refs for transient drag state:
```tsx
import { xToT, zoomTo, panBy } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';
// inside component:
const { view, setView, setHover, layers } = useChart();
const drag = useRef<{ x: number; view: typeof view } | null>(null);

const onWheel = (e: React.WheelEvent) => { const x = e.nativeEvent.offsetX; setView(zoomTo(view, xToT(x, view, dims.w), e.deltaY > 0 ? 1.1 : 0.9)); };
const onPointerDown = (e: React.PointerEvent) => { drag.current = { x: e.nativeEvent.offsetX, view }; (e.target as Element).setPointerCapture(e.pointerId); };
const onPointerMove = (e: React.PointerEvent) => {
  const x = e.nativeEvent.offsetX;
  if (drag.current) { const dt = (x - drag.current.x) / dims.w * (drag.current.view.tLeft - drag.current.view.tRight); setView(panBy(drag.current.view, dt)); }
  else { const t = xToT(x, view, dims.w); setHover({ t, x, y: e.nativeEvent.offsetY, novelty: novelty(t) }); }
};
const onPointerUp = () => { drag.current = null; };
```
Attach to `<canvas onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => setHover(null)}>`.

- [ ] **Step 3: Draw the hover readout in the render effect**

In the render effect, after drawing layers:
```tsx
const { hover } = useChart();   // add hover to the destructure
// ...after layer loop:
if (hover) {
  ctx.strokeStyle = 'rgba(127,255,127,0.5)'; ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, dims.h); ctx.stroke();
}
```
Add `hover` to the effect dependency array.

- [ ] **Step 4: Manual verification (desktop + touch)**

Run: `npm run dev`
Expected: wheel zooms toward the cursor; click-drag pans; moving the mouse draws a vertical readout line; after movement stops, the URL gains `?l=…&r=…`; reloading that URL restores the same view; back/forward navigates view history.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChartCanvas.tsx src/state/ChartProvider.tsx
git commit -m "feat: pan/zoom/hover interactions + URL hydration & sync"
```

---

## Task 14: HUD, DateGoto modal, Hotkeys (+ focus-guard test)

**Files:**
- Create: `src/components/ChartHUD.tsx`, `src/components/DateGoto.tsx`, `src/components/Hotkeys.tsx`
- Modify: `src/app/page.tsx` (mount HUD), `src/app/layout.tsx` (mount Hotkeys)
- Test: `src/components/DateGoto.test.tsx`, `src/components/Hotkeys.test.tsx`

- [ ] **Step 1: Implement `ChartHUD.tsx`**

```tsx
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
        {PRESETS.map(p => (
          <button key={p.label} className="border border-[#163] px-2 text-xs" onClick={() => setView({ tLeft: center + p.span/2, tRight: center - p.span/2 })}>[ {p.label} ]</button>
        ))}
      </div>
      <button className="border border-[#163] px-2 text-xs pointer-events-auto" onClick={() => setGotoOpen(true)}>[ GOTO ]</button>
      {gotoOpen && <DateGoto onClose={() => setGotoOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing DateGoto test**

`src/components/DateGoto.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateGoto } from './DateGoto';
import { ChartProvider } from '@/state/ChartProvider';

const wrap = (ui: React.ReactNode) => <ChartProvider layers={[]}>{ui}</ChartProvider>;

describe('DateGoto', () => {
  it('shows an inline error for an unparseable date and stays open', async () => {
    const u = userEvent.setup();
    render(wrap(<DateGoto onClose={() => {}} />));
    await u.type(screen.getByRole('textbox'), 'not a date');
    await u.click(screen.getByRole('button', { name: /go/i }));
    expect(screen.getByText(/unrecognized date/i)).toBeInTheDocument();
  });
  it('closes after a valid date', async () => {
    const u = userEvent.setup(); const onClose = vi.fn();
    render(wrap(<DateGoto onClose={onClose} />));
    await u.type(screen.getByRole('textbox'), '1969-07-20');
    await u.click(screen.getByRole('button', { name: /go/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it; verify it fails, then implement `DateGoto.tsx`**

Run: `npm run test -- DateGoto` → FAIL. Then:
```tsx
'use client';
import { useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { parseFuzzyDate, dateToT } from '@/chart/time';

export function DateGoto({ onClose }: { onClose: () => void }) {
  const { view, setView } = useChart();
  const [text, setText] = useState(''); const [err, setErr] = useState<string | null>(null);
  const span = view.tLeft - view.tRight;
  const go = () => {
    try { const c = dateToT(parseFuzzyDate(text)); setView({ tLeft: c + span/2, tRight: c - span/2 }); onClose(); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <div role="dialog" className="fixed inset-0 grid place-items-center bg-black/70" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="border border-[#163] bg-[#06090a] p-4 space-y-2">
        <label className="block text-xs">GO TO DATE</label>
        <input autoFocus role="textbox" className="bg-black border border-[#163] px-2" value={text} onChange={e => { setText(e.target.value); setErr(null); }} onKeyDown={e => e.key === 'Enter' && go()} />
        <div className="flex gap-2"><button onClick={go}>[ GO ]</button><button onClick={onClose}>[ CANCEL ]</button></div>
        {err && <p className="text-[#ff5555] text-xs">{err}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run DateGoto test; verify it passes**

Run: `npm run test -- DateGoto`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing Hotkeys test (focus guard)**

`src/components/Hotkeys.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hotkeys } from './Hotkeys';

describe('Hotkeys', () => {
  it('ignores keys while a text input is focused', async () => {
    const u = userEvent.setup(); const onHelp = vi.fn();
    render(<><input data-testid="in" /><Hotkeys onHelp={onHelp} /></>);
    (document.querySelector('[data-testid=in]') as HTMLInputElement).focus();
    await u.keyboard('h');
    expect(onHelp).not.toHaveBeenCalled();
  });
  it('fires when focus is on the body', async () => {
    const u = userEvent.setup(); const onHelp = vi.fn();
    render(<Hotkeys onHelp={onHelp} />);
    await u.keyboard('h');
    expect(onHelp).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run it; verify it fails, then implement `Hotkeys.tsx`**

Run: `npm run test -- Hotkeys` → FAIL. Then:
```tsx
'use client';
import { useEffect } from 'react';

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || !!el.closest('[role=dialog]'));
};

export function Hotkeys({ onHelp }: { onHelp?: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.key === 'h' || e.key === '?') onHelp?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onHelp]);
  return null;
}
```

- [ ] **Step 7: Run Hotkeys test; verify it passes**

Run: `npm run test -- Hotkeys`
Expected: PASS (2 tests).

- [ ] **Step 8: Wire HUD into the page and Hotkeys into navigation**

In `src/app/page.tsx`, add `<ChartHUD />` next to `<ChartCanvas />` inside the provider. In `DOSFrame` (client), mount `<Hotkeys onHelp={() => router.push('/help')} />` using `useRouter` from `next/navigation`. (Add the remaining hotkeys from the spec table — `g`, `Tab`, arrows, `+/-`, `0`, `Esc` — following the same `isTyping()` guard pattern.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: HUD presets, DateGoto modal, focus-guarded hotkeys"
```

---

## Task 15: ShareButton + LiveReadout (a11y)

**Files:**
- Create: `src/components/ShareButton.tsx`, `src/components/LiveReadout.tsx`
- Modify: `src/components/DOSFrame.tsx` (status line shows readout + share)

- [ ] **Step 1: Implement `LiveReadout.tsx`**

```tsx
'use client';
import { useChart } from '@/state/ChartProvider';
import { tToDate, formatDate } from '@/chart/time';

export function LiveReadout() {
  const { hover } = useChart();
  const text = hover ? `${formatDate(tToDate(hover.t))} — novelty ${hover.novelty.toFixed(4)}` : '';
  return (
    <>
      <span aria-hidden className="text-xs">{text}</span>
      <span role="status" aria-live="polite" className="sr-only">{text}</span>
    </>
  );
}
```
Add a `.sr-only` utility to `globals.css` if Tailwind's isn't present:
```css
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
```

- [ ] **Step 2: Implement `ShareButton.tsx`**

```tsx
'use client';
import { useState } from 'react';

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <button onClick={copy} className="text-xs">[ {copied ? 'COPIED' : 'SHARE'} ]</button>;
}
```

- [ ] **Step 3: Put readout + share in the footer status line**

Pass `status={<><LiveReadout /><span className="ml-auto" /><ShareButton /></>}` from the chart page into `DOSFrame` (lift `DOSFrame`'s `status` prop through layout, or render these directly in the footer when on `/`). Keep `[H] HELP` hint visible on desktop.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Expected: hovering updates the footer readout (date + novelty); a screen reader announces it (verify the `role=status` node updates in devtools); SHARE copies the current URL and flips to COPIED briefly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shareable URL button + aria-live hover readout"
```

---

## Task 16: Help & About content + OG cards

**Files:**
- Modify: `src/components/HelpScreen.tsx`, `src/components/AboutScreen.tsx`
- Create: `public/og/chart.png`, `public/og/help.png`, `public/og/about.png`
- Modify: `src/app/page.tsx` route metadata (export `metadata` for OG)

- [ ] **Step 1: Write `HelpScreen.tsx` content**

Replace the stub with the six sections from spec §3 of the design (what this is; the Y axis = novelty/habit; the X axis = time with zero point at 2012-12-21; markers; controls incl. the full hotkey table; the math — King Wen → data set → fractal sum, Sheliak TW1). Single column, `max-w-[80ch]`, anchor links between sections. Frame novelty theory honestly as a theoretical model, not science.

- [ ] **Step 2: Write `AboutScreen.tsx` content**

Replace the stub with: origins (McKenna, *The Invisible Landscape* 1975; Meyer's 1989 DOS program); why the Sheliak TW1 variant; an explicit honesty disclaimer ("Novelty theory has no empirical basis in physics or history; this is an art piece and a working model, not a forecasting tool"); credits; and a Sources list linking the archive.org item, fractal-timewave.com, the Sheliak reference, and the GitHub repo.

- [ ] **Step 3: Create three OG PNGs**

Make `1200×630` green-on-black cards (a wave snippet + title) for `chart`, `help`, `about`. Place in `public/og/`. (Hand-made; runtime generation is out of scope per the spec.)
Run: `ls public/og/`
Expected: three PNGs present.

- [ ] **Step 4: Add OG metadata to the chart route**

Since `src/app/page.tsx` is a client component, move its `metadata` to a server wrapper: create `src/app/page.tsx` as a server component exporting `metadata` and rendering a `'use client'` `ChartIsland` (move the current client body into `src/components/ChartIsland.tsx`).
```tsx
// src/app/page.tsx (server)
import { ChartIsland } from '@/components/ChartIsland';
export const metadata = { title: 'TIMEWAVE ZERO 2', openGraph: { title: 'TIMEWAVE ZERO 2', images: ['/og/chart.png'] } };
export default function Page() { return <ChartIsland />; }
```

- [ ] **Step 5: Verify build + OG tags**

Run: `npm run build`, then inspect `out/index.html`, `out/help/index.html`, `out/about/index.html`
Expected: each contains its `og:image` referencing the right PNG and the right title/description.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: help/about content + per-route OG cards"
```

---

## Task 17: Playwright smoke test

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (e2e script)

- [ ] **Step 1: Install Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: chromium downloaded.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:3001/timewave-zero-2/', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  use: { baseURL: 'http://localhost:3001/timewave-zero-2/' },
});
```

- [ ] **Step 3: Write `e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('chart renders and help navigates', async ({ page }) => {
  await page.goto('./');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  // canvas has non-trivial drawn content
  const nonBlank = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')!; const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return d.some((v, i) => i % 4 !== 3 && v > 0);
  });
  expect(nonBlank).toBe(true);
  await page.getByRole('link', { name: /HELP/ }).click();
  await expect(page).toHaveURL(/help/);
});
```

- [ ] **Step 4: Add script and run**

Add `"e2e": "playwright test"` to `package.json` scripts.
Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: Playwright smoke (canvas paints + help nav)"
```

---

## Task 18: EXTENSION-POINTS doc + B/C readiness check

**Files:**
- Create: `src/chart/EXTENSION-POINTS.md`

- [ ] **Step 1: Write `EXTENSION-POINTS.md`**

Document the four contracts B and C inherit (from spec §1.5): the `OverlayLayer` interface and how to push a new layer; the `public/data/events.json` fetch boundary + graceful-null behavior; the `WAVE_VARIANT` invariant and the load-time assertion B must satisfy; and the rule that `src/chart/time.ts` and `src/chart/timewave.ts` stay React-free so B can import them.

- [ ] **Step 2: Verify the core is React-free**

Run: `grep -rn "react" src/chart/ || echo "CLEAN"`
Expected: `CLEAN` (no React imports anywhere under `src/chart/`).

- [ ] **Step 3: Verify WAVE_VARIANT is exported**

Run: `grep -n "WAVE_VARIANT" src/chart/timewave.ts`
Expected: the `export const WAVE_VARIANT = 'sheliak-tw1'` line.

- [ ] **Step 4: Full suite green**

Run: `npm run typecheck && npm run test && npm run e2e`
Expected: typecheck clean; all Vitest tests pass; Playwright smoke passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: extension-points contract for subprojects B and C"
```

---

## Task 19: GitHub Actions deploy + go live

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: out }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Push to GitHub**

Create the remote repo named `timewave-zero-2` (so the basePath matches), then:
```bash
git add -A && git commit -m "ci: GitHub Pages deploy workflow"
git branch -M main
git remote add origin git@github.com:<USERNAME>/timewave-zero-2.git
git push -u origin main
```

- [ ] **Step 3: Enable Pages**

In the GitHub repo: Settings → Pages → Source: **GitHub Actions**. Wait for the workflow run to finish.

- [ ] **Step 4: Live verification checkpoint**

Visit `https://<USERNAME>.github.io/timewave-zero-2/`.
Expected: chart renders; pan/zoom works; a shared `?l=&r=` URL restores the view; `/help` and `/about` load with correct OG previews (test via an OG debugger); the site works on a real phone (pinch-zoom, tap-to-pin, share copies URL). **STOP and review with the user per the spec's phase-13 checkpoint.**

- [ ] **Step 5: Final commit (if any fixes were needed)**

```bash
git add -A && git commit -m "fix: post-deploy adjustments"
git push
```

---

## Self-Review (completed during plan authoring)

**Spec coverage:** Every spec section maps to tasks — §1 layout → Tasks 1–3,9–11; §1.5 seams → Tasks 9 (layers), 3 (`data/`), 18 (extension doc + invariants); §2 engine/data flow → Tasks 10,12,13; §3 math/fidelity → Tasks 4,5; §4 deploy → Tasks 3,19; §5 tests → Tasks 5,6,7,8,14,17 + error handling woven into 8,12,13,14; §6 build sequence → task order; §7 open items → Task 4 outputs.

**Placeholders:** The only deferred-content steps are Task 4 (genuine external research — the fixture and `references/sheliak-algorithm.md` are its concrete deliverables, and Task 5's tests gate correctness) and Task 16 (prose content, fully specified by section). The `generateDataSet`/`novelty` bodies in Task 5 intentionally throw until implemented from the Task-4 procedure; this is a real dependency, not a hand-wave, and the failing tests define "done."

**Type consistency:** `Viewport {tLeft,tRight}`, `Dims {w,h}`, `OverlayLayer`, `NoveltyOptions {minSpacingDays}`, `parseView → {view,error}`, `serializeView(view): string`, `WAVE_VARIANT`, `novelty(t, opts?)` are used consistently across Tasks 5–17.

**Known follow-ups (out of scope for A, by design):** runtime OG generation; subproject B (`events.json` + EventsLayer); subproject C (echo prediction / WorkerLayer). The seams for these are in place and documented (Task 18).
