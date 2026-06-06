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
