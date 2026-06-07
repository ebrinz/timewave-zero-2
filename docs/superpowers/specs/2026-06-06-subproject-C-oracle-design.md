# Subproject C — The Timewave Oracle — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorming)

## Goal

Turn the forward (and any) stretch of the timewave into an **oracle**: for the
hexagram governing the visible center, show its I Ching judgment, a **word cloud**
of semantically-resonant terms, and the **past events that most resonate** with it
— updating live as you pan and dive through fractal levels. Optimised for a
**fast-loading PWA**: instant reading from a tiny JSON, heavier vectors lazy-loaded.

Builds directly on Subproject B (which shipped `events.bin` — event GloVe centroids
in the shared 300-dim space) and honors `src/chart/EXTENSION-POINTS.md`.

## Key decisions (from brainstorming)

- **No wasm.** All vector math is **plain TypeScript** cosine. The workload
  (cosine over ~10k×300 int8 vectors) is ~2 ms; a wasm would add bytes, an
  instantiation step, and webpack/SW complexity for no real-world speed gain.
- **Vectors rebuilt, trimmed, int8-quantized (~2 MB).** A one-time offline build
  (raw GloVe 6B 300d, never shipped) produces a ~10k-word vocab covering I Ching
  imagery ∪ event tokens ∪ common English, L2-normalized then int8 (×127). 4×
  smaller than B's 8.6 MB float32 bin and with the right vocabulary.
- **I Ching text = Legge (1899), public domain** (Wilhelm/Baynes is still
  copyrighted).
- **Always-on, progressively-enhanced oracle panel.** Hexagram + judgment appear
  instantly from a tiny eager JSON; word cloud + echoes fill in when the vector
  bins lazy-load.
- **PWA (manifest + service worker) is deferred to Subproject D** — it benefits the
  whole app and is cleanest once C has added the final data bins.

## Active-hexagram mapping (wave → I Ching)

The 384-cell Sheliak set = 64 hexagrams × 6 yao. For the viewport:

```
center t = (tLeft + tRight) / 2
x        = |center|                          // days from the zero point
span     = tLeft - tRight                    // visible width in days
s        = max(0, round(log64(384 / span)))  // fractal scale from the zoom octave
index    = floor(x * 64^s) mod 384
ordinal  = floor(index / 6)                  // 0..63, position in King Wen order
kingWen  = ordinal + 1                       // hexagram number 1..64
code     = KING_WEN_REFERENCE[ordinal]       // 6-bit line pattern (already exported)
glyph    = String.fromCodePoint(0x4DC0 + ordinal)   // ䷀..䷿ (Unicode hexagram block)
```

So **panning re-reads the governing hexagram; each 64× dive raises `s` by one** and
reveals a finer hexagram — the "per fractal level" behaviour. The reading governs
the visible center wherever you are; on the empty forward side this *is* the only
annotation, giving the future its oracular character (the past also carries B's
real-event ticks).

This logic lives in a pure function `activeHexagram(view): { ordinal, kingWen,
glyph }` in `src/chart/oracle/hexagram.ts` — unit-tested against known (x, span)
inputs. `log64(n) = Math.log(n) / Math.log(64)`.

## Data artifacts (built offline, committed under `public/data/`)

- **`hexagrams.json`** (~tens of KB, **eager** — gives the instant reading):
  64 entries `{ n, glyph, name, judgment, image, seedWords }` where `judgment`/
  `image` are the Legge "T'uan"/"Hsiang" texts and `seedWords` are the lowercased,
  de-duped imagery tokens used to build the centroid. Carries `wave_variant`.
- **`glove_q.bin`** (~2 MB, **lazy** — powers the word cloud): int8 quantized
  embeddings. Layout `<II` count,dim + null-terminated words + `count*dim` int8.
  Build: take each word's GloVe vector, L2-normalize, store `round(clamp(u*127,
  -127, 127))`. Runtime dequant: `q / 127`.
- **`hexagrams_64.bin`** (~77 KB float32): one centroid per hexagram = L2-normalized
  mean of its `seedWords`' GloVe vectors. Same bin format as B's `events.bin`.
- **`events.bin`** (already shipped by B, reused as-is): event centroids in the
  same GloVe space → directly comparable for resonance. (No re-run of B needed.)

Vocab selection for `glove_q.bin`: union of (a) all `seedWords` across the 64
hexagrams, (b) tokens from `events.json` titles/summaries, (c) the top-N most
frequent English words from GloVe — capped near ~10k.

## Build pipeline (`scripts/build-oracle/`, Python)

Reuses B's `binary_format.py`, `vector_utils`, and the `GLOVE_BIN`/raw-GloVe
convention. Steps:

1. `hexagrams_source.json` (committed) holds the 64 Legge entries (name, judgment,
   image) + curated `seedWords`, sourced from a public-domain Legge I Ching text.
2. `build_oracle.py` reads raw GloVe (`GLOVE_TXT` env; one-time 2.2 GB local
   download, never shipped), builds `hexagrams_64.bin` centroids from `seedWords`,
   assembles the ~10k vocab, writes the int8 `glove_q.bin`, and emits
   `hexagrams.json` (with glyphs + `wave_variant`).
3. Output committed; CI never runs it.

Pure transforms (`int8 quantize`, `seed-word centroid`, vocab assembly) are
pytest-unit-tested on tiny fixtures; the raw-GloVe read is a thin shell.

## Reading engine (`src/chart/oracle/`, pure TS — no React/DOM)

- `quant.ts` — `readQuantizedBin(buf)` (int8 → words + Float32Array, dequant
  `/127`) and `cosineTopK(query, matrix, words, k)`.
- `reading.ts` — given an `ordinal` plus the loaded vectors:
  - `wordCloud(hexVec, glove, k)` → top-k resonant words.
  - `resonantEvents(hexVec, events, k)` → top-k past events by cosine.
  - `composeReading(hexagram, cloudWords)` → a templated line weaving the Legge
    judgment with a couple of cloud words.
  Returns a `Reading { kingWen, glyph, name, judgment, cloud, echoes }`.

All inputs are plain arrays/typed-arrays; everything is deterministic and unit
testable. Resonance/word-cloud degrade gracefully to "judgment only" until the
lazy bins arrive.

## Loader & UI

- `src/state/loadOracle.ts` — eager-fetch `hexagrams.json` (wave_variant guarded,
  null-graceful, basePath-prefixed); lazy-fetch `glove_q.bin` + `events.bin` on
  first need (and idle-prefetch), parsed once and memoized.
- `src/components/OraclePanel.tsx` — a Workbench panel (stacks below on mobile,
  sits beside the dock on desktop, matching the existing responsive layout). Reads
  the active hexagram from the chart view; renders **glyph + number + name +
  judgment instantly**, then the **word cloud + resonant echoes** once vectors
  load. Echo rows reuse the event link/date.
- Optional `src/chart/layers/OracleLayer.ts` — faint marker of the active
  hexagram's governing span on the canvas (an `OverlayLayer`; pure draw).

The panel subscribes to the same `view` the chart uses, so it updates on every
pan/zoom with no extra plumbing.

## Testing

- **Pure (Vitest):** `activeHexagram` (known x/span → known ordinal/kingWen,
  including the `s` octave boundaries and the `mod 384` wrap); `readQuantizedBin`
  round-trip + dequant error bound; `cosineTopK` ordering; `composeReading`
  templating.
- **Pipeline (pytest):** int8 quantize/dequant round-trip within tolerance;
  seed-word centroid; vocab assembly de-dup/cap.
- **Live (Playwright):** judgment shows instantly; word cloud + echoes appear after
  lazy load; reading changes when panning and when diving 64×; mobile + desktop
  layout intact; graceful when bins are absent.

## File structure

```
scripts/build-oracle/
  hexagrams_source.json     # 64 Legge entries + seedWords (committed)
  build_oracle.py           # → hexagrams.json, hexagrams_64.bin, glove_q.bin
  test_build_oracle.py
  README.md
public/data/hexagrams.json          # committed (eager)
public/data/hexagrams_64.bin        # committed
public/data/glove_q.bin             # committed (~2MB, lazy)
src/chart/oracle/hexagram.ts        # activeHexagram (pure)
src/chart/oracle/quant.ts           # int8 read + cosineTopK
src/chart/oracle/reading.ts         # wordCloud, resonantEvents, composeReading
src/chart/oracle/__tests__/*.test.ts
src/state/loadOracle.ts             # eager json + lazy bins
src/components/OraclePanel.tsx      # always-on progressive panel
src/chart/layers/OracleLayer.ts     # (optional) active-span marker
```

## Out of scope

- PWA manifest + service worker + offline caching → **Subproject D**.
- Free-text "ask the oracle" (would need a runtime embedding model) — not in C.
- Re-running B's Wikidata pipeline (events.bin reused as-is).
- Wilhelm/Baynes text (copyright); only Legge 1899 is used.

## Risks / mitigations

- **Legge text sourcing/parsing** → use a single committed `hexagrams_source.json`;
  the build only reads it, so parsing happens once during authoring, not per build.
- **int8 precision** → vectors are L2-normalized before quantizing, bounding
  components to [-1,1]; ×127 keeps cosine error well under what a word cloud needs.
- **Vocab coverage** → seed words + event tokens are force-included so hexagram
  centroids and clouds are never starved.
- **Payload** → only `hexagrams.json` is eager; the 2 MB bin never blocks paint.
