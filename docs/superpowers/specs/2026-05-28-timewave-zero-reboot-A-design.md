# Timewave Zero 2 — Subproject A: Static Next.js App (Design)

**Date:** 2026-05-28
**Status:** Design — pending user review
**Scope:** Subproject A only. Subprojects B (Wikipedia event index) and C (similar-event
prediction) are deliberately out of scope and get their own specs. This document designs A so
that B and C can plug in later without modifying A's core.

---

## 0. Context & decisions locked during brainstorming

A reboot of Terence McKenna / Peter Meyer's *Timewave Zero* (the 1989 DOS program) as a
static Next.js site deployed to GitHub Pages. A working prototype exists at `test1.jsx` (445
lines: King Wen sequence, a first-order-difference array, a fractal sum, canvas rendering,
pan/zoom, green-phosphor styling). The prototype is treated as a **visual reference and
starting sketch only** — its math is assumed incorrect until verified against a primary
source (see §3).

Reference material (from `CLAUDE.md`):
- https://archive.org/details/twz_20200405 (the original DOS program)
- https://www.fractal-timewave.com/ (Sheliak's revised timewave + reference data)

Decisions made:

| Decision | Choice | Rationale |
|---|---|---|
| Visual fidelity | **DOS-flavored modern** ("B") | Green-phosphor homage, mono, subtle glow, minimal chrome. Web-native, responsive, accessible. Matches the prototype's direction. |
| Audience | **Public + shareable** | Pulls in URL deep links, mobile polish, a help/about screen, social-share meta. |
| Timewave variant | **Sheliak's TW1 (1996)** | The math-corrected version McKenna later endorsed; has a defensible "fidelity" claim and published reference data. |
| Architecture | **Multi-route, shared chart layout** | `/`, `/help`, `/about`. Per-route OG metadata. B/C slot in as future routes/layers. |
| Language | **TypeScript** | The math is unit-confusion-prone (`t` vs date-ms vs years); types prevent silent bugs. |
| Deploy target | **Repo subpath** `<user>.github.io/timewave-zero-2/` | `basePath: '/timewave-zero-2'`. No DNS work. |
| Package manager | **npm**, gated by `~/.npmrc min-release-age=7` | Supply-chain defense; every new dep is ≥7 days old. |
| Test runner | **Vitest** (+ React Testing Library; Playwright for one smoke) | Native ESM/TS, fast, no Babel. |

---

## 1. Architecture & file layout

Next.js 15 App Router, **static export** (`output: 'export'`), TypeScript, Tailwind for
utility styling. The chart itself is **canvas-rendered**. No backend, no API routes, no
runtime Image Optimization (incompatible with static export).

**Hard architectural boundary:** `src/chart/` is pure TypeScript — no React, no DOM, no
`window`. The math, time conversions, viewport math, and canvas draw functions are testable
as plain modules and reusable by subproject B. `src/components/` is the React layer; it
imports from `chart/`, never the reverse.

```
timewave-zero-2/
├─ next.config.ts            # output:'export', basePath, trailingSlash, images.unoptimized
├─ vitest.config.ts
├─ playwright.config.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx          # DOSFrame + <ChartProvider> + <Hotkeys>
│  │  ├─ page.tsx            # "/" main chart route (client-bounded, Suspense for searchParams)
│  │  ├─ help/page.tsx       # "/help" — how to read the wave + theory (plain TSX)
│  │  ├─ about/page.tsx      # "/about" — credits, honest framing, sources
│  │  └─ not-found.tsx       # DOS-styled 404
│  ├─ chart/                 # PURE — no React/DOM. Reusable by subproject B.
│  │  ├─ timewave.ts         # Sheliak TW1: hexagram set, data-set generation, novelty()
│  │  ├─ time.ts             # zero-date constant, dateToT, tToDate, formatDate, parseFuzzyDate
│  │  ├─ viewport.ts         # tToX, xToT, zoomTo, panBy, clamp, PRESETS, limits
│  │  ├─ layers/
│  │  │  ├─ types.ts         # OverlayLayer interface
│  │  │  ├─ GridLayer.ts
│  │  │  ├─ WaveLayer.ts     # min/max envelope renderer
│  │  │  └─ MarkersLayer.ts  # named historical dates (display only — see §3 caveat)
│  │  ├─ __fixtures__/
│  │  │  └─ sheliak-reference.ts   # canonical data set + provenance comments
│  │  ├─ __tests__/          # see §5
│  │  └─ EXTENSION-POINTS.md # the contract B and C inherit
│  ├─ components/
│  │  ├─ DOSFrame.tsx        # title strip + status line chrome
│  │  ├─ ChartCanvas.tsx     # <canvas> + rAF loop + DPR + ResizeObserver + interactions
│  │  ├─ ChartHUD.tsx        # zoom-preset chips + GOTO button
│  │  ├─ DateGoto.tsx        # date-entry modal
│  │  ├─ HelpScreen.tsx      # content for /help
│  │  ├─ AboutScreen.tsx     # content for /about
│  │  ├─ Hotkeys.tsx         # window-level key handler (no UI)
│  │  ├─ ShareButton.tsx     # copy current URL + toast
│  │  └─ LiveReadout.tsx     # visually-hidden aria-live region (a11y)
│  ├─ state/
│  │  ├─ ChartProvider.tsx   # context: view, setView, hover, layers
│  │  └─ urlSync.ts          # querystring <-> viewport (numeric + readable shorthand)
│  └─ styles/globals.css     # VT323 font-face, palette tokens, glow/phosphor CSS
├─ public/
│  ├─ .nojekyll              # REQUIRED: stops Jekyll eating _next/
│  ├─ fonts/VT323.woff2      # self-hosted; offline-safe
│  ├─ og/{chart,help,about}.png   # hand-made static OG cards for v1
│  └─ data/README.md         # reserves dir for subproject B; documents the contract
└─ .github/workflows/deploy.yml   # build + actions/deploy-pages
```

### 1.5 Seams for subprojects B and C

A makes exactly these commitments so B/C fit without coupling. It builds **none** of B or C.

1. **`src/chart/` stays React-free.** B (offline pipeline) computes `t` values that must
   match A exactly. Either B imports `time.ts`/`timewave.ts` directly (Node — single source
   of truth, preferred), or transliterates with a CI parity test if B ends up in Python.
2. **`WAVE_VARIANT` invariant.** `timewave.ts` exports `WAVE_VARIANT = 'sheliak-tw1'`. B's
   output JSON carries a `wave_variant` field; A's data loader asserts they match on load.
   Guards against index/wave drift.
3. **Layered overlay model from day one.** The canvas is a stack of `OverlayLayer`s:
   ```ts
   interface OverlayLayer {
     id: string;
     visible: (view: Viewport) => boolean;
     draw: (ctx: CanvasRenderingContext2D, view: Viewport, dims: Dims, data?: unknown) => void;
     hitTest?: (x: number, y: number, view: Viewport) => HitResult | null;
   }
   ```
   v1 ships `[Grid, Wave, Markers]`. B adds `EventsLayer`; C adds `EchoLayer`. Paint order =
   array order; hit-test iterates reverse. No canvas-component changes when B/C arrive.
4. **Reserved `public/data/`.** A's loader fetches `${basePath}/data/events.json` on mount,
   returns `null` gracefully on 404; `EventsLayer.visible()` is `false` when data is null.
   Dropping B's output into the repo is a **zero-code-change** deploy for A.
5. **No B/C routes in v1.** `/events`, `/echoes/[date]` are NOT scaffolded — their data
   shapes aren't known yet; scaffolding now means writing types twice.
6. **`EXTENSION-POINTS.md`** documents the four contracts above as the inheritance for B/C.

C's runtime (browser-side compute via transformers.js vs fully-precomputed JSON from B) is
**deferred** — both fit the layer model; the `WorkerLayer` escape hatch (§2) covers the
heavy-compute case.

---

## 2. Chart engine internals & data flow

Four layers, strictly one-directional imports:

```
   math (pure)        viewport (pure)
        └─────┬──────────────┘
              ▼
     layers/ (pure draw fns)
              ▼
   ChartProvider (React state + URL sync)
              ▼
     ChartCanvas (React: rAF + pointer events + DPR)
              ▼
          <canvas>
```

**Viewport** = `{ tLeft: number; tRight: number }` with `tLeft > tRight` (past left, future
right; `t` decreases toward the eschaton). `t` is in **days from the zero date**.
`viewport.ts` exports pure `tToX`, `xToT`, `zoomTo(view, anchorT, factor)` (keeps the anchor
pixel stationary), `panBy`, `clamp`, and `PRESETS` (`1y / 10y / 100y / 1ky / 10ky`). Limits
cap `tLeft`/`tRight` at roughly `±50,000` years — the wave is defined everywhere but the UI
is useless beyond that.

**Wave rendering — min/max envelope (NOT one-sample-per-pixel).** The timewave is fractal /
high-frequency; sampling once per pixel aliases badly and jitters on pan. Instead, for each
pixel column the `WaveLayer` supersamples (2–4× the column's `t`-span), tracks the column's
`min` and `max` novelty, and draws the envelope between them (audio-waveform style). This is
what makes it actually *look* like the timewave at every zoom. DPR/retina handling is
explicit in `ChartCanvas` (scale canvas backing store by `devicePixelRatio`).

**ChartProvider** holds the only chart context:
```ts
type ChartState = {
  view: Viewport;
  setView: (next: Viewport) => void;   // clamps + debounced URL write
  hover: { t: number; x: number; y: number; novelty: number } | null;
  setHover: (h: ChartState['hover']) => void;
  layers: OverlayLayer[];              // registered at app boot
};
```
Transient interaction state (drag offsets, pinch midpoints) lives in `useRef` inside
`ChartCanvas` — never in context — so pointer-frequency updates don't cascade re-renders.

**Hydration safety (static export).** The page prerenders with the **default** viewport. A
post-mount `useEffect` reads the URL and applies any `?l/r` or `?d/z` state — reading
searchParams during render would cause a hydration mismatch. `useSearchParams` is wrapped in
a `<Suspense>` boundary (required under `output: 'export'`). Canvas is client-only, so the
one-frame default-view flash is invisible in practice.

**Draw loop** (`ChartCanvas`, on `view`/`dims` change → single `requestAnimationFrame`):
```
clearRect → for each visible layer: layer.draw(ctx, view, dims, layer.data)
          → if hover: drawHoverOverlay + update LiveReadout aria-live text
```

**Interaction → data flow** (wheel-zoom example):
1. `wheel` on canvas → `setView(zoomTo(view, xToT(mouseX), 0.9))`
2. provider clamps, schedules debounced (~150ms) URL write, dispatches state
3. `useEffect([view, dims])` schedules a rAF
4. next frame: full layered redraw
5. ~150ms after the wheel burst: querystring updates

**Escape hatch:** if a future heavy layer (C's similarity field) needs off-thread compute, it
implements `OverlayLayer` as a `WorkerLayer` (OffscreenCanvas) without disturbing the rest.

---

## 3. The math layer — fidelity is the soul (highest-risk section)

**Primary-source-first is a hard gate.** No timewave math is implemented until the Sheliak
TW1 reference is sourced and transcribed (build phase 4). We build from Sheliak's published
specification, **not** from `test1.jsx`.

Known risks the prototype gets wrong or leaves unverified — each must be resolved against the
primary source before implementation:

- **Data-set cardinality.** The prototype uses a 64-element first-order-difference array. The
  canonical McKenna/Meyer/Sheliak timewave is understood to be generated from a larger number
  set (commonly cited as **384 elements**, to be confirmed against the primary source in
  phase 4), and the *generation procedure* (King Wen sequence → the full set) is exactly what
  the **Watkins Objection** critiqued and **Sheliak's TW1** formalized. The real generation
  algorithm and its exact cardinality must be transcribed and verified from Sheliak's spec;
  assume the prototype's 64-element shortcut is incorrect.
- **Novelty / habit sign + normalization.** In the timewave, **low value = high novelty**;
  the zero point is **maximum novelty** and should plot at the **top**. The prototype's
  `abs(raw − ZERO)/ZERO` is an ad-hoc normalization that may invert the axis. The convention
  and normalization must be grounded in the reference. We do **not** assert any invented
  invariant like `novelty(0) === 0`.
- **Fractal-sum truncation.** It's an infinite sum; the prototype hardcodes 9 terms. Term
  count should be **adaptive to the sample spacing** (Nyquist-style), with a test confirming
  that adding more terms doesn't change a rendered slice.
- **Zero date.** An explicit, documented constant (McKenna aligned the eschaton to
  21 Dec 2012). The wave *shape* is calendar-independent; the date is only a horizontal
  anchor.

`MarkersLayer`'s named dates (Apollo 11, Trinity, 1492, Year 1) are **display decoration**,
not fidelity claims — see §5 on why we do not test the wave against historical narrative.

`timewave.ts` public surface (final names settled during phase 5):
- `WAVE_VARIANT = 'sheliak-tw1'`
- `novelty(t: number): number`
- the hexagram set + the verified data-set generation function
`time.ts`: `ZERO_DATE`, `dateToT`, `tToDate`, `formatDate`, `parseFuzzyDate`.

---

## 4. Build, static export & GitHub Pages deploy

**`next.config.ts`** is the only place deploy shape is configured:
```ts
const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/timewave-zero-2';
export default {
  output: 'export',
  basePath: isProd ? basePath : '',     // empty in dev so localhost works normally
  assetPrefix: isProd ? basePath : '',
  trailingSlash: true,                   // emits /help/index.html — GH Pages needs this
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: isProd ? basePath : '' },
};
```

**Why `NEXT_PUBLIC_BASE_PATH` is exposed:** static-export Next.js prefixes `next/link` and
`next/image` automatically, but **not** raw `fetch()` or CSS `url()`. The `events.json`
loader uses `fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/data/events.json`)`; the font URL is
prefixed via a CSS variable set at runtime.

**Required static assets:**
- `public/.nojekyll` (empty) — without it GH Pages runs Jekyll and strips `_next/`, breaking
  the whole site.
- `public/fonts/VT323.woff2` — self-hosted; no runtime Google Fonts call; offline-safe.
- `public/og/{chart,help,about}.png` — hand-made OG cards for v1. (Runtime-generated share
  cards are explicitly deferred to a follow-up after subproject B exists.)
- `public/data/README.md` — placeholder reserving the dir for B.

**Per-route OG metadata** via App Router `generateMetadata` / `metadata` exports — each route
sets its own title/description/`openGraph.images`, all referencing the static PNGs.

**`package.json` scripts:** `dev`, `build`, `preview` (`serve out -l 3001`), `lint`,
`typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch`.

**Local dev** runs with empty basePath. `npm run build` → `out/` with basePath applied.
`npm run preview` serves `out/` for a final subpath sanity check. None require GH Pages set up.

**`.github/workflows/deploy.yml`** — modern `actions/deploy-pages` flow (no `gh-pages`
branch):
- Trigger: push to `main` + `workflow_dispatch`.
- `permissions: { contents: read, pages: write, id-token: write }`,
  `concurrency: { group: pages, cancel-in-progress: true }`.
- Build job: checkout → setup-node 24 (npm cache) → `configure-pages@v5` (derives basePath
  from repo name, so renaming the repo just works) → `npm ci` → `typecheck` → `test` →
  `build` → `upload-pages-artifact` (`out`).
- Deploy job: `deploy-pages@v4`.
- **`typecheck` + `test` gate the deploy** — a failing test breaks the build, not the prod URL.
- `npm ci` installs from the locked tree, so `min-release-age` only bites when *adding* a dep
  locally, not in CI.

**One-time user setup:** Settings → Pages → Source: "GitHub Actions". Then live at
`<user>.github.io/timewave-zero-2/`.

**Custom domain later:** add `public/CNAME`, set `NEXT_PUBLIC_BASE_PATH=""`, point DNS.

---

## 5. Testing, error handling, and what we deliberately don't do

Three clearly-separated test kinds — never conflated:

- **Fidelity tests** — does our math match Sheliak's algorithm + reference data? Objective,
  the point of the project.
- **Characterization (regression) tests** — lock *current computed behavior* (e.g. the wave's
  actual extrema) to catch drift. Make no truth claim about history.
- **Contract/parser tests** — URL roundtrip, fuzzy-date parsing, viewport math.

**We do NOT write narrative-fitting tests.** Asserting "a novelty minimum near 1945 / the
Renaissance" is circular (McKenna fit the curve to those dates post-hoc) and gives false
confidence. The former `historical-peaks` idea is replaced by a **characterization snapshot**
of the wave's actual extrema over a fixed range.

**Math fidelity suite** (`src/chart/__tests__/`):
- `hexagram.test.ts` — King Wen set: length 64, every value in `[0,63]`, each exactly once,
  known anchors (Ch'ien / K'un) match published references; the data-set generation produces
  the verified 384-element reference exactly (the single most important test — fixture carries
  provenance + a second-source cross-check).
- `timewave.test.ts` — `novelty(t)` is finite (no NaN/Infinity) across the full clamp range
  and across a 10k random-`t` sweep; matches reference values at sourced sample points;
  adaptive-truncation stability (more terms ⇒ no rendered-slice change); axis/normalization
  matches the reference convention.
- `characterization.test.ts` — snapshot of computed extrema over a fixed range; locks shape.

**Contract suite:**
- `time.test.ts` — `dateToT(tToDate(x)) ≈ x` to FP precision across `±1e6` days; `formatDate`
  output; `parseFuzzyDate` accepts the five formats, rejects garbage with a typed error.
- `viewport.test.ts` — `xToT(tToX(t)) ≈ t`; `zoomTo` anchor stays put; `clamp` never yields
  `tLeft ≤ tRight`; presets respect limits.
- `urlSync.test.ts` — **numeric** `serialize(view) → parse === view` for 100 random
  viewports (exact, because we serialize numeric `t`, not date strings); readable shorthand
  `?d=1969-07-20&z=10y` resolves to a centered view; `?l=invalid` returns default + typed
  error (no throw); popstate debounce.

**Component tests** (Vitest + RTL) — trimmed to the genuinely tricky logic only:
- `DateGoto.test.tsx` — typing/parse flow + inline parse-error display.
- `Hotkeys.test.tsx` — ignores keys when a text input is focused or a modal is open
  (otherwise typing "h" closes the GOTO modal — classic bug).

**E2E** — one Playwright `smoke.spec.ts` (load `/`, canvas has non-trivial pixel content,
nav to `/help` works). Runs in a separate non-blocking CI job; does not gate deploy.

**URL contract:** numeric `?l=&r=` (days-from-zero) is the exact source of truth; an optional
human-readable `?d=YYYY-MM-DD&z=10y` shorthand is accepted for hand-shared links and resolved
to a centered viewport on load. Whatever the user lands on is re-serialized to the numeric
form to keep round-trips bit-stable.

**Error-handling audit:**

| Failure | Handling |
|---|---|
| Invalid URL params | parse returns default + typed error; non-blocking toast; show default view |
| Unparseable date in GOTO | inline error in modal; modal stays open |
| `events.json` 404 (B not shipped) | expected; `EventsLayer.visible()` false; no error surfaced |
| `events.json` `wave_variant` mismatch | `console.error`, layer not rendered, no user-facing error |
| NaN/Infinity at extreme zoom | guarded by `clamp` in `viewport.ts`; unit-tested |
| VT323 font load failure | CSS fallback `'VT323', ui-monospace, monospace`; graceful degrade |
| `<canvas>` unsupported | feature-detect → textual fallback message |
| popstate during write | debounced write dropped; URL is source of truth on popstate |
| ResizeObserver mid-pinch | cancel active gesture; restart on next pointer event |

**Accessibility:** semantic HTML; `<canvas aria-label>` with a textual summary; a
visually-hidden `aria-live` region (`LiveReadout`) announces the hover/pinned readout (date +
novelty) so keyboard/screen-reader users get the actual values; full keyboard control via
hotkeys + GOTO.

**Deliberate non-goals (YAGNI):** no MDX (plain TSX for help/about); no error-tracking
service; no service worker / offline mode; no CSP headers (not configurable on GH Pages, no
third-party scripts loaded); no telemetry; no visual-regression suite (flaky for canvas +
fonts); no Lighthouse CI budgets (theater for a tiny static bundle); no runtime OG image
generation in v1.

---

## 6. Build sequence

Each phase ends in a verifiable, demonstrable state. Phases 1–3 = foundation; 4–6 = correct
math; 7 = first paint; 8–11 = usable + shareable; 12–13 = live; 14 = B/C readiness.

| # | Phase | Verifiable end-state | Depends on |
|---|---|---|---|
| 1 | Scaffold (create-next-app: TS, Tailwind, App Router, ESLint, Vitest) | `dev` shows default page; `typecheck` + `test` pass on empty suites | — |
| 2 | GH Pages config (`next.config.ts`, `.nojekyll`, self-hosted VT323, base CSS palette) | `build && preview` serves correctly under `/timewave-zero-2/` | 1 |
| 3 | DOSFrame + 4 route shells (title strip, status line, nav, not-found) | all routes load with chrome; active-route highlight; mobile breakpoint compresses | 2 |
| 4 | **Source Sheliak reference (HARD GATE).** Locate canonical generation procedure + data set; transcribe to `__fixtures__/sheliak-reference.ts`; cross-check a second source; document provenance | fixture committed with ≥2 citations | 1 (research, parallel to 2–3) |
| 5 | Math layer (TDD): hexagram + data-set generation tests first → implement `timewave.ts` → `time.ts` + tests → characterization snapshot | all math + time tests green; normalization/sign matches reference | 4 |
| 6 | Viewport + URL sync (`viewport.ts` + tests, `urlSync.ts` numeric+readable + tests, `ChartProvider`) | viewport + URL roundtrip tests green | 5 |
| 7 | Layer stack + canvas render (`OverlayLayer`, Grid/Wave/Markers, `ChartCanvas` rAF + DPR + envelope) | visit `/`, see the wave with markers; no interactivity yet — **visual checkpoint vs prototype** | 6 |
| 8 | Interactions (wheel/drag/hover desktop; pinch/drag/tap-to-pin touch; post-mount URL hydration) | full pan/zoom/hover on desktop + iOS Safari + Android Chrome; URL updates on idle | 7 |
| 9 | HUD + DateGoto + Hotkeys (`parseFuzzyDate`, focus-guarded key handler) | all hotkeys fire; GOTO "1969-07-20" recenters; Esc closes modal | 8 |
| 10 | Content for /help + /about (honest framing; cross-linked anchors) | read-through passes | 3 (parallel) |
| 11 | OG metadata + ShareButton + LiveReadout (3 hand-made PNGs; `generateMetadata`; clipboard copy; aria-live) | OG preview testers show images; share copies URL; readout announced | 3 |
| 12 | Tests: `DateGoto` + `Hotkeys` (RTL) + one Playwright smoke | full local suite green < 30s | 9, 10 |
| 13 | GH Actions + first prod deploy; Settings → Pages → GitHub Actions | live at `<user>.github.io/timewave-zero-2/`; **manual checkpoint** — every route + mobile + share roundtrip | 12 |
| 14 | B/C readiness: `EXTENSION-POINTS.md` current; `data/README.md` contract; `grep -r react src/chart/` empty; `WAVE_VARIANT` exported | checklist committed; v1 done; B/C unblocked | 13 |

**Dependency chain:** `1 → 2 → 3 → (4 ∥ 10) → 5 → 6 → 7 → 8 → 9 → 11 → 12 → 13 → 14`.
Phases 4, 10, 11 can run out of strict order with a parallel collaborator; 5–9 are a hard
sequential chain.

**Checkpoints:** after phase 7 (first paint — fix any visual drift vs the prototype here) and
after phase 13 (click through every route on a real phone before declaring v1 done).

---

## 7. Open items to resolve during implementation (not blockers)

- Exact Sheliak generation algorithm + the 384-element reference values (phase 4 output).
- Final naming inside `timewave.ts` once the algorithm is transcribed.
- Whether `parseFuzzyDate` handles BCE input as negative years or an explicit "BCE" suffix
  (decide in phase 9; URL numeric `t` handles deep time regardless).
