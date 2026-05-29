import { describe, it, expect } from 'vitest';
import { serializeView, parseView } from '@/state/urlSync';
import type { Viewport } from '@/chart/viewport';

describe('url sync', () => {
  it('numeric serialize->parse is exact for random viewports', () => {
    for (let i = 0; i < 100; i++) {
      const a = Math.random() * 1e6 - 5e5;
      const b = a - (Math.random() * 1e5 + 1);          // ensure tLeft > tRight
      const v: Viewport = { tLeft: a, tRight: b };
      const parsed = parseView(new URLSearchParams(serializeView(v)));
      expect(parsed.view.tLeft).toBeCloseTo(v.tLeft, 6);
      expect(parsed.view.tRight).toBeCloseTo(v.tRight, 6);
      expect(parsed.error).toBeNull();
    }
  });
  it('resolves readable ?d=&z= shorthand to a centered view', () => {
    const parsed = parseView(new URLSearchParams('d=1969-07-20&z=10y'));
    expect(parsed.error).toBeNull();
    expect(parsed.view.tLeft).toBeGreaterThan(parsed.view.tRight);
  });
  it('returns default + typed error on invalid input', () => {
    const parsed = parseView(new URLSearchParams('l=abc&r=def'));
    expect(parsed.error).toMatch(/could not parse/i);
    expect(parsed.view.tLeft).toBeGreaterThan(parsed.view.tRight);   // defaulted
  });
});
