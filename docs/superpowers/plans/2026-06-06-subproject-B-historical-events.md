# Subproject B — Historical Events Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay recognizable, dated Wikidata historical events on the timewave (snapped to the chart's exact `t`, density-adaptive across zoom), and bake per-event GloVe centroid vectors for subproject C.

**Architecture:** An offline Python pipeline (`scripts/build-events/`) queries Wikidata, snaps each event to `t` via a parity-checked port of `time.ts`, builds a 300-dim GloVe centroid per event by reusing technolabe's `embeddings_7500.bin`, and writes committed `public/data/events.json` (+ `events.bin`). The app fetches `events.json` on mount (guarded by `wave_variant`) and renders it through a new `EventsLayer` created via a factory and appended to `LAYERS` — no `ChartCanvas` change.

**Tech Stack:** Python 3 (numpy, requests, pytest) for the pipeline; TypeScript / React 19 / Canvas 2D / Next 16 static export for rendering; Vitest for unit tests; Playwright for live verification.

**Spec:** `docs/superpowers/specs/2026-06-06-subproject-B-historical-events-design.md`

---

## File Structure

```
scripts/build-events/
  binary_format.py     # vendored from technolabe (read embeddings, write events bin)
  time_map.py          # dateToT port + parity-fixture writer
  build_events.py      # transforms + main: raw events → events.json + events.bin
  query_wikidata.py    # SPARQL fetch (network shell)
  test_time_map.py     # pytest: dateToT parity
  test_build_events.py # pytest: percentile, centroid, transform
  requirements.txt
  README.md
public/data/events.json          # committed pipeline output (browser loads this)
public/data/events.bin           # committed pipeline output (for C; not loaded in B)
src/chart/events.ts              # pure: types + selectVisibleEvents
src/chart/layers/EventsLayer.ts  # createEventsLayer(data) factory (canvas)
src/chart/layers/types.ts        # (unchanged; HitResult.kind already a string)
src/chart/__fixtures__/time-parity.json   # {iso,t} pairs, source of truth
src/chart/__tests__/time-parity.test.ts   # Vitest: dateToT matches fixture
src/chart/__tests__/events.test.ts        # Vitest: selectVisibleEvents
src/state/loadEvents.ts          # fetch + wave_variant guard (browser)
src/components/ChartIsland.tsx   # fetch events, build layers with createEventsLayer
```

---

## Task 1: Time-mapping parity fixture + TS test

This locks the `t` contract first, in the language the chart uses, so the Python port has a target.

**Files:**
- Create: `src/chart/__fixtures__/time-parity.json`
- Create: `src/chart/__tests__/time-parity.test.ts`

- [ ] **Step 1: Create the fixture**

Create `src/chart/__fixtures__/time-parity.json` (each `t` is days-before the zero instant `2012-12-21T12:00:00Z`; values are exact by construction):

```json
[
  { "iso": "2012-12-21T12:00:00.000Z", "t": 0 },
  { "iso": "2012-12-20T12:00:00.000Z", "t": 1 },
  { "iso": "2012-12-22T12:00:00.000Z", "t": -1 },
  { "iso": "2012-11-21T12:00:00.000Z", "t": 30 },
  { "iso": "2013-01-20T12:00:00.000Z", "t": -30 },
  { "iso": "2011-12-22T06:00:00.000Z", "t": 365.25 }
]
```

- [ ] **Step 2: Write the failing test**

Create `src/chart/__tests__/time-parity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dateToT } from '@/chart/time';
import fixture from '@/chart/__fixtures__/time-parity.json';

describe('time parity fixture', () => {
  it('dateToT matches every fixture pair (the Python port targets this same file)', () => {
    for (const { iso, t } of fixture as Array<{ iso: string; t: number }>) {
      expect(dateToT(new Date(iso))).toBeCloseTo(t, 9);
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx vitest run src/chart/__tests__/time-parity.test.ts`
Expected: PASS (6 assertions). `dateToT` already exists in `src/chart/time.ts`; this test certifies the fixture is correct so Python can rely on it. (If it fails, the fixture arithmetic is wrong — fix the JSON, not `time.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/chart/__fixtures__/time-parity.json src/chart/__tests__/time-parity.test.ts
git commit -m "test: time-mapping parity fixture (t contract for the events pipeline)"
```

---

## Task 2: Pipeline scaffold + vendored binary format + dateToT port

**Files:**
- Create: `scripts/build-events/requirements.txt`
- Create: `scripts/build-events/binary_format.py`
- Create: `scripts/build-events/time_map.py`
- Create: `scripts/build-events/test_time_map.py`

- [ ] **Step 1: Create requirements**

Create `scripts/build-events/requirements.txt`:

```
numpy>=1.26
requests>=2.31
pytest>=8.0
```

- [ ] **Step 2: Vendor the binary format helpers**

Create `scripts/build-events/binary_format.py` (copied from
`../technolabe/packages/semantic-data/scripts/common/binary_format.py`; we only
need to read embeddings and write the events bin in the same little-endian
`<II` + null-terminated-names + float32 layout the Rust engine reads):

```python
"""Binary (.bin) format helpers, vendored from technolabe semantic-data.
Layout: u32 count, u32 dim (little-endian); count null-terminated UTF-8 names;
then count*dim contiguous float32. The Rust WASM engine reads this directly."""
import struct
from pathlib import Path
from typing import List, Tuple
import numpy as np


def _write_cstring(buf: bytearray, s: str) -> None:
    buf.extend(s.encode("utf-8"))
    buf.append(0)


def _read_cstring(data: bytes, offset: int) -> Tuple[str, int]:
    end = data.index(b"\x00", offset)
    return data[offset:end].decode("utf-8"), end + 1


def read_embeddings_binary(path: Path) -> Tuple[List[str], np.ndarray]:
    """Read an embeddings .bin → (words, vectors[num_words, dim] float32)."""
    data = path.read_bytes()
    num_words, dim = struct.unpack_from("<II", data, 0)
    offset = 8
    words: List[str] = []
    for _ in range(num_words):
        word, offset = _read_cstring(data, offset)
        words.append(word)
    vectors = np.frombuffer(data, dtype=np.float32, count=num_words * dim, offset=offset)
    return words, vectors.reshape(num_words, dim)


def write_embeddings_binary(names: List[str], vectors: np.ndarray, output_path: Path) -> None:
    """Write an embeddings .bin (names = event ids). vectors must be float32 [n, dim]."""
    assert vectors.ndim == 2, "vectors must be 2D"
    assert len(names) == vectors.shape[0], "names count must match vectors rows"
    assert vectors.dtype == np.float32, "vectors must be float32"
    num, dim = vectors.shape
    buf = bytearray()
    buf.extend(struct.pack("<II", num, dim))
    for name in names:
        _write_cstring(buf, name)
    buf.extend(vectors.tobytes())
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(buf)
```

- [ ] **Step 3: Write the failing dateToT port test**

Create `scripts/build-events/test_time_map.py` (asserts against the **same**
committed fixture the TS test uses — cross-language parity):

```python
import json
from datetime import datetime, timezone
from pathlib import Path
from time_map import date_to_t

FIXTURE = Path(__file__).resolve().parents[2] / "src/chart/__fixtures__/time-parity.json"


def test_date_to_t_matches_fixture():
    pairs = json.loads(FIXTURE.read_text())
    for pair in pairs:
        d = datetime.fromisoformat(pair["iso"].replace("Z", "+00:00")).astimezone(timezone.utc)
        assert abs(date_to_t(d) - pair["t"]) < 1e-9, pair


def test_bce_year_handled():
    # Year 1 BCE = astronomical year 0; just assert it is a finite, large positive t.
    from time_map import year_to_date
    t = date_to_t(year_to_date(0))
    assert t > 700_000  # ~2012 years before zero, in days
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd scripts/build-events && python -m pytest test_time_map.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'time_map'`.

- [ ] **Step 5: Implement the dateToT port**

Create `scripts/build-events/time_map.py`:

```python
"""Port of src/chart/time.ts (dateToT / yearToDate). MUST stay parity-exact;
guarded by test_time_map.py against src/chart/__fixtures__/time-parity.json."""
from datetime import datetime, timezone

# ZERO_DATE = Date.UTC(2012, 11, 21, 12, 0, 0)  (month is 0-based in JS → December)
ZERO = datetime(2012, 12, 21, 12, 0, 0, tzinfo=timezone.utc)
DAY_MS = 86_400_000


def date_to_t(d: datetime) -> float:
    """Days from the zero date (positive = past). Mirrors dateToT in time.ts."""
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return (ZERO.timestamp() * 1000 - d.timestamp() * 1000) / DAY_MS


def year_to_date(year: int) -> datetime:
    """Mid-June of an arbitrary (incl. <=0) year, UTC. Mirrors yearToDate in time.ts."""
    return datetime(2000, 6, 15, tzinfo=timezone.utc).replace(year=year) \
        if year >= 1 else _astro_year(year)


def _astro_year(year: int) -> datetime:
    # Python datetime cannot hold year < 1; compute the day offset arithmetically.
    # Use a proleptic Gregorian day count via ordinal arithmetic relative to year 1.
    from datetime import timedelta
    base = datetime(1, 6, 15, tzinfo=timezone.utc)
    return base + timedelta(days=(year - 1) * 365.2425)
```

- [ ] **Step 6: Run it to verify it passes**

Run: `cd scripts/build-events && python -m pytest test_time_map.py -q`
Expected: PASS (2 tests). If `numpy`/`pytest` are missing, run
`pip install -r requirements.txt` first.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-events/requirements.txt scripts/build-events/binary_format.py scripts/build-events/time_map.py scripts/build-events/test_time_map.py
git commit -m "feat: events pipeline scaffold — vendored bin format + parity-tested dateToT port"
```

---

## Task 3: Event transforms (percentile score + GloVe centroid)

The pure, testable heart of the pipeline: turn raw event records + a word→vector
table into `events.json` rows and centroid vectors.

**Files:**
- Create: `scripts/build-events/build_events.py` (transforms only this task; `main()` added in Task 4)
- Create: `scripts/build-events/test_build_events.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/build-events/test_build_events.py`:

```python
import numpy as np
from build_events import percentile_scores, build_centroid, raw_to_event

EMB = {
    "atomic": np.array([1.0, 0.0, 0.0], dtype=np.float32),
    "bomb":   np.array([0.0, 1.0, 0.0], dtype=np.float32),
}


def test_percentile_scores_monotonic_0_to_1():
    s = percentile_scores([10, 20, 30, 40])
    assert s[0] == 0.0 and s[-1] == 1.0
    assert all(a <= b for a, b in zip(s, s[1:]))


def test_build_centroid_averages_and_normalizes_known_tokens():
    v = build_centroid("Atomic BOMB of fiction-word", EMB)
    assert v is not None
    assert abs(float(np.linalg.norm(v)) - 1.0) < 1e-6   # L2-normalized
    # average of the two known unit axes → equal components on x and y
    assert abs(v[0] - v[1]) < 1e-6 and v[2] == 0.0


def test_build_centroid_all_oov_returns_none():
    assert build_centroid("zzz qqq", EMB) is None


def test_raw_to_event_shape():
    raw = {"id": "Q1", "iso": "1945-08-06T12:00:00.000Z", "title": "Hiroshima",
           "summary": "First wartime nuclear use.", "url": "https://en.wikipedia.org/wiki/X"}
    ev = raw_to_event(raw, score=0.9)
    assert ev["id"] == "Q1" and ev["year"] == 1945 and ev["score"] == 0.9
    assert ev["t"] > 24_000 and ev["date"] == "1945-08-06"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd scripts/build-events && python -m pytest test_build_events.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'build_events'`.

- [ ] **Step 3: Implement the transforms**

Create `scripts/build-events/build_events.py`:

```python
"""Transforms + main for the historical-events pipeline.
Pure transforms are unit-tested; main() (Task 4) wires in I/O + Wikidata + GloVe."""
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict
import numpy as np
from time_map import date_to_t

WAVE_VARIANT = "sheliak-tw1"
GLOVE_SOURCE = "technolabe-embeddings-7500-glove6B-300d"
_TOKEN = re.compile(r"[a-z]+")


def percentile_scores(sitelinks: List[int]) -> List[float]:
    """Map each sitelink count to its percentile rank in [0,1] (min→0, max→1)."""
    n = len(sitelinks)
    if n <= 1:
        return [1.0] * n
    order = sorted(range(n), key=lambda i: sitelinks[i])
    out = [0.0] * n
    for rank, i in enumerate(order):
        out[i] = rank / (n - 1)
    return out


def build_centroid(text: str, embeddings: Dict[str, np.ndarray]) -> Optional[np.ndarray]:
    """Mean of in-vocab token vectors, L2-normalized. None if all tokens OOV."""
    vecs = [embeddings[tok] for tok in _TOKEN.findall(text.lower()) if tok in embeddings]
    if not vecs:
        return None
    mean = np.mean(np.stack(vecs), axis=0).astype(np.float32)
    norm = float(np.linalg.norm(mean))
    return mean if norm == 0 else (mean / norm).astype(np.float32)


def raw_to_event(raw: dict, score: float) -> dict:
    """Raw record {id, iso, title, summary, url} → events.json row."""
    d = datetime.fromisoformat(raw["iso"].replace("Z", "+00:00")).astimezone(timezone.utc)
    return {
        "id": raw["id"],
        "t": round(date_to_t(d), 4),
        "date": d.date().isoformat(),
        "year": d.year,
        "title": raw["title"],
        "summary": raw.get("summary", ""),
        "url": raw["url"],
        "score": round(score, 4),
    }
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd scripts/build-events && python -m pytest test_build_events.py -q`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-events/build_events.py scripts/build-events/test_build_events.py
git commit -m "feat: event transforms — percentile score + GloVe centroid builder"
```

---

## Task 4: Wikidata fetch + pipeline main, then run for real

**Files:**
- Create: `scripts/build-events/query_wikidata.py`
- Modify: `scripts/build-events/build_events.py` (append `main()`)
- Create: `scripts/build-events/README.md`
- Create (generated, committed): `public/data/events.json`, `public/data/events.bin`
- Modify: `public/data/README.md`

- [ ] **Step 1: Implement the Wikidata fetch**

Create `scripts/build-events/query_wikidata.py`:

```python
"""Fetch notable, dated events from the Wikidata Query Service.
Run offline; output is committed. WDQS requires a descriptive User-Agent."""
import sys
import requests

ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "timewave-zero-2 events pipeline (https://github.com/ebrinz/timewave-zero-2)",
    "Accept": "application/sparql-results+json",
}
SPARQL = """
SELECT ?event ?eventLabel ?date ?article ?sitelinks ?desc WHERE {
  ?event wdt:P585 ?date .
  ?event wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 40)
  ?article schema:about ?event ;
           schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?event schema:description ?desc . FILTER(LANG(?desc) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 1500
"""


def fetch_raw():
    """Return a list of raw event dicts: {id, iso, title, summary, url, sitelinks}."""
    resp = requests.get(ENDPOINT, params={"query": SPARQL}, headers=HEADERS, timeout=120)
    resp.raise_for_status()
    rows = resp.json()["results"]["bindings"]
    out, seen = [], set()
    for r in rows:
        qid = r["event"]["value"].rsplit("/", 1)[-1]
        if qid in seen:
            continue
        seen.add(qid)
        out.append({
            "id": qid,
            "iso": r["date"]["value"],                 # e.g. 1945-08-06T00:00:00Z
            "title": r.get("eventLabel", {}).get("value", qid),
            "summary": r.get("desc", {}).get("value", ""),
            "url": r["article"]["value"],
            "sitelinks": int(r["sitelinks"]["value"]),
        })
    return out


if __name__ == "__main__":
    data = fetch_raw()
    print(f"fetched {len(data)} events", file=sys.stderr)
    for e in data[:5]:
        print(e["sitelinks"], e["title"], e["iso"], file=sys.stderr)
```

- [ ] **Step 2: Append `main()` to build_events.py**

Add to the end of `scripts/build-events/build_events.py`:

```python
def main() -> None:
    import json
    from pathlib import Path
    from binary_format import read_embeddings_binary, write_embeddings_binary
    from query_wikidata import fetch_raw

    repo = Path(__file__).resolve().parents[2]
    emb_bin = Path("/Users/crashy/Development/technolabe/natal-chart-app/public/data/embeddings_7500.bin")
    words, vectors = read_embeddings_binary(emb_bin)
    embeddings = {w: vectors[i] for i, w in enumerate(words)}

    raw = fetch_raw()
    # skip pre-Gregorian-parse failures defensively; keep ISO dates Python can parse
    raw = [r for r in raw if r["iso"][0] != "-"]  # drop BCE for v1 (rare in top sitelinks)
    scores = percentile_scores([r["sitelinks"] for r in raw])
    events = [raw_to_event(r, s) for r, s in zip(raw, scores)]

    # centroids (parallel to events; keep only those with an in-vocab vector)
    ids, vecs = [], []
    for r, ev in zip(raw, events):
        c = build_centroid(f"{ev['title']} {ev['summary']}", embeddings)
        if c is not None:
            ids.append(ev["id"])
            vecs.append(c)

    out_dir = repo / "public" / "data"
    (out_dir / "events.json").write_text(json.dumps({
        "wave_variant": WAVE_VARIANT,
        "generated": datetime.now(timezone.utc).date().isoformat(),
        "glove": GLOVE_SOURCE,
        "events": events,
    }, ensure_ascii=False, indent=0))
    write_embeddings_binary(ids, np.stack(vecs).astype(np.float32), out_dir / "events.bin")
    print(f"wrote {len(events)} events, {len(ids)} vectors", file=__import__("sys").stderr)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Write the README**

Create `scripts/build-events/README.md`:

```markdown
# build-events — Subproject B pipeline

Offline pipeline: Wikidata → `public/data/events.json` (+ `events.bin`). Output is
committed; CI never runs this.

## Run
    pip install -r requirements.txt
    python build_events.py        # hits WDQS, reads technolabe embeddings_7500.bin

## Tests
    python -m pytest -q

## Inputs / provenance
- Events: Wikidata Query Service (CC0). We store short summaries + Wikipedia links
  (article text is CC BY-SA; we do not copy article bodies).
- Vectors: technolabe `embeddings_7500.bin` (GloVe 6B 300d, Apache 2.0). Path is set
  in `build_events.main()`. Tokens outside the 7500-word vocab are skipped.
- `t` mapping is parity-locked to `src/chart/time.ts` via
  `src/chart/__fixtures__/time-parity.json` (see `test_time_map.py`).
```

- [ ] **Step 4: Verify tests still pass, then run the pipeline for real**

Run: `cd scripts/build-events && python -m pytest -q`
Expected: PASS (all tests from Tasks 2–3).

Then run: `cd scripts/build-events && pip install -r requirements.txt && python build_events.py`
Expected (stderr): `fetched <~1500> events` then `wrote <N> events, <M> vectors`,
and `public/data/events.json` + `public/data/events.bin` now exist. Sanity check:
`python -c "import json;d=json.load(open('../../public/data/events.json'));print(d['wave_variant'], len(d['events']), d['events'][0]['title'])"`
Expected: `sheliak-tw1 <N> <some title>`.

- [ ] **Step 5: Update the data README and commit**

Replace `public/data/README.md` body with a note that B has shipped:

```markdown
# public/data — subproject B output (live)

- `events.json` — historical events for the timeline. Top-level `wave_variant`
  MUST equal the app's `WAVE_VARIANT` (`sheliak-tw1`). The app fetches
  `${NEXT_PUBLIC_BASE_PATH}/data/events.json` on mount; absent file → renders nothing.
- `events.bin` — per-event GloVe centroid vectors (engine bin format) for
  subproject C. Not fetched at runtime in B.

Regenerate with `scripts/build-events/` (see its README). See `src/chart/EXTENSION-POINTS.md`.
```

```bash
git add scripts/build-events/query_wikidata.py scripts/build-events/build_events.py scripts/build-events/README.md public/data/events.json public/data/events.bin public/data/README.md
git commit -m "feat: generate committed events.json + events.bin from Wikidata"
```

---

## Task 5: `selectVisibleEvents` (pure, zoom-adaptive density)

**Files:**
- Create: `src/chart/events.ts`
- Create: `src/chart/__tests__/events.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/__tests__/events.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectVisibleEvents, type TimelineEvent } from '@/chart/events';
import type { Viewport, Dims } from '@/chart/viewport';

const ev = (id: string, t: number, score: number): TimelineEvent =>
  ({ id, t, date: '2000-01-01', year: 2000, title: id, summary: '', url: '', score });

const view: Viewport = { tLeft: 100, tRight: 0 };   // visible t in [0,100]
const dims: Dims = { w: 1000, h: 400 };             // 1px ≈ 0.1 t

describe('selectVisibleEvents', () => {
  it('drops events outside the visible t range', () => {
    const out = selectVisibleEvents([ev('in', 50, 1), ev('out', 250, 1)], view, dims, 10);
    expect(out.map((e) => e.id)).toEqual(['in']);
  });

  it('caps at maxLabels, keeping the highest-score events', () => {
    const evs = [ev('a', 10, 0.2), ev('b', 50, 0.9), ev('c', 90, 0.5)];
    const out = selectVisibleEvents(evs, view, dims, 2);
    expect(out.map((e) => e.id).sort()).toEqual(['b', 'c']); // top-2 by score
  });

  it('suppresses lower-score events that collide in x with a kept one', () => {
    // t=50 and t=50.5 are ~5px apart (< 70px gap) → only the higher score survives
    const out = selectVisibleEvents([ev('hi', 50, 0.9), ev('lo', 50.5, 0.1)], view, dims, 10);
    expect(out.map((e) => e.id)).toEqual(['hi']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chart/__tests__/events.test.ts`
Expected: FAIL — cannot resolve `@/chart/events`.

- [ ] **Step 3: Implement**

Create `src/chart/events.ts`:

```ts
import { tToX, type Viewport, type Dims } from '@/chart/viewport';

/** A historical event snapped to the timewave (see scripts/build-events). */
export interface TimelineEvent {
  id: string; t: number; date: string; year: number;
  title: string; summary: string; url: string; score: number;
}

/** Shape of public/data/events.json. */
export interface EventsData {
  wave_variant: string; generated: string; glove: string; events: TimelineEvent[];
}

/** Min horizontal gap (px) between two kept event ticks, so labels don't pile up. */
const MIN_LABEL_GAP_PX = 70;

/**
 * Choose which events to draw: those inside the visible span, highest-score first,
 * capped at `maxLabels`, with lower-score events suppressed when they'd collide in
 * x with one already kept. Pure — drives the zoom-adaptive density.
 */
export function selectVisibleEvents(
  events: TimelineEvent[], view: Viewport, dims: Dims, maxLabels: number,
): TimelineEvent[] {
  const inView = events.filter((e) => e.t <= view.tLeft && e.t >= view.tRight);
  const byScore = [...inView].sort((a, b) => b.score - a.score);
  const kept: TimelineEvent[] = [];
  const xs: number[] = [];
  for (const e of byScore) {
    if (kept.length >= maxLabels) break;
    const x = tToX(e.t, view, dims.w);
    if (xs.every((xx) => Math.abs(xx - x) >= MIN_LABEL_GAP_PX)) { kept.push(e); xs.push(x); }
  }
  return kept;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chart/__tests__/events.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/events.ts src/chart/__tests__/events.test.ts
git commit -m "feat: selectVisibleEvents — pure zoom-adaptive event density"
```

---

## Task 6: `EventsLayer` factory

**Files:**
- Create: `src/chart/layers/EventsLayer.ts`
- Create: `src/chart/layers/__tests__/EventsLayer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/layers/__tests__/EventsLayer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createEventsLayer } from '@/chart/layers/EventsLayer';
import type { EventsData } from '@/chart/events';
import type { Viewport, Dims } from '@/chart/viewport';

const data: EventsData = {
  wave_variant: 'sheliak-tw1', generated: '2026-06-06', glove: 'x',
  events: [{ id: 'Q1', t: 50, date: '2000-01-01', year: 2000, title: 'Test Event', summary: '', url: '', score: 1 }],
};
const view: Viewport = { tLeft: 100, tRight: 0 };
const dims: Dims = { w: 1000, h: 400 };

describe('createEventsLayer', () => {
  it('is invisible with null data and visible with events', () => {
    expect(createEventsLayer(null).visible(view)).toBe(false);
    expect(createEventsLayer(data).visible(view)).toBe(true);
  });

  it('hitTest returns the event under the cursor x', () => {
    const layer = createEventsLayer(data);
    const x = (1 - 50 / 100) * 1000; // tToX(50) = 500
    const hit = layer.hitTest!(x, 0, view, dims);
    expect(hit?.kind).toBe('event');
    expect(hit?.label).toContain('Test Event');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chart/layers/__tests__/EventsLayer.test.ts`
Expected: FAIL — cannot resolve `@/chart/layers/EventsLayer`.

- [ ] **Step 3: Implement**

Create `src/chart/layers/EventsLayer.ts`:

```ts
import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { selectVisibleEvents, type EventsData } from '@/chart/events';

const EVENT_COLOR = '#ff8800';        // --wb-orange (canvas needs a literal, not a CSS var)
const LABEL_Y = 26;                   // below the hand-coded MARKERS label row (y=14)

/**
 * Renders historical events as dashed amber ticks + truncated labels, density
 * managed by selectVisibleEvents. A factory so the loader can rebuild the layer
 * with freshly-fetched data (new object → ChartCanvas redraws). Null data → inert.
 */
export function createEventsLayer(data: EventsData | null): OverlayLayer {
  return {
    id: 'events',
    visible: () => !!data && data.events.length > 0,
    draw(ctx, view, dims) {
      if (!data) return;
      const maxLabels = Math.max(3, Math.floor(dims.w / 90));
      ctx.font = '11px "VT323", ui-monospace, monospace';
      ctx.fillStyle = EVENT_COLOR;
      ctx.strokeStyle = EVENT_COLOR;
      for (const e of selectVisibleEvents(data.events, view, dims, maxLabels)) {
        const x = tToX(e.t, view, dims.w);
        if (x < -50 || x > dims.w + 50) continue;
        ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(x, LABEL_Y + 4); ctx.lineTo(x, dims.h); ctx.stroke();
        ctx.setLineDash([]);
        const label = e.title.length > 22 ? `${e.title.slice(0, 21)}…` : e.title;
        ctx.fillText(label, x + 3, LABEL_Y);
      }
    },
    hitTest(x, _y, view, dims): HitResult | null {
      if (!data) return null;
      for (const e of data.events) {
        if (Math.abs(tToX(e.t, view, dims.w) - x) < 4) {
          return { kind: 'event', t: e.t, label: `${e.title} · ${e.date}` };
        }
      }
      return null;
    },
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chart/layers/__tests__/EventsLayer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/layers/EventsLayer.ts src/chart/layers/__tests__/EventsLayer.test.ts
git commit -m "feat: EventsLayer — dashed amber event ticks + labels + hitTest"
```

---

## Task 7: Loader + wire into the chart

**Files:**
- Create: `src/state/loadEvents.ts`
- Modify: `src/components/ChartIsland.tsx`

- [ ] **Step 1: Write the loader**

Create `src/state/loadEvents.ts`:

```ts
import { WAVE_VARIANT } from '@/chart/timewave';
import type { EventsData } from '@/chart/events';

/**
 * Fetch public/data/events.json (raw fetch is NOT auto-prefixed under basePath, so
 * include the env prefix). Returns null on 404 (expected before the pipeline runs)
 * or on a wave_variant mismatch (logged) — a null-data layer draws nothing.
 */
export async function loadEvents(): Promise<EventsData | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const res = await fetch(`${base}/data/events.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as EventsData;
    if (json.wave_variant !== WAVE_VARIANT) {
      console.error(`events.json wave_variant "${json.wave_variant}" != "${WAVE_VARIANT}"; ignoring`);
      return null;
    }
    return json;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wire it into ChartIsland**

Replace the entire contents of `src/components/ChartIsland.tsx`:

```tsx
'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartShell } from '@/components/ChartShell';
import { GridLayer } from '@/chart/layers/GridLayer';
import { WaveLayer } from '@/chart/layers/WaveLayer';
import { MarkersLayer } from '@/chart/layers/MarkersLayer';
import { createEventsLayer } from '@/chart/layers/EventsLayer';
import { loadEvents } from '@/state/loadEvents';
import type { EventsData } from '@/chart/events';

export function ChartIsland() {
  // Historical events load post-mount; until then the events layer is inert.
  const [events, setEvents] = useState<EventsData | null>(null);
  useEffect(() => { loadEvents().then(setEvents); }, []);

  // Rebuilding the array when events arrive gives ChartCanvas a new `layers`
  // reference, so it repaints with the loaded events (later layer = on top).
  const layers = useMemo(
    () => [GridLayer, WaveLayer, MarkersLayer, createEventsLayer(events)],
    [events],
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

- [ ] **Step 3: Typecheck, lint, and run the full unit suite**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: no type/lint errors; all tests pass (including the new events,
EventsLayer, and time-parity suites).

- [ ] **Step 4: Commit**

```bash
git add src/state/loadEvents.ts src/components/ChartIsland.tsx
git commit -m "feat: load events.json and render the EventsLayer on the chart"
```

---

## Task 8: Full verification (build + live)

**Files:** none (verification only).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: successful static export to `out/`; `out/data/events.json` and
`out/data/events.bin` are present (copied from `public/`). Confirm:
`test -f out/data/events.json && echo OK`.

- [ ] **Step 2: Live verification at desktop + mobile**

Start `npm run dev` and drive with Playwright (the project's `run`/`verify` skills
or the Playwright MCP). Confirm:
  - At a wide view (e.g. the default ~130y span) amber dashed event ticks with
    labels (e.g. recognizable 20th-century events) appear, distinct from the
    pre-existing amber `MARKERS` (Trinity/Apollo/Zero Point).
  - Zooming **in** reveals **more** events; zooming **out** shows **fewer** (no
    label pile-up) — the zoom-adaptive density.
  - The hand-coded markers, grid, and wave still render; pan/zoom/pinch from the
    mobile work still function.
  - Verified at 375×667 (mobile) and 1200×800 (desktop) with no layout regression.

- [ ] **Step 3: Confirm graceful absence**

Temporarily rename the file and reload to confirm no crash / clean console:
`mv public/data/events.json /tmp/ev.json` → reload dev → chart renders without
events, no uncaught errors → `mv /tmp/ev.json public/data/events.json`.

- [ ] **Step 4: Final report**

No commit needed unless Steps 1–3 surfaced a fix. Report event count rendered and
any follow-ups (e.g. notability tuning) for subproject C.

---

## Self-Review Notes

- **Spec coverage:** offline Python pipeline + committed JSON (Tasks 2–4); Wikidata
  SPARQL source (Task 4); `dateToT` parity both languages (Tasks 1–2); event
  centroid `events.bin` in engine format (Tasks 2–4); zoom-adaptive top-N density
  (Task 5); `EventsLayer` draw + hitTest (Task 6); loader with `wave_variant` guard
  + basePath + null-graceful + `LAYERS` wiring (Task 7); tests pure/pipeline/live
  (Tasks 1,3,5,6,8). Deferred-to-C items (hexagrams, wasm reuse, word cloud,
  quantization, tap-to-detail UI) are out of scope per the spec.
- **Type consistency:** `TimelineEvent` / `EventsData` defined in `src/chart/events.ts`
  (Task 5) and consumed unchanged in `EventsLayer` (6), `loadEvents` (7), ChartIsland
  (7). `createEventsLayer(data: EventsData | null)` signature matches all call sites.
  Python `raw_to_event` keys (`id,t,date,year,title,summary,url,score`) match the TS
  `TimelineEvent` fields exactly. `events.bin` written by `write_embeddings_binary`
  (Task 2) in the same `<II` layout C's engine reads.
- **No placeholders:** every code/command step is concrete; the only runtime-variable
  values are the live Wikidata count `N`/`M` (Task 4) and rendered specifics (Task 8).
```
