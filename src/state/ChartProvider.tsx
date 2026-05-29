'use client';
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { clamp, type Viewport } from '@/chart/viewport';
import type { OverlayLayer } from '@/chart/layers/types';
import { DEFAULT_VIEW, serializeView, parseView } from '@/state/urlSync';

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

  const didHydrate = useRef(false);

  // Post-mount: apply URL -> view ONCE (reading during render would cause a
  // hydration mismatch under static export). Then track back/forward.
  // The URL is an external system we synchronize FROM on mount, so this
  // setState-in-effect is intentional (not the "derived state" anti-pattern).
  useEffect(() => {
    const parsed = parseView(new URLSearchParams(window.location.search));
    if (parsed.error) console.warn(parsed.error);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from URL (external system) once on mount
    setViewRaw(parsed.view);
    didHydrate.current = true;
    const onPop = () => setViewRaw(parseView(new URLSearchParams(window.location.search)).view);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // view -> URL, debounced. Skip until after hydration so the initial default
  // view doesn't clobber a shared ?l=&r= link before we've read it.
  useEffect(() => {
    if (!didHydrate.current) return;
    const id = setTimeout(() => {
      window.history.replaceState(null, '', `${window.location.pathname}?${serializeView(view)}`);
    }, 150);
    return () => clearTimeout(id);
  }, [view]);

  const value = useMemo(() => ({ view, setView, hover, setHover, layers }), [view, setView, hover, layers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
