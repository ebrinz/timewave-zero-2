# Subproject B — Historical Events Timeline — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorming)

## The larger vision (context)

Turn the timewave into a two-sided oracle:

- **Past** — a timeline of *recognizable, dated historical events* snapped onto the
  wave (this subproject, **B**).
- **Future** — *vague, oracular poetic readings* generated per fractal level from
  the I Ching **hexagram** active at that scale, plus a **word cloud** of resonant
  terms, with the "echoes" being the historical events that most resonate with that
  hexagram (subproject **C**).

Everything lives in **one shared 300-dimensional GloVe vector space**, reusing the
existing Rust→WASM `semantic-engine` from `../technolabe`
(`packages/semantic-engine`, 180 KB wasm) and its 7500-word GloVe table. In that
space, domain entities are **centroids** = the average of their keyword vectors
(exactly how technolabe already represents zodiac signs, tarot cards, and Egyptian
glyphs). Hexagrams and historical events are just two more centroid sets.

**B ships first** and is independently valuable (a real historical timeline on the
chart). It also produces the **event centroid vectors** that C will resonate
against, so C drops in cleanly afterward.

## Goal

Overlay recognizable, dated historical events on the timewave — sourced from
**Wikidata**, snapped to the **exact same `t`** the chart uses, density-adaptive
across zoom — and emit, as a build artifact, the **GloVe centroid vector per
event** for subproject C. Honor the four contracts in
`src/chart/EXTENSION-POINTS.md`.

## Non-goals (deferred to C)

Hexagram-at-scale mapping, oracle readings, word clouds, the in-browser wasm/GloVe
engine, `EchoLayer`, "ask the oracle," and **quantization of the 8.6 MB GloVe bin**
(that bin is only downloaded by the browser in C; B uses GloVe at build time only).

## Architecture

Two pieces, cleanly separated by the static-data boundary
(`EXTENSION-POINTS.md` §4):

1. **Offline pipeline** (Python, under `scripts/build-events/`). Queries Wikidata,
   snaps each event to `t`, computes its GloVe centroid, and writes two committed
   artifacts to `public/data/`:
   - `events.json` — event metadata for rendering (the only file the browser loads
     in B).
   - `events.bin` — per-event 300-dim centroid vectors in the engine's centroid
     format (built now, consumed by C; **not** fetched at runtime in B).

   The pipeline is **run on demand and its output committed** — deterministic,
   no network in CI, no rate-limit surprises. Re-runnable to refresh.

2. **App rendering** (TypeScript). A loader fetches `events.json` on mount; a new
   `EventsLayer` (an `OverlayLayer`) draws zoom-adaptive event ticks + labels and
   supports `hitTest` for tap/click details. Appended to `LAYERS` in
   `ChartIsland.tsx` — no change to `ChartCanvas`.

## Data shapes

`public/data/events.json`:

```json
{
  "wave_variant": "sheliak-tw1",
  "generated": "2026-06-06",
  "glove": "glove-6B-300d",
  "events": [
    {
      "id": "Q2256",
      "t": 24587.5,
      "date": "1945-08-06",
      "year": 1945,
      "title": "Atomic bombing of Hiroshima",
      "summary": "First wartime use of a nuclear weapon.",
      "url": "https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki",
      "score": 0.97
    }
  ]
}
```

- `t` — days-before-zero, computed by a Python port of `dateToT` (see Parity).
- `score` — notability in `[0,1]`, the sitelink-count percentile; drives
  zoom-adaptive selection (higher = shown at wider zoom).
- `summary` — a short (≤ ~140 char) description; also the centroid text source.

`public/data/events.bin` (engine centroid format, little-endian; matches
technolabe's glyph/centroid bins so C's wasm loads it unchanged):

```
u32 count        // number of events with a vector
u32 dim          // 300
count × (null-terminated UTF-8 id)
count × (dim × float32)   // L2-normalized centroid vectors, event order
```

Events whose every token is out-of-vocabulary are kept in `events.json` (still
rendered on the timeline) but omitted from `events.bin` (no vector). The `id` keys
join the two files.

## Pipeline detail (`scripts/build-events/`)

1. **`query_wikidata.py`** — POST a SPARQL query to the Wikidata Query Service for
   notable, dated events. Sketch:

   ```sparql
   SELECT ?event ?eventLabel ?date ?article ?sitelinks ?desc WHERE {
     ?event wdt:P585 ?date .                     # point in time
     ?event wikibase:sitelinks ?sitelinks .
     FILTER(?sitelinks >= 40)                    # notability floor
     ?article schema:about ?event ;
              schema:isPartOf <https://en.wikipedia.org/> .
     OPTIONAL { ?event schema:description ?desc . FILTER(LANG(?desc) = "en") }
     SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
   }
   ORDER BY DESC(?sitelinks)
   LIMIT 1500
   ```

   (A second query variant keys off `instance of` occurrence subclasses — war,
   battle, treaty, disaster, election, pandemic, spaceflight, discovery — for
   events lacking a direct `P585`; union and de-dupe by QID.)

2. **`time_map.py`** — port of `src/chart/time.ts`:
   `ZERO = Date.UTC(2012,11,21,12,0,0)`,
   `dateToT(d) = (ZERO_ms - d_ms) / 86_400_000`. Handles BCE via explicit year
   math (mirror `yearToDate`). Range/interval dates use the start instant.

3. **`build_events.py`** — for each event: resolve date → `t`; compute
   `score` = percentile rank of sitelinks; build the centroid by tokenizing
   `title + " " + summary`, lower-casing, looking up GloVe 6B 300d vectors (reuse
   `../technolabe/packages/semantic-data/scripts/common/vector_utils.py`),
   averaging, L2-normalizing. De-dupe by QID; drop undated. Write `events.json`
   and `events.bin`. Stamp `wave_variant` from a single shared constant.

GloVe source: the same `glove.6B.300d` technolabe's `process_glove.py` already
consumes. The pipeline reads it locally at build time; it is **never shipped** in B.

## Time-mapping parity (EXTENSION-POINTS §1)

The Python `dateToT` must match `src/chart/time.ts` **exactly**. Guard it both ways:

- A committed fixture `src/chart/__fixtures__/time-parity.json` of
  `{ iso, t }` pairs the Python writes.
- A Vitest test asserts `dateToT(new Date(iso)) === t` for every pair, so a drift in
  either implementation fails CI.

## EventsLayer (`src/chart/layers/EventsLayer.ts` + `src/chart/events.ts`)

- **Types** (`src/chart/events.ts`): `TimelineEvent { id, t, date, year, title,
  summary, url, score }`; `EventsData { wave_variant, events: TimelineEvent[] }`.
- **`selectVisibleEvents(events, view, maxLabels)`** — pure, unit-tested: filter to
  the visible `[tRight, tLeft]` range, sort by `score` desc, take the top
  `maxLabels` (where `maxLabels` scales with zoom — fewer when zoomed out, more when
  zoomed in, mirroring `timeTicks`' density logic), then drop any whose label would
  collide in x with one already kept.
- **`EventsLayer.visible(view)`** → `data != null && data.events.length > 0`.
- **`draw`** — read events from the forwarded `data` argument (the v1 mechanism in
  `EXTENSION-POINTS.md` §4: `ChartCanvas` already calls
  `l.draw(ctx, view, dims, (l as {data?}).data)`). For each selected event draw a
  dashed amber tick (`var(--wb-orange)`) and a truncated title label, culling
  off-screen x.
- **`hitTest(x,y,view,dims)`** — nearest event tick within a few px →
  `{ kind: 'event', t, label }` (extend `HitResult`), so a tap/click can surface
  the event (title · date, with a link). Reuses the existing pointer/`LiveReadout`
  path; a richer popover is a nice-to-have, not required for v1.

## Loader & wave_variant guard (EXTENSION-POINTS §2, §4)

On mount, fetch `` `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/data/events.json` ``
(raw `fetch` is **not** auto-prefixed under `basePath`). On success, assert
`json.wave_variant === WAVE_VARIANT` (`console.error` + treat as `null` on
mismatch); on 404, treat as `null` silently (expected before the pipeline first
runs). Assign the loaded events to `EventsLayer.data`; a `null` data layer draws
nothing.

## File structure

```
scripts/build-events/
  query_wikidata.py     # SPARQL → raw events
  time_map.py           # dateToT port (+ parity-fixture writer)
  build_events.py       # → public/data/events.json + events.bin
  requirements.txt
  README.md             # how to run, GloVe path, attribution
public/data/events.json          # committed
public/data/events.bin           # committed
src/chart/events.ts              # types + selectVisibleEvents (pure)
src/chart/layers/EventsLayer.ts  # OverlayLayer
src/chart/layers/types.ts        # extend HitResult with 'event'
src/chart/__fixtures__/time-parity.json
src/state/ChartProvider.tsx      # fetch events, set EventsLayer.data
src/components/ChartIsland.tsx    # append EventsLayer to LAYERS
```

## Testing

- **Pure (Vitest):** `selectVisibleEvents` (range filter, top-N-by-zoom, x
  collision, culling); `dateToT` parity-fixture test; an `events.json` schema/shape
  guard (has `wave_variant`, sane `t`/`score` ranges).
- **Pipeline (light):** a Python unit test for `time_map.dateToT` against the same
  parity fixture and a tiny centroid-builder fixture.
- **Live (Playwright):** events render at two zoom depths (sparse when out, denser
  when in); tapping an event shows its title/date; verified mobile (375×667) and
  desktop without layout regressions.

## Risks / mitigations

- **Wikidata reliability / rate limits** → run offline, commit output; pin a
  `LIMIT` and notability floor.
- **Notability bias** (recent/Western skew) → acknowledged; `score` + zoom-adaptive
  density keep it legible. Vocabulary/coverage tuning is iterative.
- **Date edge cases** (BCE, ranges, circa) → start-instant rule; BCE handled by the
  `yearToDate` mirror; undated dropped.
- **GloVe licensing** → Apache 2.0; Wikidata is CC0, Wikipedia text CC BY-SA
  (we store only short summaries + links). Note attribution in the pipeline README.

## Out of scope (subproject C, follow-on)

Hexagram centroid set (`hexagrams_64.bin`), the hexagram-at-fractal mapping,
template readings, the GloVe word cloud, reuse of the `semantic-engine` wasm in the
browser, `EchoLayer`, "ask the oracle," and GloVe-bin trimming/int8 quantization.
