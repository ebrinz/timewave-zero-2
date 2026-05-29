'use client';
import { Suspense } from 'react';
import { ChartProvider } from '@/state/ChartProvider';
import { ChartCanvas } from '@/components/ChartCanvas';
import { ChartHUD } from '@/components/ChartHUD';
import { GridLayer } from '@/chart/layers/GridLayer';
import { WaveLayer } from '@/chart/layers/WaveLayer';
import { MarkersLayer } from '@/chart/layers/MarkersLayer';

// Module-level constant so the layers array reference is stable across renders
// (ChartProvider memoizes on it).
const LAYERS = [GridLayer, WaveLayer, MarkersLayer];

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChartProvider layers={LAYERS}>
        <ChartCanvas />
        <ChartHUD />
      </ChartProvider>
    </Suspense>
  );
}
