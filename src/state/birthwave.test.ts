import { describe, it, expect, beforeEach } from 'vitest';
import {
  daysInMonth, parseBirthday, formatBirthday, birthZeroDate, birthOffsetDays,
  loadBirthwave, saveBirthwave, DEFAULT_BIRTHWAVE, BIRTH_CYCLE_DAYS,
} from './birthwave';
import { dateToT } from '@/chart/time';

const DAY_MS = 86_400_000;

describe('birthwave helpers', () => {
  it('BIRTH_CYCLE_DAYS is 64 * 384', () => {
    expect(BIRTH_CYCLE_DAYS).toBe(24576);
    expect(BIRTH_CYCLE_DAYS).toBe(64 * 384);
  });

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth(2000, 2)).toBe(29); // divisible by 400
    expect(daysInMonth(1900, 2)).toBe(28); // divisible by 100, not 400
    expect(daysInMonth(1990, 2)).toBe(28);
    expect(daysInMonth(1990, 4)).toBe(30);
    expect(daysInMonth(1990, 1)).toBe(31);
  });

  it('parseBirthday accepts valid dates and rejects bad ones', () => {
    const d = parseBirthday('1987-06-23')!;
    expect(d).not.toBeNull();
    expect(d.getUTCFullYear()).toBe(1987);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(23);
    expect(parseBirthday('1987-13-01')).toBeNull();
    expect(parseBirthday('1987-02-30')).toBeNull();
    expect(parseBirthday('garbage')).toBeNull();
  });

  it('formatBirthday round-trips parseBirthday', () => {
    expect(formatBirthday(parseBirthday('2012-12-21')!)).toBe('2012-12-21');
  });

  it('birthZeroDate adds exactly BIRTH_CYCLE_DAYS', () => {
    const d = parseBirthday('1987-06-23')!;
    expect((birthZeroDate(d).getTime() - d.getTime()) / DAY_MS).toBe(BIRTH_CYCLE_DAYS);
  });

  it('birthOffsetDays: a birthday on the 2012 zero date yields offset = cycle', () => {
    // parseBirthday pins 12:00 UTC, == ZERO_DATE, so dateToT == 0.
    const d = parseBirthday('2012-12-21')!;
    expect(dateToT(d)).toBeCloseTo(0, 6);
    expect(birthOffsetDays(d)).toBeCloseTo(BIRTH_CYCLE_DAYS, 6);
  });

  it('loadBirthwave falls back to default on missing/corrupt storage', () => {
    expect(loadBirthwave()).toEqual(DEFAULT_BIRTHWAVE);
    localStorage.setItem('twz.birthwave', '{not json');
    expect(loadBirthwave()).toEqual(DEFAULT_BIRTHWAVE);
  });

  it('saveBirthwave round-trips through loadBirthwave', () => {
    const s = { birthday: '1987-06-23', birthwave: true, background: false };
    saveBirthwave(s);
    expect(loadBirthwave()).toEqual(s);
  });
});

beforeEach(() => localStorage.clear());
