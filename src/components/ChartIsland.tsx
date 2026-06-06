'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartShell } from '@/components/ChartShell';
import { GridLayer } from '@/chart/layers/GridLayer';
import { WaveLayer } from '@/chart/layers/WaveLayer';
import { MarkersLayer } from '@/chart/layers/MarkersLayer';
import { createEventsLayer } from '@/chart/layers/EventsLayer';
import { loadEvents } from '@/state/loadEvents';
import type { EventsData } from '@/chart/events';

export function ChartIsland() {
  // Historical events load post-mount; until then the events layer is inert.
  const [events, setEvents] = useState<EventsData | null>(null);
  useEffect(() => { loadEvents().then(setEvents); }, []);

  // Rebuilding the array when events arrive gives ChartCanvas a new `layers`
  // reference, so it repaints with the loaded events (later layer = on top).
  const layers = useMemo(
    () => [GridLayer, WaveLayer, MarkersLayer, createEventsLayer(events)],
    [events],
  );

  return (
    <Suspense fallback={null}>
      <ChartProvider layers={layers}>
        <ChartShell />
      </ChartProvider>
    </Suspense>
  );
}
