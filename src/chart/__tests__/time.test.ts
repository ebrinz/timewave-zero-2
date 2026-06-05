import { describe, it, expect } from 'vitest';
import {
  ZERO_DATE, dateToT, tToDate, formatDate, parseFuzzyDate, yearToDate,
  formatInstant, formatSpan, timeTicks,
} from '@/chart/time';

const YEAR = 365.25;
const D = (s: string) => new Date(s); // ISO UTC helper

describe('time conversions', () => {
  it('zero date maps to t=0', () => {
    expect(dateToT(ZERO_DATE)).toBeCloseTo(0, 9);
  });
  it('roundtrips date->t->date across ±1e6 days', () => {
    for (const x of [-1e6, -5000, -1, 0, 1, 5000, 1e6]) {
      expect(dateToT(tToDate(x))).toBeCloseTo(x, 6);
    }
  });
  it('formats CE and BCE years', () => {
    expect(formatDate(new Date(Date.UTC(1969, 6, 20)))).toContain('1969');
    expect(formatDate(new Date(Date.UTC(-44, 0, 1)))).toContain('BCE');
  });
  it('yearToDate avoids the Date.UTC two-digit-year trap', () => {
    // Date.UTC(1,...) would wrongly yield 1901; yearToDate must give literal year 1.
    expect(yearToDate(1).getUTCFullYear()).toBe(1);
    expect(yearToDate(50).getUTCFullYear()).toBe(50);
    expect(yearToDate(1969).getUTCFullYear()).toBe(1969);
    expect(yearToDate(-3000).getUTCFullYear()).toBe(-3000);
  });
});

describe('formatInstant — resolution adapts to zoom span', () => {
  const d = D('1982-06-14T03:47:12.418Z');
  it('deep time: year + era only, no spurious month/day', () => {
    const s = formatInstant(d, 500 * YEAR);
    expect(s).toContain('1982');
    expect(s).not.toMatch(/Jun|14|03:/);
  });
  it('decades: month + year', () => {
    const s = formatInstant(d, 10 * YEAR);
    expect(s).toContain('Jun');
    expect(s).toContain('1982');
    expect(s).not.toMatch(/14|03:47/);
  });
  it('months: full calendar date, no clock', () => {
    const s = formatInstant(d, 30);
    expect(s).toMatch(/Jun 14, 1982/);
    expect(s).not.toMatch(/03:47/);
  });
  it('days: adds HH:MM', () => {
    expect(formatInstant(d, 0.5)).toMatch(/03:47/);
    expect(formatInstant(d, 0.5)).not.toMatch(/:12/);
  });
  it('minutes: adds seconds', () => {
    expect(formatInstant(d, 2 / 1440)).toMatch(/03:47:12/);
  });
  it('seconds: adds milliseconds', () => {
    expect(formatInstant(d, 1 / 86400)).toMatch(/03:47:12\.418/);
  });
  it('renders BCE instants', () => {
    expect(formatInstant(D('-000044-03-15T00:00:00Z'), 1000 * YEAR)).toContain('BCE');
  });
});

describe('formatSpan — compact human span label', () => {
  it('labels deep time in ky', () => { expect(formatSpan(4000 * YEAR)).toMatch(/ky/); });
  it('labels years', () => { expect(formatSpan(5 * YEAR)).toMatch(/y\b/); });
  it('labels days', () => { expect(formatSpan(3)).toMatch(/d\b/); });
  it('labels hours', () => { expect(formatSpan(2 / 24)).toMatch(/h\b/); });
  it('labels minutes', () => { expect(formatSpan(5 / 1440)).toMatch(/m\b/); });
  it('labels seconds', () => { expect(formatSpan(10 / 86400)).toMatch(/s\b/); });
});

describe('timeTicks — adaptive, bounded, on-domain', () => {
  const between = (n: number) => n >= 2 && n <= 14;
  const tk = (older: string, newer: string) => timeTicks(dateToT(D(older)), dateToT(D(newer)));

  it('produces a sane tick count across many scales', () => {
    expect(between(tk('1000-01-01', '2000-01-01').length)).toBe(true); // ~1000 y
    expect(between(tk('1980-01-01', '1990-01-01').length)).toBe(true); // 10 y
    expect(between(tk('1982-01-01', '1982-06-01').length)).toBe(true); // months
    expect(between(tk('1982-06-01', '1982-06-20').length)).toBe(true); // days
    expect(between(tk('1982-06-14T00:00Z', '1982-06-15T00:00Z').length)).toBe(true); // hours
    expect(between(tk('1982-06-14T03:00Z', '1982-06-14T04:00Z').length)).toBe(true); // minutes
    expect(between(tk('1982-06-14T03:47:00Z', '1982-06-14T03:48:00Z').length)).toBe(true); // seconds
  });
  it('all ticks lie within the viewport', () => {
    const tLeft = dateToT(D('1982-06-01')), tRight = dateToT(D('1982-06-20'));
    for (const tick of timeTicks(tLeft, tRight)) {
      expect(tick.t).toBeLessThanOrEqual(tLeft + 1e-6);
      expect(tick.t).toBeGreaterThanOrEqual(tRight - 1e-6);
    }
  });
  it('hour-scale ticks carry clock labels', () => {
    const ticks = tk('1982-06-14T00:00Z', '1982-06-14T12:00Z');
    expect(ticks.some((t) => /\d\d:\d\d/.test(t.label))).toBe(true);
  });
});

describe('parseFuzzyDate', () => {
  it('accepts ISO', () => { expect(parseFuzzyDate('1969-07-20')).toBeInstanceOf(Date); });
  it('accepts month-name form', () => { expect(parseFuzzyDate('Jul 20 1969')).toBeInstanceOf(Date); });
  it('accepts a bare negative year as BCE', () => { expect(parseFuzzyDate('-5000')).toBeInstanceOf(Date); });
  it('rejects garbage with a typed error', () => {
    expect(() => parseFuzzyDate('not a date')).toThrow(/unrecognized date/i);
  });
});
