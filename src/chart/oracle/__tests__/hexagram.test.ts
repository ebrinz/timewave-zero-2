import { describe, it, expect } from 'vitest';
import { activeHexagram } from '@/chart/oracle/hexagram';
import type { Viewport } from '@/chart/viewport';

const v = (tLeft: number, tRight: number): Viewport => ({ tLeft, tRight });

describe('activeHexagram', () => {
  it('center 0 → hexagram 1 (ordinal 0, glyph ䷀)', () => {
    const h = activeHexagram(v(200, -200));
    expect(h).toEqual({ ordinal: 0, kingWen: 1, glyph: '䷀' });
  });

  it('wide span uses scale 0: index = floor(x) mod 384', () => {
    const h = activeHexagram(v(400, 10));
    expect(h.ordinal).toBe(34);
    expect(h.kingWen).toBe(35);
  });

  it('mod-384 wrap at scale 0', () => {
    const h = activeHexagram(v(4195, 3805));
    expect(h.kingWen).toBe(27);
  });

  it('diving raises the scale: span 6 → s=1', () => {
    const h = activeHexagram(v(13, 7));
    expect(h.kingWen).toBe(43);
  });

  it('glyph is in the Unicode hexagram block', () => {
    expect(activeHexagram(v(400, 10)).glyph.codePointAt(0)).toBe(0x4dc0 + 34);
  });
});
