'use client';
import { useEffect, useMemo, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { activeHexagram } from '@/chart/oracle/hexagram';
import { wordCloud, resonantEvents, composeReading, type HexagramsData } from '@/chart/oracle/reading';
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
  const { view } = useChart();
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

  const active = useMemo(() => activeHexagram(view), [view]);
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
    const titleById = new Map(events.events.map((e) => [e.id, e]));
    return resonantEvents(hexVec, eventVecs, 3)
      .map((id) => titleById.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  }, [hexVec, eventVecs, events]);

  return (
    <div className="wb-panel wb-in flex flex-col gap-1 p-2 w-full sm:w-[220px] text-[13px]">
      <div className="wb-label">Oracle</div>
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" aria-hidden="true">{active.glyph}</span>
        <span className="font-bold">{active.kingWen}. {hex?.name ?? '…'}</span>
      </div>
      {hex && <div className="text-[12px] leading-tight">{composeReading(hex, cloud)}</div>}
      {cloud.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" style={{ color: 'var(--wb-blue-d)' }}>
          {cloud.map((w) => <span key={w}>{w}</span>)}
        </div>
      )}
      {echoes.length > 0 && (
        <div className="text-[11px] mt-0.5">
          <span className="wb-label">Echoes</span>
          {echoes.map((e) => (
            <div key={e.id} className="truncate"><a href={e.url} target="_blank" rel="noreferrer" className="underline">{e.title}</a> · {e.year}</div>
          ))}
        </div>
      )}
    </div>
  );
}
