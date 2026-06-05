'use client';
import { useState, type ReactNode } from 'react';
import { GuruMeditation, pickGuru, type Guru } from './GuruMeditation';

/**
 * An Amiga Workbench 1.3 window: white title bar with a close gadget (left) and
 * depth/resize gadgets (right), beveled body.
 *
 * With `prankGadgets`, the (otherwise inert) chrome gadgets become easter eggs —
 * each click pops a random "Guru Meditation" virus-scare gag. The close gadget
 * still calls `onClose` when no prank is requested.
 */
export function WorkbenchWindow({
  title,
  className = '',
  bodyClassName = '',
  onClose,
  prankGadgets = false,
  children,
}: {
  title: ReactNode;
  className?: string;
  bodyClassName?: string;
  onClose?: () => void;
  prankGadgets?: boolean;
  children: ReactNode;
}) {
  const [guru, setGuru] = useState<Guru | null>(null);
  const prank = () => setGuru(pickGuru());
  const interactive = prankGadgets || !!onClose;

  return (
    <div className={`wb-win flex flex-col min-h-0 ${className}`}>
      <div className="wb-title">
        <button
          type="button"
          aria-label="Close"
          className="wb-gad wb-out"
          onClick={prankGadgets ? prank : onClose}
          tabIndex={interactive ? 0 : -1}
        >
          <span className="wb-gad__dot" />
        </button>
        <span className="flex-1 truncate phosphor-glow">{title}</span>
        <button type="button" aria-label="Send to back" className="wb-gad wb-out" onClick={prankGadgets ? prank : undefined} tabIndex={prankGadgets ? 0 : -1}>
          <span className="wb-gad__depth" />
        </button>
        <button type="button" aria-label="Resize" className="wb-gad wb-out" onClick={prankGadgets ? prank : undefined} tabIndex={prankGadgets ? 0 : -1}>
          <span className="wb-gad__depth" />
        </button>
      </div>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
      {guru && <GuruMeditation guru={guru} onClose={() => setGuru(null)} />}
    </div>
  );
}
