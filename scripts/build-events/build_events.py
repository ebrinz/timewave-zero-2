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
# Calendar-period labels (year / decade / century / millennium, incl. BC/BCE and AD
# variants) — these dominate sitelink counts but aren't events. Matched on the label.
_CALENDAR = re.compile(
    r"^\s*("
    r"\d{1,4}s?"                                   # 2010, 2010s, 90s
    r"|\d{1,2}(st|nd|rd|th)\s+(century|millennium)" # 21st century, 3rd millennium
    r"|\d{1,4}\s*(bc|bce|ad|ce)"                    # 44 BC, 1 CE
    r")\s*$",
    re.IGNORECASE,
)


_QID_LABEL = re.compile(r"^Q\d+$")


def is_calendar_label(title: str) -> bool:
    """True for bare calendar-period labels (years/decades/centuries), which are
    notable on Wikidata but are not events and must be excluded."""
    return bool(_CALENDAR.match(title))


def is_unlabeled(title: str) -> bool:
    """True when the label is just the QID (no English label resolved) — drop it."""
    return bool(_QID_LABEL.match(title.strip()))


def percentile_scores(sitelinks: List[int]) -> List[float]:
    """Map each sitelink count to its percentile rank in [0,1] (min→0, max→1)."""
    n = len(sitelinks)
    if n <= 1:
        return [1.0] * n
    # Ties break by original position (stable), giving adjacent ranks — fine for notability ordering.
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
    return None if norm == 0 else (mean / norm).astype(np.float32)


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


def main() -> None:
    import json
    import sys
    from pathlib import Path
    from binary_format import read_embeddings_binary, write_embeddings_binary
    from query_wikidata import fetch_raw

    repo = Path(__file__).resolve().parents[2]
    emb_bin = Path("/Users/crashy/Development/technolabe/natal-chart-app/public/data/embeddings_7500.bin")
    words, vectors = read_embeddings_binary(emb_bin)
    embeddings = {w: vectors[i] for i, w in enumerate(words)}

    now = datetime.now(timezone.utc)
    raw = fetch_raw()
    # Keep ISO dates Python can parse; drop BCE (rare among top-sitelink events) for v1;
    # drop calendar-period entries (years/decades/centuries) and unlabeled QID rows.
    raw = [r for r in raw
           if r["iso"][0] != "-"
           and not is_calendar_label(r["title"])
           and not is_unlabeled(r["title"])]
    scores = percentile_scores([r["sitelinks"] for r in raw])

    events, ids, vecs = [], [], []
    for r, s in zip(raw, scores):
        try:
            ev = raw_to_event(r, s)
        except (ValueError, KeyError):
            continue  # un-parseable date or missing field — skip defensively
        if ev["t"] < date_to_t(now):
            continue  # B is the historical (past) timeline; the future side is subproject C
        events.append(ev)
        c = build_centroid(f"{ev['title']} {ev['summary']}", embeddings)
        if c is not None:
            ids.append(ev["id"])
            vecs.append(c)

    out_dir = repo / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "events.json").write_text(json.dumps({
        "wave_variant": WAVE_VARIANT,
        "generated": datetime.now(timezone.utc).date().isoformat(),
        "glove": GLOVE_SOURCE,
        "events": events,
    }, ensure_ascii=False, indent=0))
    write_embeddings_binary(ids, np.stack(vecs).astype(np.float32), out_dir / "events.bin")
    print(f"wrote {len(events)} events, {len(ids)} vectors", file=sys.stderr)


if __name__ == "__main__":
    main()
