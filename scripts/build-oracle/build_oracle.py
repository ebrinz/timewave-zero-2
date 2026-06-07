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
