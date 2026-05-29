/** Eschaton anchor. The wave shape is calendar-independent; this only sets the t=0 date. */
export const ZERO_DATE = new Date(Date.UTC(2012, 11, 21, 12, 0, 0));
const DAY_MS = 86_400_000;

/** Days from the zero date (positive = past, toward larger t). */
export const dateToT = (d: Date): number => (ZERO_DATE.getTime() - d.getTime()) / DAY_MS;
export const tToDate = (t: number): Date => new Date(ZERO_DATE.getTime() - t * DAY_MS);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = MONTHS[d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()}, ${y < 0 ? `${-y + 1} BCE` : `${y} CE`}`;
}

export function parseFuzzyDate(input: string): Date {
  const s = input.trim();
  if (/^-?\d{1,7}$/.test(s)) {                       // bare year (allow BCE via negative)
    const y = parseInt(s, 10);
    const d = new Date(Date.UTC(0, 5, 15));
    d.setUTCFullYear(y);
    return d;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  throw new Error(`unrecognized date: ${input}`);
}
