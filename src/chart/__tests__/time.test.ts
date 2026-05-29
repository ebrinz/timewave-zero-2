import { describe, it, expect } from 'vitest';
import { ZERO_DATE, dateToT, tToDate, formatDate, parseFuzzyDate, yearToDate } from '@/chart/time';

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

describe('parseFuzzyDate', () => {
  it('accepts ISO', () => { expect(parseFuzzyDate('1969-07-20')).toBeInstanceOf(Date); });
  it('accepts month-name form', () => { expect(parseFuzzyDate('Jul 20 1969')).toBeInstanceOf(Date); });
  it('accepts a bare negative year as BCE', () => { expect(parseFuzzyDate('-5000')).toBeInstanceOf(Date); });
  it('rejects garbage with a typed error', () => {
    expect(() => parseFuzzyDate('not a date')).toThrow(/unrecognized date/i);
  });
});
