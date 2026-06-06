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
