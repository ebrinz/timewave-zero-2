# Subproject C — Timewave Oracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An always-on "oracle" panel that, for the hexagram governing the visible chart center, shows its Legge I Ching judgment instantly plus a GloVe word cloud and the most resonant past events — updating live as you pan and dive fractal levels.

**Architecture:** A pure-TS reading engine (`src/chart/oracle/`) maps the viewport to an active hexagram, then does plain cosine over baked vectors (no wasm): an int8-quantized ~2 MB `glove_q.bin` (word cloud) and B's `events.bin` (resonance). A tiny eager `hexagrams.json` gives the instant judgment; the vector bins lazy-load. An offline Python build produces the data from raw GloVe + a committed Legge source.

**Tech Stack:** TypeScript / React 19 / Next 16 static export / Canvas; Vitest; Python 3 (numpy) for the build; Playwright for live checks.

**Spec:** `docs/superpowers/specs/2026-06-06-subproject-C-oracle-design.md`

**Deferred (not this plan):** PWA (Subproject D); `OracleLayer` on-canvas marker; free-text "ask the oracle".

---

## File Structure

```
src/chart/oracle/hexagram.ts            # activeHexagram(view) — pure mapping
src/chart/oracle/quant.ts               # readQuantizedBin/readFloatBin/sliceVector/cosineTopK
src/chart/oracle/reading.ts             # types + wordCloud/resonantEvents/composeReading
src/chart/oracle/__tests__/*.test.ts
src/state/loadOracle.ts                 # eager hexagrams.json + lazy glove_q.bin/events.bin
src/components/OraclePanel.tsx          # always-on progressive panel
src/components/ChartShell.tsx           # (modify) add OraclePanel strip
scripts/build-oracle/build_oracle.py    # transforms + main
scripts/build-oracle/test_build_oracle.py
scripts/build-oracle/hexagrams_source.json  # 64 Legge entries (controller-sourced)
scripts/build-oracle/README.md
public/data/hexagrams.json              # committed (eager)
public/data/hexagrams_64.bin            # committed (float32 centroids)
public/data/glove_q.bin                 # committed (~2MB int8)
```

Reuses from B: `scripts/build-events/binary_format.py` (imported by the oracle build), `public/data/events.bin`, `src/chart/events.ts` (`TimelineEvent`), `src/state/loadEvents.ts`.

---

## Task 1: `activeHexagram` mapping (pure)

**Files:**
- Create: `src/chart/oracle/hexagram.ts`
- Create: `src/chart/oracle/__tests__/hexagram.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/oracle/__tests__/hexagram.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { activeHexagram } from '@/chart/oracle/hexagram';
import type { Viewport } from '@/chart/viewport';

const v = (tLeft: number, tRight: number): Viewport => ({ tLeft, tRight });

describe('activeHexagram', () => {
  it('center 0 → hexagram 1 (ordinal 0, glyph ䷀)', () => {
    const h = activeHexagram(v(200, -200));
    expect(h).toEqual({ ordinal: 0, kingWen: 1, glyph: '䷀' });
  });

  it('wide span uses scale 0: index = floor(x) mod 384', () => {
    // center 205, span 390 → s=0, index 205, ordinal 34, kingWen 35
    const h = activeHexagram(v(400, 10));
    expect(h.ordinal).toBe(34);
    expect(h.kingWen).toBe(35);
  });

  it('mod-384 wrap at scale 0', () => {
    // center 4000, span 390 → index 4000 mod 384 = 160, ordinal 26, kingWen 27
    const h = activeHexagram(v(4195, 3805));
    expect(h.kingWen).toBe(27);
  });

  it('diving raises the scale: span 6 → s=1', () => {
    // center 10, span 6 → s=1, index floor(10*64) mod 384 = 256, ordinal 42, kingWen 43
    const h = activeHexagram(v(13, 7));
    expect(h.kingWen).toBe(43);
  });

  it('glyph is in the Unicode hexagram block', () => {
    expect(activeHexagram(v(400, 10)).glyph.codePointAt(0)).toBe(0x4dc0 + 34);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chart/oracle/__tests__/hexagram.test.ts`
Expected: FAIL — cannot resolve `@/chart/oracle/hexagram`.

- [ ] **Step 3: Implement**

Create `src/chart/oracle/hexagram.ts`:

```ts
import type { Viewport } from '@/chart/viewport';

/** The hexagram governing a viewport: its King Wen ordinal (0..63), number (1..64),
 *  and Unicode glyph (䷀..䷿). */
export interface ActiveHexagram { ordinal: number; kingWen: number; glyph: string; }

const log64 = (n: number): number => Math.log(n) / Math.log(64);

/**
 * Read the active hexagram from the data set (384 cells = 64 hexagrams × 6 yao) at
 * the viewport center, at a fractal scale set by the zoom octave: a wider view shows
 * roughly one full 64-hexagram cycle; each 64× dive advances the scale by one.
 */
export function activeHexagram(view: Viewport): ActiveHexagram {
  const span = view.tLeft - view.tRight;
  const x = Math.abs((view.tLeft + view.tRight) / 2);
  const s = Math.max(0, Math.round(log64(384 / span)));
  const index = ((Math.floor(x * 64 ** s) % 384) + 384) % 384;
  const ordinal = Math.floor(index / 6);
  return { ordinal, kingWen: ordinal + 1, glyph: String.fromCodePoint(0x4dc0 + ordinal) };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chart/oracle/__tests__/hexagram.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/oracle/hexagram.ts src/chart/oracle/__tests__/hexagram.test.ts
git commit -m "feat: activeHexagram — viewport → governing I Ching hexagram"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 2: Vector bin readers + cosine (pure)

**Files:**
- Create: `src/chart/oracle/quant.ts`
- Create: `src/chart/oracle/__tests__/quant.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/oracle/__tests__/quant.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readQuantizedBin, readFloatBin, sliceVector, cosineTopK } from '@/chart/oracle/quant';

// Build a tiny bin in the shared format: <II> count,dim ; null-term names ; data.
function buildBin(words: string[], rows: number[][], dtype: 'i8' | 'f32'): ArrayBuffer {
  const dim = rows[0].length;
  const enc = new TextEncoder();
  const nameBytes = words.map((w) => enc.encode(w));
  const nameLen = nameBytes.reduce((n, b) => n + b.length + 1, 0);
  const dataLen = dtype === 'i8' ? words.length * dim : words.length * dim * 4;
  const buf = new ArrayBuffer(8 + nameLen + dataLen);
  const dv = new DataView(buf);
  dv.setUint32(0, words.length, true);
  dv.setUint32(4, dim, true);
  let o = 8;
  for (const b of nameBytes) { new Uint8Array(buf, o, b.length).set(b); o += b.length; dv.setUint8(o, 0); o += 1; }
  for (const r of rows) for (const x of r) {
    if (dtype === 'i8') { dv.setInt8(o, x); o += 1; } else { dv.setFloat32(o, x, true); o += 4; }
  }
  return buf;
}

describe('quant', () => {
  it('readQuantizedBin dequantizes int8 by /127', () => {
    const set = readQuantizedBin(buildBin(['a', 'b'], [[127, 0], [0, -127]], 'i8'));
    expect(set.words).toEqual(['a', 'b']);
    expect(set.dim).toBe(2);
    expect(Array.from(sliceVector(set, 0))).toEqual([1, 0]);
    expect(Array.from(sliceVector(set, 1))).toEqual([0, -1]);
  });

  it('readFloatBin reads float32 rows', () => {
    const set = readFloatBin(buildBin(['x'], [[0.5, -0.5]], 'f32'));
    expect(Array.from(sliceVector(set, 0))).toEqual([0.5, -0.5]);
  });

  it('cosineTopK ranks by cosine and respects k', () => {
    const set = readFloatBin(buildBin(['x', 'y', 'z'], [[1, 0], [0.7, 0.7], [0, 1]], 'f32'));
    const top = cosineTopK(Float32Array.from([1, 0]), set, 2);
    expect(top.map((t) => t.word)).toEqual(['x', 'y']);
    expect(top[0].score).toBeGreaterThan(top[1].score);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chart/oracle/__tests__/quant.test.ts`
Expected: FAIL — cannot resolve `@/chart/oracle/quant`.

- [ ] **Step 3: Implement**

Create `src/chart/oracle/quant.ts`:

```ts
/** A parsed vector table: dequantized rows, one per word, length words.length*dim. */
export interface VectorSet { words: string[]; dim: number; vectors: Float32Array; }

function header(buf: ArrayBuffer): { count: number; dim: number; dv: DataView } {
  const dv = new DataView(buf);
  return { count: dv.getUint32(0, true), dim: dv.getUint32(4, true), dv };
}

function readNames(dv: DataView, count: number, start: number): { words: string[]; offset: number } {
  const dec = new TextDecoder();
  const words: string[] = [];
  let o = start;
  for (let i = 0; i < count; i++) {
    let end = o;
    while (dv.getUint8(end) !== 0) end++;
    words.push(dec.decode(new Uint8Array(dv.buffer, o, end - o)));
    o = end + 1;
  }
  return { words, offset: o };
}

/** Read an int8 bin and dequantize to float32 (q / 127). */
export function readQuantizedBin(buf: ArrayBuffer): VectorSet {
  const { count, dim, dv } = header(buf);
  const { words, offset } = readNames(dv, count, 8);
  const vectors = new Float32Array(count * dim);
  for (let i = 0; i < vectors.length; i++) vectors[i] = dv.getInt8(offset + i) / 127;
  return { words, dim, vectors };
}

/** Read a float32 bin (events.bin / hexagrams_64.bin format). */
export function readFloatBin(buf: ArrayBuffer): VectorSet {
  const { count, dim, dv } = header(buf);
  const { words, offset } = readNames(dv, count, 8);
  const vectors = new Float32Array(count * dim);
  for (let i = 0; i < vectors.length; i++) vectors[i] = dv.getFloat32(offset + i * 4, true);
  return { words, dim, vectors };
}

/** A view onto row i of a VectorSet (no copy). */
export function sliceVector(set: VectorSet, i: number): Float32Array {
  return set.vectors.subarray(i * set.dim, (i + 1) * set.dim);
}

const dot = (a: Float32Array, b: Float32Array, off: number): number => {
  let s = 0;
  for (let j = 0; j < a.length; j++) s += a[j] * b[off + j];
  return s;
};
const norm = (a: Float32Array): number => Math.sqrt(dot(a, a, 0)) || 1;

/** Top-k entries of `set` by cosine similarity to `query`. */
export function cosineTopK(query: Float32Array, set: VectorSet, k: number): { word: string; score: number }[] {
  const qn = norm(query);
  const out: { word: string; score: number }[] = [];
  for (let i = 0; i < set.words.length; i++) {
    const row = sliceVector(set, i);
    out.push({ word: set.words[i], score: dot(query, row, 0) / (qn * norm(row)) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, k);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chart/oracle/__tests__/quant.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/oracle/quant.ts src/chart/oracle/__tests__/quant.test.ts
git commit -m "feat: oracle vector readers (int8/float) + cosineTopK"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 3: Reading engine (pure)

**Files:**
- Create: `src/chart/oracle/reading.ts`
- Create: `src/chart/oracle/__tests__/reading.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/oracle/__tests__/reading.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { wordCloud, resonantEvents, composeReading, type Hexagram } from '@/chart/oracle/reading';
import { readFloatBin, sliceVector, type VectorSet } from '@/chart/oracle/quant';

function bin(words: string[], rows: number[][]): VectorSet {
  const dim = rows[0].length;
  const enc = new TextEncoder();
  const nameBytes = words.map((w) => enc.encode(w));
  const nameLen = nameBytes.reduce((n, b) => n + b.length + 1, 0);
  const buf = new ArrayBuffer(8 + nameLen + words.length * dim * 4);
  const dv = new DataView(buf);
  dv.setUint32(0, words.length, true); dv.setUint32(4, dim, true);
  let o = 8;
  for (const b of nameBytes) { new Uint8Array(buf, o, b.length).set(b); o += b.length + 1; }
  for (const r of rows) for (const x of r) { dv.setFloat32(o, x, true); o += 4; }
  return readFloatBin(buf);
}

const hexVec = Float32Array.from([1, 0]);

describe('reading', () => {
  it('wordCloud returns nearest words', () => {
    const glove = bin(['near', 'far'], [[1, 0.1], [-1, 0]]);
    expect(wordCloud(hexVec, glove, 1)[0]).toBe('near');
  });

  it('resonantEvents returns nearest event ids', () => {
    const events = bin(['Q1', 'Q2'], [[0.9, 0], [0, 1]]);
    expect(resonantEvents(hexVec, events, 1)[0]).toBe('Q1');
  });

  it('composeReading weaves the judgment with cloud words', () => {
    const hex: Hexagram = { n: 40, glyph: '䷧', name: 'Deliverance', judgment: 'Deliverance. Movement out of danger.', image: '', seedWords: [] };
    const line = composeReading(hex, ['thaw', 'release']);
    expect(line).toContain('Deliverance');
    expect(line).toContain('thaw');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/chart/oracle/__tests__/reading.test.ts`
Expected: FAIL — cannot resolve `@/chart/oracle/reading`.

- [ ] **Step 3: Implement**

Create `src/chart/oracle/reading.ts`:

```ts
import { cosineTopK, type VectorSet } from './quant';

/** One hexagram's content (from public/data/hexagrams.json). */
export interface Hexagram {
  n: number; glyph: string; name: string; judgment: string; image: string; seedWords: string[];
}
export interface HexagramsData { wave_variant: string; hexagrams: Hexagram[]; }

/** Nearest GloVe words to the hexagram centroid — the word cloud. */
export function wordCloud(hexVec: Float32Array, glove: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, glove, k).map((e) => e.word);
}

/** Nearest event ids (names in the events VectorSet are Wikidata QIDs). */
export function resonantEvents(hexVec: Float32Array, events: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, events, k).map((e) => e.word);
}

/** A terse oracular line: the judgment's first sentence woven with two cloud words. */
export function composeReading(hex: Hexagram, cloudWords: string[]): string {
  const first = (hex.judgment.split(/(?<=[.!?])\s/)[0] || hex.judgment).trim();
  const tail = cloudWords.slice(0, 2).join(', ');
  return tail ? `${first} — ${tail}.` : first;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/chart/oracle/__tests__/reading.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/oracle/reading.ts src/chart/oracle/__tests__/reading.test.ts
git commit -m "feat: oracle reading engine (word cloud, resonance, composed line)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 4: Oracle build pipeline — pure transforms

**Files:**
- Create: `scripts/build-oracle/build_oracle.py` (transforms only; `main()` added in Task 5)
- Create: `scripts/build-oracle/test_build_oracle.py`

- [ ] **Step 1: Write the failing test**

Create `scripts/build-oracle/test_build_oracle.py`:

```python
import numpy as np
from build_oracle import quantize_int8, seed_words, assemble_vocab, centroid

EMB = {"thunder": np.array([1.0, 0.0], dtype=np.float32),
       "rain":    np.array([0.0, 1.0], dtype=np.float32)}


def test_quantize_int8_normalizes_then_scales():
    q = quantize_int8(np.array([[3.0, 4.0]], dtype=np.float32))  # norm 5 → unit (0.6,0.8)
    assert q.dtype == np.int8
    assert list(q[0]) == [round(0.6 * 127), round(0.8 * 127)]   # [76, 102]


def test_seed_words_extracts_content_words_lowercased():
    sw = seed_words("Deliverance", "Thunder and RAIN; the the danger.", "")
    assert "thunder" in sw and "rain" in sw and "deliverance" in sw
    assert "the" not in sw and "and" not in sw


def test_assemble_vocab_unions_and_caps():
    vocab = assemble_vocab(seeds={"thunder"}, event_tokens={"war"}, frequent=["the", "x", "y"], cap=4)
    assert "thunder" in vocab and "war" in vocab
    assert len(vocab) <= 4


def test_centroid_averages_and_normalizes():
    c = centroid(["thunder", "rain", "missingword"], EMB)
    assert abs(float(np.linalg.norm(c)) - 1.0) < 1e-6
    assert abs(c[0] - c[1]) < 1e-6
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd scripts/build-oracle && python3 -m pytest test_build_oracle.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'build_oracle'`.

- [ ] **Step 3: Implement transforms**

Create `scripts/build-oracle/build_oracle.py`:

```python
"""Transforms + main for the oracle data build. Pure transforms are unit-tested;
main() (Task 5) wires in raw GloVe, the Legge source, and events.json."""
import re
from typing import Dict, List, Set, Sequence
import numpy as np

WAVE_VARIANT = "sheliak-tw1"
_TOKEN = re.compile(r"[a-z]+")
_STOP = {
    "the", "and", "a", "an", "of", "to", "in", "is", "it", "its", "his", "her",
    "he", "she", "they", "them", "with", "for", "on", "at", "as", "by", "be",
    "this", "that", "there", "but", "or", "if", "not", "no", "are", "was", "will",
    "shall", "may", "one", "all", "when", "then", "thus", "so", "we", "you",
}


def quantize_int8(vectors: np.ndarray) -> np.ndarray:
    """L2-normalize each row, then map to int8 via round(clamp(u*127, -127, 127))."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    unit = vectors / norms
    return np.clip(np.round(unit * 127), -127, 127).astype(np.int8)


def seed_words(name: str, judgment: str, image: str, cap: int = 15) -> List[str]:
    """Content words from a hexagram's name + judgment + image, lowercased, de-duped."""
    out: List[str] = []
    for tok in _TOKEN.findall(f"{name} {judgment} {image}".lower()):
        if tok not in _STOP and len(tok) > 2 and tok not in out:
            out.append(tok)
        if len(out) >= cap:
            break
    return out


def assemble_vocab(seeds: Set[str], event_tokens: Set[str], frequent: Sequence[str], cap: int) -> List[str]:
    """seeds ∪ event_tokens, then top-frequency fill, capped (order: required first)."""
    vocab: List[str] = []
    seen: Set[str] = set()
    for w in list(seeds) + list(event_tokens):
        if w not in seen:
            seen.add(w); vocab.append(w)
    for w in frequent:
        if len(vocab) >= cap:
            break
        if w not in seen:
            seen.add(w); vocab.append(w)
    return vocab[:cap]


def centroid(words: List[str], embeddings: Dict[str, np.ndarray]) -> np.ndarray:
    """L2-normalized mean of in-vocab word vectors (OOV words skipped)."""
    vecs = [embeddings[w] for w in words if w in embeddings]
    if not vecs:
        dim = len(next(iter(embeddings.values())))
        return np.zeros(dim, dtype=np.float32)
    mean = np.mean(np.stack(vecs), axis=0).astype(np.float32)
    n = float(np.linalg.norm(mean))
    return mean if n == 0 else (mean / n).astype(np.float32)
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd scripts/build-oracle && python3 -m pytest test_build_oracle.py -q`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-oracle/build_oracle.py scripts/build-oracle/test_build_oracle.py
git commit -m "feat: oracle build transforms (int8 quantize, seed words, vocab, centroid)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 5: Source Legge + build the data (controller-run)

**Files:**
- Create: `scripts/build-oracle/hexagrams_source.json` (64 Legge entries)
- Modify: `scripts/build-oracle/build_oracle.py` (append `main()`)
- Create: `scripts/build-oracle/README.md`
- Create (generated, committed): `public/data/hexagrams.json`, `public/data/hexagrams_64.bin`, `public/data/glove_q.bin`

> **Note for the controller:** this task downloads raw GloVe (~822 MB zip → glove.6B.300d.txt) once and sources the 64 Legge judgments/images into `hexagrams_source.json`. It mirrors B's controller-run data task. Run it in the main session, not a subagent.

- [ ] **Step 1: Source the Legge text → `scripts/build-oracle/hexagrams_source.json`**

A JSON array of 64 objects `{ "n": 1, "name": "...", "judgment": "...", "image": "..." }`,
`n` = King Wen number 1..64, text from Legge (1899, public domain). Validate:
`python3 -c "import json;d=json.load(open('scripts/build-oracle/hexagrams_source.json'));assert len(d)==64 and [x['n'] for x in d]==list(range(1,65))"`

- [ ] **Step 2: Append `main()` to `build_oracle.py`**

```python
def main() -> None:
    import json, os, sys
    from collections import Counter
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "build-events"))
    from binary_format import write_embeddings_binary

    repo = Path(__file__).resolve().parents[2]
    glove_txt = Path(os.environ.get("GLOVE_TXT", "scripts/build-oracle/glove.6B.300d.txt"))
    if not glove_txt.exists():
        sys.exit(f"raw GloVe not found: {glove_txt}\nSet GLOVE_TXT=/path/to/glove.6B.300d.txt")

    src = json.loads((Path(__file__).parent / "hexagrams_source.json").read_text())
    events = json.loads((repo / "public/data/events.json").read_text())["events"]
    event_tokens = {t for e in events for t in _TOKEN.findall(f"{e['title']} {e['summary']}".lower())}

    # seed words per hexagram + the required-word set the GloVe pass must keep
    for h in src:
        h["seedWords"] = seed_words(h["name"], h["judgment"], h["image"])
        h["glyph"] = chr(0x4DC0 + h["n"] - 1)
    seeds = {w for h in src for w in h["seedWords"]}
    required = seeds | event_tokens

    # one streaming pass over GloVe: keep required words + top-frequency fill (cap ~10k)
    DIM, CAP = 300, 10000
    emb: Dict[str, np.ndarray] = {}
    frequent: List[str] = []
    with open(glove_txt, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip().split(" ")
            w = parts[0]
            if w in required or len(frequent) < CAP:
                emb[w] = np.asarray(parts[1:1 + DIM], dtype=np.float32)
                if w not in required:
                    frequent.append(w)
    vocab = assemble_vocab(seeds, event_tokens, frequent, CAP)
    vocab = [w for w in vocab if w in emb]

    out = repo / "public/data"
    # glove_q.bin (int8) — written via the shared bin format with an int8 payload
    import struct
    mat = np.stack([emb[w] for w in vocab])
    q = quantize_int8(mat)
    buf = bytearray(struct.pack("<II", len(vocab), DIM))
    for w in vocab:
        buf += w.encode("utf-8") + b"\x00"
    buf += q.tobytes()
    (out / "glove_q.bin").write_bytes(buf)

    # hexagrams_64.bin (float32 centroids, ordinal order via King Wen number)
    cents = np.stack([centroid(h["seedWords"], emb) for h in sorted(src, key=lambda h: h["n"])]).astype(np.float32)
    write_embeddings_binary([str(h["n"]) for h in sorted(src, key=lambda h: h["n"])], cents, out / "hexagrams_64.bin")

    # hexagrams.json (eager reading content)
    (out / "hexagrams.json").write_text(json.dumps({
        "wave_variant": WAVE_VARIANT,
        "hexagrams": [{"n": h["n"], "glyph": h["glyph"], "name": h["name"],
                       "judgment": h["judgment"], "image": h["image"], "seedWords": h["seedWords"]}
                      for h in sorted(src, key=lambda h: h["n"])],
    }, ensure_ascii=False, indent=0))
    print(f"wrote {len(vocab)} vocab, 64 hexagrams", file=sys.stderr)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Write `scripts/build-oracle/README.md`**

```markdown
# build-oracle — Subproject C data pipeline

Offline: raw GloVe + `hexagrams_source.json` + B's `events.json` →
`public/data/{hexagrams.json, hexagrams_64.bin, glove_q.bin}`. Output committed; CI never runs it.

## Run
    # one-time: download glove.6B.zip, unzip glove.6B.300d.txt
    GLOVE_TXT=/path/to/glove.6B.300d.txt python3 build_oracle.py

## Tests
    python3 -m pytest -q

## Provenance
- I Ching text: James Legge, *The I Ching* (1899), public domain.
- Word vectors: GloVe 6B 300d (Apache 2.0); raw file never shipped — only the
  trimmed int8 `glove_q.bin` (~2 MB) is committed.
- Hexagram centroids live in the same GloVe space as B's `events.bin` (resonance).
```

- [ ] **Step 4: Download GloVe, run the build, verify outputs**

```bash
cd scripts/build-oracle
[ -f glove.6B.300d.txt ] || (curl -L -o glove.6B.zip https://nlp.stanford.edu/data/glove.6B.zip && unzip -o glove.6B.zip glove.6B.300d.txt)
python3 -m pytest -q
GLOVE_TXT=glove.6B.300d.txt python3 build_oracle.py
```
Verify:
```bash
python3 -c "import json;d=json.load(open('../../public/data/hexagrams.json'));print(d['wave_variant'], len(d['hexagrams']), d['hexagrams'][39]['name'])"
python3 -c "import struct;b=open('../../public/data/glove_q.bin','rb').read();print('glove_q', *struct.unpack_from('<II',b), len(b),'bytes')"
python3 -c "import struct;b=open('../../public/data/hexagrams_64.bin','rb').read();print('hex64', *struct.unpack_from('<II',b))"
```
Expected: `sheliak-tw1 64 <name>`; `glove_q ~10000 300 ~<≈2MB>`; `hex64 64 300`.

- [ ] **Step 5: Remove the raw GloVe (don't commit it) and commit the artifacts**

`glove.6B.zip`/`glove.6B.300d.txt` must NOT be committed. Add to `.gitignore`:
```
scripts/build-oracle/glove.6B*
```
```bash
cd /Users/crashy/Development/timewave-zero-2
git add .gitignore scripts/build-oracle/build_oracle.py scripts/build-oracle/hexagrams_source.json scripts/build-oracle/README.md public/data/hexagrams.json public/data/hexagrams_64.bin public/data/glove_q.bin
git commit -m "feat: build oracle data (Legge hexagrams + int8 GloVe + centroids)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: Oracle loader

**Files:**
- Create: `src/state/loadOracle.ts`
- Create: `src/state/__tests__/loadOracle.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/state/__tests__/loadOracle.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadHexagrams } from '@/state/loadOracle';

beforeEach(() => { vi.restoreAllMocks(); });

describe('loadHexagrams', () => {
  it('returns data when wave_variant matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
      json: async () => ({ wave_variant: 'sheliak-tw1', hexagrams: [] }) })));
    expect(await loadHexagrams()).toEqual({ wave_variant: 'sheliak-tw1', hexagrams: [] });
  });

  it('returns null on wave_variant mismatch', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
      json: async () => ({ wave_variant: 'other', hexagrams: [] }) })));
    expect(await loadHexagrams()).toBeNull();
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await loadHexagrams()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/state/__tests__/loadOracle.test.ts`
Expected: FAIL — cannot resolve `@/state/loadOracle`.

- [ ] **Step 3: Implement**

Create `src/state/loadOracle.ts`:

```ts
import { WAVE_VARIANT } from '@/chart/timewave';
import type { HexagramsData } from '@/chart/oracle/reading';
import { readQuantizedBin, readFloatBin, type VectorSet } from '@/chart/oracle/quant';

const base = (): string => process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Eager: the tiny judgment JSON. Null on 404 or wave_variant mismatch. */
export async function loadHexagrams(): Promise<HexagramsData | null> {
  try {
    const res = await fetch(`${base()}/data/hexagrams.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as HexagramsData;
    if (json.wave_variant !== WAVE_VARIANT) {
      console.error(`hexagrams.json wave_variant "${json.wave_variant}" != "${WAVE_VARIANT}"`);
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

async function fetchBin(path: string, read: (b: ArrayBuffer) => VectorSet): Promise<VectorSet | null> {
  try {
    const res = await fetch(`${base()}${path}`);
    if (!res.ok) return null;
    return read(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Lazy: the int8 word-vector table for the cloud. */
export const loadGlove = (): Promise<VectorSet | null> => fetchBin('/data/glove_q.bin', readQuantizedBin);
/** Lazy: the hexagram centroids (float32). */
export const loadHexVectors = (): Promise<VectorSet | null> => fetchBin('/data/hexagrams_64.bin', readFloatBin);
/** Lazy: B's event centroids (float32) for resonance. */
export const loadEventVectors = (): Promise<VectorSet | null> => fetchBin('/data/events.bin', readFloatBin);
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/state/__tests__/loadOracle.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/loadOracle.ts src/state/__tests__/loadOracle.test.ts
git commit -m "feat: oracle loaders (eager hexagrams.json, lazy vector bins)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 7: OraclePanel + wire into ChartShell

**Files:**
- Create: `src/components/OraclePanel.tsx`
- Modify: `src/components/ChartShell.tsx`

- [ ] **Step 1: Implement `src/components/OraclePanel.tsx`**

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { activeHexagram } from '@/chart/oracle/hexagram';
import { wordCloud, resonantEvents, composeReading, type HexagramsData } from '@/chart/oracle/reading';
import { sliceVector, type VectorSet } from '@/chart/oracle/quant';
import { loadHexagrams, loadGlove, loadHexVectors, loadEventVectors } from '@/state/loadOracle';
import { loadEvents } from '@/state/loadEvents';
import type { EventsData } from '@/chart/events';

/**
 * Always-on oracle: the hexagram governing the visible center, its Legge judgment
 * (instant), plus a word cloud + resonant past events (filled in once the lazy
 * vector bins load). Reads the same `view` as the chart, so it updates on pan/zoom.
 */
export function OraclePanel() {
  const { view } = useChart();
  const [hexData, setHexData] = useState<HexagramsData | null>(null);
  const [glove, setGlove] = useState<VectorSet | null>(null);
  const [hexVecs, setHexVecs] = useState<VectorSet | null>(null);
  const [eventVecs, setEventVecs] = useState<VectorSet | null>(null);
  const [events, setEvents] = useState<EventsData | null>(null);

  useEffect(() => { loadHexagrams().then(setHexData); }, []);                 // eager
  useEffect(() => {                                                          // lazy enrich
    loadGlove().then(setGlove); loadHexVectors().then(setHexVecs);
    loadEventVectors().then(setEventVecs); loadEvents().then(setEvents);
  }, []);

  const active = useMemo(() => activeHexagram(view), [view]);
  const hex = hexData?.hexagrams[active.ordinal] ?? null;
  const hexVec = hexVecs ? sliceVector(hexVecs, active.ordinal) : null;

  const cloud = useMemo(
    () => (hexVec && glove ? wordCloud(hexVec, glove, 8) : []),
    [hexVec, glove],
  );
  const echoes = useMemo(() => {
    if (!hexVec || !eventVecs || !events) return [];
    const titleById = new Map(events.events.map((e) => [e.id, e]));
    return resonantEvents(hexVec, eventVecs, 3)
      .map((id) => titleById.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  }, [hexVec, eventVecs, events]);

  return (
    <div className="wb-panel wb-in flex flex-col gap-1 p-2 w-full sm:w-[220px] text-[13px]">
      <div className="wb-label">Oracle</div>
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" aria-hidden="true">{active.glyph}</span>
        <span className="font-bold">{active.kingWen}. {hex?.name ?? '…'}</span>
      </div>
      {hex && <div className="text-[12px] leading-tight">{composeReading(hex, cloud)}</div>}
      {cloud.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" style={{ color: 'var(--wb-blue-d)' }}>
          {cloud.map((w) => <span key={w}>{w}</span>)}
        </div>
      )}
      {echoes.length > 0 && (
        <div className="text-[11px] mt-0.5">
          <span className="wb-label">Echoes</span>
          {echoes.map((e) => (
            <div key={e.id} className="truncate"><a href={e.url} target="_blank" rel="noreferrer" className="underline">{e.title}</a> · {e.year}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `src/components/ChartShell.tsx`**

Replace the `return (...)` block of `ChartShell` so the body stacks the
chart-row above an oracle strip. The current body is:

```tsx
      <WorkbenchWindow
        className="flex-1"
        bodyClassName="flex flex-col sm:flex-row min-h-0"
        prankGadgets
        title={<span className="tabular-nums">TIMEWAVE.CHART — {centerInstant}</span>}
      >
        <div className="relative flex-1 min-h-0 bg-black">
          <ChartCanvas />
          <LiveReadout />
        </div>
        <ChartDock />
      </WorkbenchWindow>
```

Change it to wrap the chart-row and add the panel below it (and import the panel):

```tsx
      <WorkbenchWindow
        className="flex-1"
        bodyClassName="flex flex-col min-h-0"
        prankGadgets
        title={<span className="tabular-nums">TIMEWAVE.CHART — {centerInstant}</span>}
      >
        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          <div className="relative flex-1 min-h-0 bg-black">
            <ChartCanvas />
            <LiveReadout />
          </div>
          <ChartDock />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <OraclePanel />
        </div>
      </WorkbenchWindow>
```

Add the import at the top of the file: `import { OraclePanel } from './OraclePanel';`

- [ ] **Step 3: Typecheck, lint, test**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: no errors; all tests pass (the new oracle suites + existing).

- [ ] **Step 4: Commit**

```bash
git add src/components/OraclePanel.tsx src/components/ChartShell.tsx
git commit -m "feat: always-on OraclePanel wired below the chart"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 8: Full verification (build + live)

**Files:** none.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: static export succeeds; confirm `out/data/hexagrams.json`,
`out/data/glove_q.bin`, `out/data/hexagrams_64.bin` exist.

- [ ] **Step 2: Live verification (Playwright, dev server)**

Start `npm run dev` and drive with Playwright. Confirm:
  - The ORACLE panel shows a glyph + "N. Name" + judgment **immediately** on load.
  - After a beat, the **word cloud** and **echoes** appear (lazy bins loaded).
  - **Panning** changes the hexagram/name/judgment; **zooming in 64×** changes it
    again (fractal scale advances).
  - Mobile (375×667) stacks the panel below the dock; desktop shows it below the
    chart row. No regression to chart/events/markers.

- [ ] **Step 3: Graceful absence**

Temporarily rename `public/data/hexagrams.json`; reload; confirm the panel shows
the glyph/number (from `activeHexagram`) with a "…" name and no crash; restore.

- [ ] **Step 4: Report** event/hexagram behaviour and any follow-ups (e.g. OracleLayer, vocab tuning) for later.

---

## Self-Review Notes

- **Spec coverage:** active-hexagram mapping (Task 1); int8 dequant + cosine (Task 2); word cloud / resonance / compose (Task 3); build transforms (Task 4); Legge source + raw-GloVe build + committed artifacts (Task 5); eager/lazy loaders + wave_variant guard (Task 6); always-on progressive panel + responsive placement (Task 7); build + live + graceful-absence (Task 8). Deferred items (PWA, OracleLayer, ask-the-oracle) match the spec's out-of-scope.
- **Type consistency:** `VectorSet`/`sliceVector`/`cosineTopK` (Task 2) used by `reading.ts` (3), `loadOracle.ts` (6), `OraclePanel` (7). `Hexagram`/`HexagramsData` defined in `reading.ts` (3), consumed by loader (6) and panel (7). `ActiveHexagram.ordinal` indexes both `hexData.hexagrams[ordinal]` and `sliceVector(hexVecs, ordinal)` — consistent because `hexagrams.json` and `hexagrams_64.bin` are both written in King Wen number order (Task 5 sorts by `n`). Python `quantize_int8`/`seed_words`/`assemble_vocab`/`centroid` (Task 4) are the same ones `main()` calls (Task 5). `events.bin` names are QIDs, matched to `TimelineEvent.id` in the panel.
- **No placeholders:** every code/command step is concrete; the only runtime-variable values are the live vocab count and rendered specifics (Tasks 5, 8), and the Legge text content (Task 5 Step 1, controller-authored).
```
