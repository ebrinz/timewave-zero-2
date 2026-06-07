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
        dim = len(next(iter(embeddings.values()))) if embeddings else 300
        return np.zeros(dim, dtype=np.float32)
    mean = np.mean(np.stack(vecs), axis=0).astype(np.float32)
    n = float(np.linalg.norm(mean))
    return mean if n == 0 else (mean / n).astype(np.float32)


def main() -> None:
    import json
    import os
    import sys
    import struct
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

    # seed words + glyphs per hexagram; collect the required-word set the GloVe pass keeps.
    # Uses judgment+lines+keywords when present (Task 5 shape); gracefully falls back to
    # the old shape (judgment/image, no lines/keywords).
    for h in src:
        text = " ".join([h["name"], h.get("judgment", ""), *h.get("lines", [])])
        kw = [w.lower() for w in h.get("keywords", [])]
        h["seedWords"] = list(dict.fromkeys(kw + seed_words("", text, "", cap=24)))
        h["glyph"] = chr(0x4DC0 + h["n"] - 1)
    seeds = {w for h in src for w in h["seedWords"]}
    WAVE_VOCAB = {"ingression", "novelty", "habit", "entrenchment", "dissolving",
                  "returning", "deepening", "threshold", "culmination", "transition"}
    required = seeds | event_tokens | WAVE_VOCAB

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
    vocab = [w for w in assemble_vocab(seeds | WAVE_VOCAB, event_tokens, frequent, CAP) if w in emb]

    out = repo / "public/data"
    out.mkdir(parents=True, exist_ok=True)

    # Common-component removal: subtract the vocab mean before normalizing. Raw GloVe
    # centroids drift toward high-frequency "central" words (could/would/come…), which
    # then dominate every word cloud; centering removes that shared direction so the
    # nearest neighbours are evocative imagery instead. Applied to ALL three artifacts
    # with the SAME mean so cosine stays consistent across them (runtime is plain cosine).
    mat = np.stack([emb[w] for w in vocab])
    mean = mat.mean(axis=0).astype(np.float32)

    def centered_centroid(words: List[str]) -> np.ndarray:
        vecs = [emb[w] for w in words if w in emb]
        if not vecs:
            return np.zeros(DIM, dtype=np.float32)
        c = (np.mean(np.stack(vecs), axis=0) - mean).astype(np.float32)
        n = float(np.linalg.norm(c))
        return c if n == 0 else (c / n).astype(np.float32)

    # glove_q.bin (int8): centered then quantized (quantize_int8 re-normalizes rows)
    q = quantize_int8(mat - mean)
    buf = bytearray(struct.pack("<II", len(vocab), DIM))
    for w in vocab:
        buf += w.encode("utf-8") + b"\x00"
    buf += q.tobytes()
    (out / "glove_q.bin").write_bytes(buf)

    # events.bin: regenerate centered (same space as the cloud + hexagrams) for
    # resonance. Overwrites B's uncentered copy — only the oracle consumes events.bin;
    # B's EventsLayer reads events.json, so its rendering is unaffected.
    ev_centroids = np.stack([
        centered_centroid(_TOKEN.findall(f"{e['title']} {e['summary']}".lower())) for e in events
    ]).astype(np.float32)
    write_embeddings_binary([e["id"] for e in events], ev_centroids, out / "events.bin")

    # hexagrams_64.bin (float32 centered centroids) + hexagrams.json (eager content),
    # both in King Wen number order (1..64)
    ordered = sorted(src, key=lambda h: h["n"])
    cents = np.stack([centered_centroid(h["seedWords"]) for h in ordered]).astype(np.float32)
    write_embeddings_binary([str(h["n"]) for h in ordered], cents, out / "hexagrams_64.bin")
    (out / "hexagrams.json").write_text(json.dumps({
        "wave_variant": WAVE_VARIANT, "glove": "glove-6B-300d",
        "generated": __import__("datetime").date.today().isoformat(),
        "hexagrams": [{"n": h["n"], "glyph": h["glyph"], "name": h["name"],
                       "judgment": h.get("judgment", ""), "lines": h.get("lines", []),
                       "seedWords": h["seedWords"]} for h in ordered],
    }, ensure_ascii=False, indent=0))
    print(f"wrote {len(vocab)} vocab words, 64 hexagrams", file=sys.stderr)


if __name__ == "__main__":
    main()
