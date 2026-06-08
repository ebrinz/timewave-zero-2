import { describe, it, expect } from 'vitest';
import { wordCloud, resonantEvents, composeReading, type Hexagram } from '@/chart/oracle/reading';
import { classifyWave } from '@/chart/oracle/wave';
import { readFloatBin, type VectorSet } from '@/chart/oracle/quant';

function bin(words: string[], rows: number[][]): VectorSet {
  const dim = rows[0].length;
  const enc = new TextEncoder();
  const nb = words.map((w) => enc.encode(w));
  const buf = new ArrayBuffer(8 + nb.reduce((n, b) => n + b.length + 1, 0) + words.length * dim * 4);
  const dv = new DataView(buf);
  dv.setUint32(0, words.length, true); dv.setUint32(4, dim, true);
  let o = 8;
  for (const b of nb) { new Uint8Array(buf, o, b.length).set(b); o += b.length + 1; }
  for (const r of rows) for (const x of r) { dv.setFloat32(o, x, true); o += 4; }
  return readFloatBin(buf);
}
const hexVec = Float32Array.from([1, 0]);

describe('reading', () => {
  it('wordCloud returns nearest words and drops weak/function words', () => {
    const glove = bin(['storm', 'the', 'rain', 'and'], [[1, 0.1], [0.95, 0], [0.9, 0.1], [0.85, 0]]);
    expect(wordCloud(hexVec, glove, 2)).toEqual(['storm', 'rain']);
  });
  it('wordCloud drops contraction fragments and non-alpha tokens', () => {
    const glove = bin(["n't", 'thunder', 'does', '42', 'rain', 'him'],
      [[1, 0.01], [0.98, 0], [0.96, 0], [0.94, 0], [0.92, 0], [0.9, 0]]);
    expect(wordCloud(hexVec, glove, 2)).toEqual(['thunder', 'rain']);
  });
  it('resonantEvents returns nearest event ids', () => {
    expect(resonantEvents(hexVec, bin(['Q1', 'Q2'], [[0.9, 0], [0, 1]]), 1)[0]).toBe('Q1');
  });
  it('composeReading weaves line position + wave state + cloud', () => {
    const ws = classifyWave(2, 0, 10, 1);   // low value, falling → ingression/deepening
    const line = composeReading(3, ws, ['rain', 'release']);
    expect(line).toContain('Line 3');
    expect(line).toMatch(/ingress/i);
    expect(line).toContain('rain');
    expect(line).toContain('release');
  });
  it('Hexagram type carries judgment + lines (compile check)', () => {
    const h: Hexagram = { n: 1, glyph: '䷀', name: 'The Creative', judgment: 'x', lines: ['a','b','c','d','e','f'], seedWords: [] };
    expect(h.lines.length).toBe(6);
  });
});
