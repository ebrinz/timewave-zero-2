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


def test_centroid_empty_embeddings_returns_zero_vector():
    c = centroid(["anything"], {})
    assert c.shape == (300,) and not c.any()


def test_seed_words_from_judgment_and_lines_text():
    sw = seed_words("Deliverance", "Thunder and rain bring release.", "")
    assert "thunder" in sw and "rain" in sw and "release" in sw
    assert "and" not in sw
