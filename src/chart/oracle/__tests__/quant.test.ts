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
