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
