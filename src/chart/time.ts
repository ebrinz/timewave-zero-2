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

const pad = (n: number, len = 2): string => String(Math.floor(n)).padStart(len, '0');
const eraYear = (d: Date): string => { const y = d.getUTCFullYear(); return y < 0 ? `${-y + 1} BCE` : `${y} CE`; };
const calDate = (d: Date): string => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${eraYear(d)}`;
const clock = (d: Date): string => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

const YEAR_D = 365.25, DAY = 1, HOUR = 1 / 24, MIN = 1 / 1440, SEC = 1 / 86400;

/**
 * Format an instant with precision matched to the visible span (days). As the
 * chart dives into the fractal, the readout sheds noise it can't justify (deep
 * time → year only) and gains precision it now can (sub-second → milliseconds).
 */
export function formatInstant(d: Date, spanDays: number): string {
  if (spanDays >= 50 * YEAR_D) return eraYear(d);
  if (spanDays >= 2 * YEAR_D) return `${MONTHS[d.getUTCMonth()]} ${eraYear(d)}`;
  if (spanDays >= 2 * DAY) return calDate(d);
  if (spanDays >= 5 * MIN) return `${calDate(d)}  ${clock(d)}`;
  if (spanDays >= 5 * SEC) return `${calDate(d)}  ${clock(d)}:${pad(d.getUTCSeconds())}`;
  return `${calDate(d)}  ${clock(d)}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

/** Compact label for a span width (e.g. depth gauge / dock readout). */
export function formatSpan(spanDays: number): string {
  const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  if (spanDays >= 1000 * YEAR_D) return `${fmt(spanDays / (1000 * YEAR_D))} ky`;
  if (spanDays >= YEAR_D) return `${fmt(spanDays / YEAR_D)} y`;
  if (spanDays >= DAY) return `${fmt(spanDays)} d`;
  if (spanDays >= HOUR) return `${fmt(spanDays / HOUR)} h`;
  if (spanDays >= MIN) return `${fmt(spanDays / MIN)} m`;
  return `${fmt(spanDays / SEC)} s`;
}

export interface Tick { t: number; label: string }

// Pick the smallest candidate step that keeps the tick count at or below ~10.
const chooseStep = (spanUnits: number, cands: number[]): number =>
  cands.find((c) => spanUnits / c <= 10) ?? cands[cands.length - 1];

// Generate ticks on a fixed-width unit (day and below), aligned to the wall
// clock via the epoch (epoch is 00:00:00 UTC, so day/hour/minute/second steps
// land on natural boundaries). tLeft is the older (left) edge, so its instant
// has the SMALLER epoch ms; we walk from there toward the newer right edge.
function unitTicks(tLeft: number, tRight: number, unitDays: number, step: number, label: (d: Date) => string): Tick[] {
  const stepMs = unitDays * step * DAY_MS;
  const olderMs = tToDate(tLeft).getTime();
  const newerMs = tToDate(tRight).getTime();
  const out: Tick[] = [];
  for (let ms = Math.ceil(olderMs / stepMs) * stepMs; ms <= newerMs; ms += stepMs) {
    const d = new Date(ms);
    out.push({ t: dateToT(d), label: label(d) });
  }
  return out;
}

// Calendar-aligned ticks for irregular units (months, years).
function calendarTicks(tLeft: number, tRight: number, kind: 'month' | 'year', step: number): Tick[] {
  const older = tToDate(tLeft), newer = tToDate(tRight);
  const out: Tick[] = [];
  if (kind === 'year') {
    const yL = older.getUTCFullYear(), yR = newer.getUTCFullYear();
    for (let yr = Math.ceil(yL / step) * step; yr <= Math.floor(yR / step) * step; yr += step) {
      out.push({ t: dateToT(yearToDate(yr)), label: yr < 0 ? `${-yr + 1} BCE` : `${yr}` });
    }
  } else {
    // iterate first-of-month boundaries
    let y = older.getUTCFullYear(), m = older.getUTCMonth();
    m = Math.ceil(m / step) * step; while (m >= 12) { m -= 12; y++; }
    for (let d = new Date(Date.UTC(2000, 0, 1)); ;) {
      d = new Date(Date.UTC(2000, 0, 1)); d.setUTCFullYear(y, m, 1); d.setUTCHours(0, 0, 0, 0);
      if (d.getTime() > newer.getTime()) break;
      out.push({ t: dateToT(d), label: `${MONTHS[m]} ${y < 0 ? `${-y + 1}BCE` : y}` });
      m += step; while (m >= 12) { m -= 12; y++; }
    }
  }
  return out;
}

/**
 * Adaptive gridline ticks for the visible viewport (tLeft > tRight). Chooses a
 * unit (year → month → day → hour → minute → second) and a "nice" step so the
 * grid stays legible (~2–12 ticks) at every zoom depth.
 */
export function timeTicks(tLeft: number, tRight: number): Tick[] {
  const span = tLeft - tRight;
  if (span >= 2 * YEAR_D) {
    const spanYears = span / YEAR_D;
    let step: number;
    if (spanYears < 25) step = 5; else if (spanYears < 120) step = 10; else if (spanYears < 600) step = 50;
    else if (spanYears < 3000) step = 250; else if (spanYears < 15000) step = 1000;
    else step = Math.pow(10, Math.floor(Math.log10(spanYears / 8)));
    return calendarTicks(tLeft, tRight, 'year', step);
  }
  if (span >= 50 * DAY) return calendarTicks(tLeft, tRight, 'month', chooseStep(span / 30, [1, 2, 3, 6]));
  if (span >= 2 * DAY) return unitTicks(tLeft, tRight, DAY, chooseStep(span / DAY, [1, 2, 5, 10]), (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`);
  if (span >= 2 * HOUR) return unitTicks(tLeft, tRight, HOUR, chooseStep(span / HOUR, [1, 3, 6, 12]), clock);
  if (span >= 2 * MIN) return unitTicks(tLeft, tRight, MIN, chooseStep(span / MIN, [1, 5, 10, 15, 30]), clock);
  return unitTicks(tLeft, tRight, SEC, chooseStep(span / SEC, [1, 5, 10, 15, 30]), (d) => `${clock(d)}:${pad(d.getUTCSeconds())}`);
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
