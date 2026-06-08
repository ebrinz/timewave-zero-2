'use client';
import { useEffect, useMemo, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { activeHexagramAt } from '@/chart/oracle/hexagram';
import { wordCloud, resonantEvents, composeReading, type HexagramsData } from '@/chart/oracle/reading';
import { waveState, waveBadge } from '@/chart/oracle/wave';
import { sliceVector, type VectorSet } from '@/chart/oracle/quant';
import { loadHexagrams, loadGlove, loadHexVectors, loadEventVectors } from '@/state/loadOracle';
import { loadEvents } from '@/state/loadEvents';
import type { EventsData } from '@/chart/events';

/**
 * Always-on oracle: the hexagram governing the visible center, its judgment
 * (instant), plus a word cloud + resonant past events (filled in once the lazy
 * vector bins load). Reads the same `view` as the chart, so it updates on pan/zoom.
 */
export function OraclePanel() {
  const { view, hover } = useChart();
  const [hexData, setHexData] = useState<HexagramsData | null>(null);
  const [glove, setGlove] = useState<VectorSet | null>(null);
  const [hexVecs, setHexVecs] = useState<VectorSet | null>(null);
  const [eventVecs, setEventVecs] = useState<VectorSet | null>(null);
  const [events, setEvents] = useState<EventsData | null>(null);

  useEffect(() => { loadHexagrams().then(setHexData); }, []);                 // eager
  useEffect(() => {                                                          // lazy enrich
    loadGlove().then(setGlove); loadHexVectors().then(setHexVecs);
    loadEventVectors().then(setEventVecs); loadEvents().then(setEvents);
  }, []);

  const active = useMemo(() => {
    const t = hover ? hover.t : (view.tLeft + view.tRight) / 2;
    return activeHexagramAt(t, view.tLeft - view.tRight);
  }, [view, hover]);
  const hex = hexData?.hexagrams[active.ordinal] ?? null;
  const hexVec = useMemo(
    () => (hexVecs ? sliceVector(hexVecs, active.ordinal) : null),
    [hexVecs, active.ordinal],
  );

  const cloud = useMemo(
    () => (hexVec && glove ? wordCloud(hexVec, glove, 8) : []),
    [hexVec, glove],
  );
  const echoes = useMemo(() => {
    if (!hexVec || !eventVecs || !events) return [];
    if (eventVecs.words.length !== events.events.length) return []; // stale events.bin → no resonance
    const titleById = new Map(events.events.map((e) => [e.id, e]));
    return resonantEvents(hexVec, eventVecs, 3)
      .map((id) => titleById.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  }, [hexVec, eventVecs, events]);
  const ws = useMemo(() => waveState(hover ? hover.t : (view.tLeft + view.tRight) / 2, view), [view, hover]);

  return (
    <div className="wb-panel wb-in w-full p-2 flex flex-col items-center gap-1 text-[13px]">
      <div className="wb-label">Oracle</div>
      <span className="text-5xl sm:text-6xl leading-none" aria-hidden="true">{active.glyph}</span>
      <div className="font-bold text-base tabular-nums">{active.kingWen} · {hex?.name ?? '…'} — line {active.line}</div>
      {hex && (
        <div className="oracle-trad text-center max-w-prose leading-snug text-[14px]">
          <div>“{hex.judgment}”</div>
          {hex.lines[active.line - 1] && <div className="mt-1 italic">“{hex.lines[active.line - 1]}”</div>}
        </div>
      )}
      <div className="text-center max-w-prose leading-tight" style={{ color: 'var(--wb-orange)' }}>
        {composeReading(active.line, ws, cloud)} <span className="whitespace-nowrap">{waveBadge(ws)}</span>
      </div>
      {cloud.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[12px]" style={{ color: 'var(--wb-blue-d)' }}>
          {cloud.map((w) => <span key={w}>{w}</span>)}
        </div>
      )}
      {echoes.length > 0 && (
        <div className="text-[11px] text-center max-w-prose">
          <span className="wb-label">Echoes </span>
          {echoes.map((e, i) => (
            <span key={e.id}>
              {i > 0 && ' · '}
              <a href={e.url} target="_blank" rel="noreferrer" className="underline">{e.title}</a> ({e.year})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
