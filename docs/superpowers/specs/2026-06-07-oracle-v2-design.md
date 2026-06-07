# Oracle v2 — line-aware traditional readings + wave gloss — Design

**Date:** 2026-06-07
**Status:** Approved (brainstorming)

## Goal

Make the oracle more useful by (1) using the active **changing line (yao)**, not just
the hexagram; (2) showing the **authentic traditional Legge stanza** (Judgment + the
governing line text) with **our generated gloss layered after in a distinct
typeface**; (3) having the gloss **explain the wave** (novelty tendency + trend); and
(4) improving the **GloVe term quality**. The event set is **dynamically ingested** —
growing `events.json` feeds the oracle's resonance and terms via one rebuild, no code
change.

## Decisions (from brainstorming)

- Purpose: **explain the wave** (narrate what the timewave is doing).
- Directions: **changing lines (yao)** + **better terms/text**.
- Traditional text: **Judgment + active line** (all 384 Legge line texts), public
  domain. Traditional in **serif**, our gloss in **VT323 mono/amber**.
- **Dynamic events:** the oracle build owns the centered `events.bin`; B emits only
  `events.json`. Adding events = grow `events.json` → one oracle-data rebuild.

## A reading (panel layout)

```
❼  40 · Deliverance — line 3
─ traditional (serif) ─
"Deliverance. In (the state indicated by) it the south-west is advantageous…"   (Judgment)
"The third line, divided, suggests a porter with his burden, yet riding too…"    (line 3)
─ our reading (VT323 mono, amber) ─
The wave runs deep and falling — habit dissolving, the new ingressing.   ▼ novelty deepening
rain · release · storm · thaw            echoes: Storm Daniel · 1989
```

## Components

### 1. Active line (yao) — `src/chart/oracle/hexagram.ts`

`activeHexagramAt(t, span)` already computes `index = floor(|t|·64^s) mod 384`. Return
the **line** too: `line = (index % 6) + 1` (1 = bottom yao). `ActiveHexagram` gains
`line: number`. Each 64× dive advances the scale and refines the line.

### 2. Traditional layer — Legge Judgment + line texts

`hexagrams.json` (eager) carries authentic Legge text per hexagram:
`{ n, glyph, name, judgment, lines: [l1..l6], seedWords }`. Rendered in a **serif**
(`ui-serif, Georgia, serif`) so it reads as the canonical quote. The panel shows the
`judgment` plus `lines[line-1]` for the active line.

**Sourcing (controller-run):** fetch a public-domain **Legge** "Yî King" text and
parse into `{ n, judgment, lines[6] }` for all 64 hexagrams. Legge's per-hexagram
structure is regular (the Thwan/Judgment, then numbered line statements). The parser
runs once; output is committed in `hexagrams_source.json`. Per-line fallback: if the
source is ragged for a line, store an empty string and the panel omits that line
gracefully (never blocks). Provenance recorded in the pipeline README (Legge 1882,
public domain).

### 3. Our gloss — explain the wave — `src/chart/oracle/wave.ts` (new)

Pure `waveState(t, span)`:
- `v = novelty(t)`; sample `novelty` at ~24 points across the visible window
  `[tRight, tLeft]` for `min`/`max`; `rank = (v - min) / (max - min || 1)`.
- **tendency** from rank: low value = **ingression** (high novelty / the new);
  high = **entrenchment** (habit); middle = **transition**. (Per the algorithm:
  low wave value = high novelty.)
- **trend** from slope toward the future: compare `novelty(t)` vs `novelty(t - span·0.02)`
  (smaller t = later); value falling toward the future = **deepening** (ingressing),
  rising = **returning** (habit), flat = **steady**.
- Returns `{ tendency, trend, value, rank }`.

`composeReading(hex, line, ws, cloud)` weaves: the line position sense (1 below … 6
beyond; 2 & 5 central), the wave tendency+trend clause, and two cloud words — e.g.
`"line 3 (the threshold). The wave runs deep and falling — habit dissolving, the new
ingressing. — rain, release."` A `waveBadge(ws)` returns a short label + arrow
(`▼ novelty deepening`, `▲ habit returning`, `■ steady`).

### 4. Better terms

- `hexagrams_source.json` gains a curated **`keywords`** array per hexagram (stronger
  imagery than auto-extraction); `seedWords` = `keywords` ∪ tokens from the Legge
  judgment+lines.
- `glove_q.bin` vocab = hexagram seeds ∪ **event tokens (from current `events.json`)**
  ∪ a small **wave-state vocabulary** (ingression, habit, dissolving, returning, …)
  ∪ top-frequency English.
- Runtime: `wordCloud` filters out a small weak/function-word set so clouds surface
  imagery, not connective tissue.

### 5. Dynamic event ingestion — unified oracle data build

The **oracle build owns the centered vectors**. `scripts/build-oracle/build_oracle.py`
reads the *current* `events.json` + `hexagrams_source.json` + raw GloVe and, in one
pass with a single common-component mean, writes **all four** artifacts consistently:
`hexagrams.json`, `hexagrams_64.bin`, `glove_q.bin`, and **`events.bin`** (centered
event centroids). `scripts/build-events/build_events.py` is trimmed to emit **only
`events.json`** (its `events.bin` write is removed; B's `EventsLayer` uses
`events.json`, so rendering is unaffected).

Workflow to grow the oracle: **regenerate `events.json` (B) → run the oracle data
build → commit.** The runtime then ingests the larger set automatically (more/better
echoes + event-derived vocabulary), no code change.

**Staleness guard:** the runtime resonance step skips if `events.bin`'s row count ≠
`events.json` length (a mismatched/stale bin → no resonance rather than garbage). The
`hexagrams.json` `wave_variant` guard already exists; the build stamps `glove` +
`generated` provenance there too.

### 6. UI — `OraclePanel.tsx` + `globals.css`

Panel shows: glyph + `N · Name — line L`; the **traditional** block (serif: Judgment +
active line text); the **our-reading** block (mono/amber: wave clause + badge + cloud);
then echoes. A `.oracle-trad` CSS class supplies the serif. The canvas watermark stays
glyph + timestamp (unchanged); the line + badge live in the panel.

## Data shapes

`hexagrams.json` (eager):
```json
{ "wave_variant": "sheliak-tw1", "glove": "glove-6B-300d", "generated": "2026-06-07",
  "hexagrams": [ { "n": 40, "glyph": "䷧", "name": "Deliverance",
    "judgment": "Deliverance. …", "lines": ["…","…","…","…","…","…"],
    "seedWords": ["deliverance","thunder","rain","release", "…"] } ] }
```
`events.bin` / `hexagrams_64.bin`: float32 centroid bins (existing format). `glove_q.bin`:
int8 (existing format).

## Testing

- **Pure (Vitest):** `activeHexagramAt` line extraction (index%6+1, wrap, zoom scale);
  `waveState` classification (synthetic novelty: trough → ingression, peak → habit;
  slope sign → trend); `composeReading` weaves line+wave+cloud; `wordCloud` weak-word
  filter; loader staleness guard (count mismatch → no echoes).
- **Pipeline (pytest):** Legge parse yields 64 hexagrams each with judgment + 6 lines
  (fallback empties allowed); centered events.bin row count == events.json length.
- **Live (Playwright):** panel shows serif traditional Judgment + active line and the
  mono gloss with a wave badge; line/reading change on pan, zoom, and hover; mobile +
  desktop; offline still works (precached data).

## File structure

```
scripts/build-events/build_events.py        # (modify) emit events.json only (drop events.bin)
scripts/build-oracle/build_oracle.py        # (modify) one pass → hexagrams.json + 3 bins (incl. centered events.bin)
scripts/build-oracle/hexagrams_source.json  # (modify, controller) Legge judgment + lines[6] + keywords
scripts/build-oracle/source_legge.py        # (new, controller) fetch+parse Legge → source json
src/chart/oracle/hexagram.ts                # (modify) ActiveHexagram.line
src/chart/oracle/wave.ts                     # (new) waveState + waveBadge
src/chart/oracle/reading.ts                  # (modify) Hexagram.lines/judgment, composeReading v2, cloud filter
src/state/loadOracle.ts                      # (modify) staleness guard helper
src/components/OraclePanel.tsx               # (modify) two-typeface layout + line + badge
src/app/globals.css                          # (modify) .oracle-trad serif
public/data/{hexagrams.json,hexagrams_64.bin,glove_q.bin,events.bin}  # regenerated
```

## Out of scope

- Free-text "ask the oracle"; moment-specific cloud blending; full per-line *keyword*
  clouds (line drives traditional text + positional sense + wave gloss, not a separate
  cloud). The hexagram-level cloud stays.
- Auto-running the data build in CI (output stays committed; rebuild is a manual,
  one-command step when events grow).

## Risks / mitigations

- **Legge line-text sourcing** → parse a single committed PD text; per-line empty
  fallback; verify all 64 have a judgment + 6 line slots.
- **Vector-space drift when events grow** → the oracle build regenerates all vectors
  together with one mean; the count-mismatch guard catches a stale `events.bin`.
- **`hexagrams.json` size** (now judgment + 6 lines × 64) → still ~150–250 KB text,
  eager-loadable; the heavy bins remain lazy.
