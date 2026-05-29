# Extension Points — the contract for subprojects B and C

Subproject **A** (this app) deliberately exposes a small, stable surface so the
future subprojects can attach **without modifying A's core**:

- **B** — Wikipedia event index: an offline pipeline that snaps historical events
  to a `t` on the timewave and emits a static JSON the app overlays.
- **C** — similar-event prediction: for a future point, find timewave
  neighbourhoods with the most similar shape in the past and surface the events
  that lived there.

Honour these four contracts and B/C drop in cleanly.

## 1. The chart core is React-free and portable

Everything under `src/chart/` (except `layers/`, which references the canvas draw
target) imports **no React, no DOM, no `window`**. In particular `time.ts` and
`timewave.ts` are pure TypeScript and can be imported directly by a Node-side
build script.

- B should `import { dateToT, tToDate, yearToDate } from '@/chart/time'` and
  `import { novelty, DATA_SET } from '@/chart/timewave'` so its `t` values match
  the app **exactly** (single source of truth). If B is written in Python instead,
  transliterate `time.ts` and add a CI parity test — do not re-derive by hand.
- CI guard: `grep -rn "react" src/chart/` must return nothing. Keep it that way.

## 2. `WAVE_VARIANT` invariant

`timewave.ts` exports `WAVE_VARIANT = 'sheliak-tw1'`. Any data B generates is tied
to a specific wave; mismatched data silently misaligns events.

- B's output JSON MUST carry a top-level `"wave_variant"` field.
- A's data loader MUST assert `json.wave_variant === WAVE_VARIANT` on load and
  refuse to render the layer (console.error, no crash) on mismatch.

## 3. The overlay layer model

The canvas is drawn as an ordered stack of `OverlayLayer`s
(`src/chart/layers/types.ts`):

```ts
interface OverlayLayer {
  id: string;
  visible: (view: Viewport) => boolean;
  draw: (ctx: CanvasRenderingContext2D, view: Viewport, dims: Dims, data?: unknown) => void;
  hitTest?: (x: number, y: number, view: Viewport, dims: Dims) => HitResult | null;
}
```

A v1 ships `[GridLayer, WaveLayer, MarkersLayer]` (registered as the `LAYERS`
const in `src/components/ChartIsland.tsx`). To add a layer:

1. Implement an `OverlayLayer` under `src/chart/layers/` (pure draw fn; it may
   reference `CanvasRenderingContext2D` but must contain no React).
2. Append it to `LAYERS` in the order you want it painted (later = on top).
   `ChartCanvas` paints `LAYERS` in order each frame; `hitTest` iterates in
   reverse (topmost wins). No change to `ChartCanvas` is required.

- **B** → `EventsLayer` (renders event ticks/labels at each event's `t`).
- **C** → `EchoLayer` (renders the matched past neighbourhoods / predicted echoes).
  If C needs heavy off-thread compute, implement it as a `WorkerLayer` variant
  (OffscreenCanvas) — still just an `OverlayLayer` to the rest of the app.

## 4. The static data fetch boundary

`public/data/` is reserved for B's output. A's loader fetches
`` `${process.env.NEXT_PUBLIC_BASE_PATH}/data/events.json` `` on mount (raw
`fetch` is NOT auto-prefixed by Next under basePath — always include the env
prefix), and:

- returns `null` gracefully on 404 (expected until B ships — no error surfaced);
- a layer whose `data` is `null` returns `false` from `visible()` and draws nothing.

So **dropping B's `events.json` into `public/data/` is a zero-code-change deploy**
for A. (As of v1 the loader/`EventsLayer` are not yet present — they arrive with B;
this documents where they attach.)

## What v1 deliberately does NOT do

- No `/events` or `/echoes/[date]` routes (their data shapes aren't known yet —
  scaffolding now would mean writing types twice).
- No embedding/ML/Python code, no Wikipedia ingestion.
- No commitment to whether C runs in-browser (transformers.js) or as precomputed
  JSON — both fit the layer model above.
