'use client';
import { useEffect, useRef } from 'react';

const isTyping = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || !!el.closest('[role=dialog]'));
};

export interface HotkeyHandlers {
  onHelp?: () => void;
  onAbout?: () => void;
  onChart?: () => void;
}

export function Hotkeys({ onHelp, onAbout, onChart }: HotkeyHandlers) {
  // Hold the latest handlers in a ref so the window listener is subscribed once
  // and never thrashes — callers commonly pass inline arrows (new identity each
  // render), which would otherwise re-subscribe on every parent render.
  const handlers = useRef({ onHelp, onAbout, onChart });
  useEffect(() => { handlers.current = { onHelp, onAbout, onChart }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.key === 'h' || e.key === '?') handlers.current.onHelp?.();
      else if (e.key === 'a') handlers.current.onAbout?.();
      else if (e.key === 'c') handlers.current.onChart?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
