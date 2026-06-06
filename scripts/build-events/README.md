# build-events — Subproject B pipeline

Offline pipeline: Wikidata → `public/data/events.json` (+ `events.bin`). Output is
committed; CI never runs this.

## Run
    pip install -r requirements.txt
    # GLOVE_BIN points at technolabe's embeddings_7500.bin; it defaults to the
    # author's local copy, so override it for your machine:
    GLOVE_BIN=/path/to/embeddings_7500.bin python build_events.py   # hits WDQS

## Tests
    python -m pytest -q

## Inputs / provenance
- Events: Wikidata Query Service (CC0). We store short summaries + Wikipedia links
  (article text is CC BY-SA; we do not copy article bodies).
- Vectors: technolabe `embeddings_7500.bin` (GloVe 6B 300d, Apache 2.0). Path comes
  from the `GLOVE_BIN` env var (default in `build_events.main()`); the run aborts with
  a clear message if it's missing. Tokens outside the 7500-word vocab are skipped.
- `t` mapping is parity-locked to `src/chart/time.ts` via
  `src/chart/__fixtures__/time-parity.json` (see `test_time_map.py`).
