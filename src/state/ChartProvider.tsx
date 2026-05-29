'use client';
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { clamp, type Viewport } from '@/chart/viewport';
import type { OverlayLayer } from '@/chart/layers/types';
import { DEFAULT_VIEW } from '@/state/urlSync';

type Hover = { t: number; x: number; y: number; novelty: number } | null;
interface ChartCtx {
  view: Viewport;
  setView: (v: Viewport) => void;
  hover: Hover;
  setHover: (h: Hover) => void;
  layers: OverlayLayer[];
}

const Ctx = createContext<ChartCtx | null>(null);
export const useChart = (): ChartCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChart outside provider');
  return c;
};

export function ChartProvider({ layers, children }: { layers: OverlayLayer[]; children: ReactNode }) {
  const [view, setViewRaw] = useState<Viewport>(DEFAULT_VIEW);
  const [hover, setHover] = useState<Hover>(null);
  const setView = useCallback((v: Viewport) => setViewRaw(clamp(v)), []);
  const value = useMemo(() => ({ view, setView, hover, setHover, layers }), [view, setView, hover, layers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
