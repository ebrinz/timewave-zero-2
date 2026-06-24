'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartShell } from '@/components/ChartShell';
import { BirthwaveProvider } from '@/state/BirthwaveProvider';
import { useBirthwave } from '@/state/BirthwaveProvider';
import { GridLayer } from '@/chart/layers/GridLayer';
import { createWaveLayer } from '@/chart/layers/WaveLayer';
import { createMarkersLayer } from '@/chart/layers/MarkersLayer';
import { createEventsLayer } from '@/chart/layers/EventsLayer';
import { createNoveltyIndexLayer } from '@/chart/layers/NoveltyIndexLayer';
import { loadEvents } from '@/state/loadEvents';
import type { EventsData } from '@/chart/events';

export function ChartIsland() {
  return (
    <BirthwaveProvider>
      <ChartIslandInner />
    </BirthwaveProvider>
  );
}

function ChartIslandInner() {
  // Historical events load post-mount; until then the events layer is inert.
  const [events, setEvents] = useState<EventsData | null>(null);
  useEffect(() => { loadEvents().then(setEvents); }, []);

  const { offset, background, birthday } = useBirthwave();

  // Rebuild when events arrive or birthwave config changes (later layer = on top).
  const layers = useMemo(
    () => [
      GridLayer,
      createWaveLayer({ offset, showBackground: background }),
      createMarkersLayer({ offset, birthday, showBackground: background }),
      createEventsLayer(events),
      createNoveltyIndexLayer({ offset }),
    ],
    [events, offset, background, birthday],
  );

  return (
    <Suspense fallback={null}>
      <ChartProvider layers={layers}>
        <ChartShell />
      </ChartProvider>
    </Suspense>
  );
}
