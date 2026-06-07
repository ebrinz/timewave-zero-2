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
