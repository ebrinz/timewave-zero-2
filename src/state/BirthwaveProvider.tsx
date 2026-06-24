'use client';
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react';
import {
  DEFAULT_BIRTHWAVE, loadBirthwave, saveBirthwave, parseBirthday, birthOffsetDays,
  type BirthwaveState,
} from './birthwave';

interface BirthwaveCtx {
  birthday: string | null;
  birthwave: boolean;
  background: boolean;
  offset: number | null;
  setBirthday: (s: string) => void;
  setBirthwave: (on: boolean) => void;
  setBackground: (on: boolean) => void;
}

const Ctx = createContext<BirthwaveCtx | null>(null);
export const useBirthwave = (): BirthwaveCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBirthwave outside provider');
  return c;
};

export function BirthwaveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BirthwaveState>(DEFAULT_BIRTHWAVE);
  const hydrated = useRef(false);

  // Load from localStorage (an external system) once on mount, like ChartProvider's URL sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
    setState(loadBirthwave());
    hydrated.current = true;
  }, []);

  // Persist after hydration so the default doesn't clobber stored state before we read it.
  useEffect(() => { if (hydrated.current) saveBirthwave(state); }, [state]);

  const setBirthday = useCallback((birthday: string) => setState((s) => ({ ...s, birthday, birthwave: true })), []);
  const setBirthwave = useCallback((birthwave: boolean) => setState((s) => ({ ...s, birthwave })), []);
  const setBackground = useCallback((background: boolean) => setState((s) => ({ ...s, background })), []);

  const offset = useMemo(() => {
    if (!state.birthwave || !state.birthday) return null;
    const d = parseBirthday(state.birthday);
    return d ? birthOffsetDays(d) : null;
  }, [state.birthwave, state.birthday]);

  const value = useMemo<BirthwaveCtx>(() => ({
    birthday: state.birthday, birthwave: state.birthwave, background: state.background,
    offset, setBirthday, setBirthwave, setBackground,
  }), [state, offset, setBirthday, setBirthwave, setBackground]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
