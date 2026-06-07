import { describe, it, expect } from 'vitest';
import { wordCloud, resonantEvents, composeReading, type Hexagram } from '@/chart/oracle/reading';
import { readFloatBin, type VectorSet } from '@/chart/oracle/quant';

function bin(words: string[], rows: number[][]): VectorSet {
  const dim = rows[0].length;
  const enc = new TextEncoder();
  const nameBytes = words.map((w) => enc.encode(w));
  const nameLen = nameBytes.reduce((n, b) => n + b.length + 1, 0);
  const buf = new ArrayBuffer(8 + nameLen + words.length * dim * 4);
  const dv = new DataView(buf);
  dv.setUint32(0, words.length, true); dv.setUint32(4, dim, true);
  let o = 8;
  for (const b of nameBytes) { new Uint8Array(buf, o, b.length).set(b); o += b.length + 1; }
  for (const r of rows) for (const x of r) { dv.setFloat32(o, x, true); o += 4; }
  return readFloatBin(buf);
}

const hexVec = Float32Array.from([1, 0]);

describe('reading', () => {
  it('wordCloud returns nearest words', () => {
    const glove = bin(['near', 'far'], [[1, 0.1], [-1, 0]]);
    expect(wordCloud(hexVec, glove, 1)[0]).toBe('near');
  });

  it('resonantEvents returns nearest event ids', () => {
    const events = bin(['Q1', 'Q2'], [[0.9, 0], [0, 1]]);
    expect(resonantEvents(hexVec, events, 1)[0]).toBe('Q1');
  });

  it('composeReading weaves the judgment with cloud words', () => {
    const hex: Hexagram = { n: 40, glyph: '䷧', name: 'Deliverance', judgment: 'Deliverance. Movement out of danger.', image: '', seedWords: [] };
    const line = composeReading(hex, ['thaw', 'release']);
    expect(line).toContain('Deliverance');
    expect(line).toContain('thaw');
  });

  it('composeReading still ends with punctuation when the cloud is empty', () => {
    const hex: Hexagram = { n: 1, glyph: '䷀', name: 'The Creative', judgment: 'The Creative works sublime success', image: '', seedWords: [] };
    expect(composeReading(hex, [])).toMatch(/\.$/);
  });
});
