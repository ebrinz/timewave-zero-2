'use client';
import { Suspense } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartShell } from '@/components/ChartShell';
import { GridLayer } from '@/chart/layers/GridLayer';
import { WaveLayer } from '@/chart/layers/WaveLayer';
import { MarkersLayer } from '@/chart/layers/MarkersLayer';

// Module-level constant so the layers array reference is stable across renders
// (ChartProvider memoizes on it).
const LAYERS = [GridLayer, WaveLayer, MarkersLayer];

export function ChartIsland() {
  return (
    <Suspense fallback={null}>
      <ChartProvider layers={LAYERS}>
        <ChartShell />
      </ChartProvider>
    </Suspense>
  );
}
