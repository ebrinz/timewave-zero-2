/** Eschaton anchor. The wave shape is calendar-independent; this only sets the t=0 date. */
export const ZERO_DATE = new Date(Date.UTC(2012, 11, 21, 12, 0, 0));
const DAY_MS = 86_400_000;

/** Days from the zero date (positive = past, toward larger t). */
export const dateToT = (d: Date): number => (ZERO_DATE.getTime() - d.getTime()) / DAY_MS;
export const tToDate = (t: number): Date => new Date(ZERO_DATE.getTime() - t * DAY_MS);

/**
 * Build a UTC date at mid-June of an arbitrary (possibly small, zero, or
 * negative) year, avoiding the `Date.UTC` two-digit-year trap where
 * `Date.UTC(1, ...)` is interpreted as 1901. `setUTCFullYear` takes the literal
 * year for all ranges. Used to place year gridlines and historical markers.
 */
export function yearToDate(year: number): Date {
  const d = new Date(Date.UTC(2000, 5, 15));
  d.setUTCFullYear(year);
  return d;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = MONTHS[d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()}, ${y < 0 ? `${-y + 1} BCE` : `${y} CE`}`;
}

export function parseFuzzyDate(input: string): Date {
  const s = input.trim();
  if (/^-?\d{1,7}$/.test(s)) {                       // bare year (allow BCE via negative)
    return yearToDate(parseInt(s, 10));
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  throw new Error(`unrecognized date: ${input}`);
}
