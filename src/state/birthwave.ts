import { ZERO_DATE } from '@/chart/time';

const DAY_MS = 86_400_000;
const STORAGE_KEY = 'twz.birthwave';

/** Personal eschaton offset: 64 × 384 days (== 67 × 365.25 + 104.25). */
export const BIRTH_CYCLE_DAYS = 24576;

export interface BirthwaveState {
  birthday: string | null; // "YYYY-MM-DD"
  birthwave: boolean;       // mode on/off
  background: boolean;      // show the 2012 ghost while birthwave is on
}

export const DEFAULT_BIRTHWAVE: BirthwaveState = { birthday: null, birthwave: false, background: true };

/** Days in a given 1-based month (handles leap years via the day-0-of-next-month trick). */
export const daysInMonth = (year: number, month1to12: number): number =>
  new Date(Date.UTC(year, month1to12, 0)).getUTCDate();

/** Parse "YYYY-MM-DD" to a UTC date pinned at noon, or null if invalid. */
export function parseBirthday(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

export const formatBirthday = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** The personal zero point: birthday + 24576 days. */
export const birthZeroDate = (birthday: Date): Date =>
  new Date(birthday.getTime() + BIRTH_CYCLE_DAYS * DAY_MS);

/** Constant `t`-shift that re-anchors the wave to the birth zero point. */
export const birthOffsetDays = (birthday: Date): number =>
  (birthZeroDate(birthday).getTime() - ZERO_DATE.getTime()) / DAY_MS;

export function loadBirthwave(): BirthwaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BIRTHWAVE;
    const p = JSON.parse(raw) as Partial<BirthwaveState>;
    return {
      birthday: typeof p.birthday === 'string' ? p.birthday : null,
      birthwave: !!p.birthwave,
      background: p.background !== false, // default true
    };
  } catch {
    return DEFAULT_BIRTHWAVE;
  }
}

export function saveBirthwave(s: BirthwaveState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable — ignore */ }
}
