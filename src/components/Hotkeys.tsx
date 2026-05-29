'use client';
import { useEffect } from 'react';

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (e.key === 'h' || e.key === '?') onHelp?.();
      else if (e.key === 'a') onAbout?.();
      else if (e.key === 'c') onChart?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onHelp, onAbout, onChart]);
  return null;
}
