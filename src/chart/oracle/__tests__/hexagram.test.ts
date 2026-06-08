import { describe, it, expect } from 'vitest';
import { activeHexagram } from '@/chart/oracle/hexagram';
import type { Viewport } from '@/chart/viewport';

const v = (tLeft: number, tRight: number): Viewport => ({ tLeft, tRight });

describe('activeHexagram', () => {
  it('center 0 → hexagram 1, line 1 (glyph ䷀)', () => {
    expect(activeHexagram(v(200, -200))).toEqual({ ordinal: 0, kingWen: 1, glyph: '䷀', line: 1 });
  });

  it('line = index % 6 + 1', () => {
    // center 205, span 390 → s=0, index 205, ordinal 34, line 205%6+1 = 2
    const h = activeHexagram(v(400, 10));
    expect(h.ordinal).toBe(34);
    expect(h.line).toBe(2);
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
