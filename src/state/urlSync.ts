import { clamp, type Viewport } from '@/chart/viewport';
import { dateToT, parseFuzzyDate } from '@/chart/time';

const YEAR = 365.25;
const SPANS: Record<string, number> = {
  '1y':   YEAR,
  '10y':  10 * YEAR,
  '100y': 100 * YEAR,
  '1ky':  1000 * YEAR,
  '10ky': 10000 * YEAR,
};

export const DEFAULT_VIEW: Viewport = clamp({
  tLeft:  dateToT(new Date(Date.UTC(1900, 0, 1))),
  tRight: dateToT(new Date(Date.UTC(2030, 0, 1))),
});

/**
 * Serialize a viewport to a URL query string.
 * Uses toFixed(8) so the roundtrip error is < 5e-9, well within toBeCloseTo(..., 6).
 */
export function serializeView(v: Viewport): string {
  const p = new URLSearchParams();
  p.set('l', v.tLeft.toFixed(8));
  p.set('r', v.tRight.toFixed(8));
  return p.toString();
}

export interface ParseResult { view: Viewport; error: string | null; }

export function parseView(p: URLSearchParams): ParseResult {
  // 1. Exact numeric form wins.
  if (p.has('l') && p.has('r')) {
    const l = Number(p.get('l'));
    const r = Number(p.get('r'));
    if (Number.isFinite(l) && Number.isFinite(r)) {
      return { view: clamp({ tLeft: l, tRight: r }), error: null };
    }
    return { view: DEFAULT_VIEW, error: 'could not parse l/r params' };
  }
  // 2. Readable shorthand ?d=&z=
  if (p.has('d')) {
    try {
      const center = dateToT(parseFuzzyDate(p.get('d')!));
      const span = SPANS[p.get('z') ?? '10y'] ?? SPANS['10y'];
      return { view: clamp({ tLeft: center + span / 2, tRight: center - span / 2 }), error: null };
    } catch {
      return { view: DEFAULT_VIEW, error: 'could not parse d param' };
    }
  }
  return { view: DEFAULT_VIEW, error: null };
}
