'use client';
import type { ReactNode } from 'react';

/**
 * An Amiga Workbench 1.3 window: white title bar with a close gadget (left) and
 * depth gadgets (right), beveled body. Purely presentational — the gadgets are
 * decorative unless `onClose` is supplied.
 */
export function WorkbenchWindow({
  title,
  className = '',
  bodyClassName = '',
  onClose,
  children,
}: {
  title: ReactNode;
  className?: string;
  bodyClassName?: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`wb-win flex flex-col min-h-0 ${className}`}>
      <div className="wb-title">
        <button
          type="button"
          aria-label="Close"
          className="wb-gad wb-out"
          onClick={onClose}
          tabIndex={onClose ? 0 : -1}
        >
          <span className="wb-gad__dot" />
        </button>
        <span className="flex-1 truncate phosphor-glow">{title}</span>
        <span className="wb-gad wb-out" aria-hidden="true"><span className="wb-gad__depth" /></span>
        <span className="wb-gad wb-out" aria-hidden="true"><span className="wb-gad__depth" /></span>
      </div>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
