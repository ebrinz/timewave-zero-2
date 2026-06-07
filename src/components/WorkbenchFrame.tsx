'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Hotkeys } from './Hotkeys';
import { ShareButton } from './ShareButton';

const NAV = [
  { href: '/', label: 'Chart' },
  { href: '/help', label: 'Help' },
  { href: '/about', label: 'About' },
];

/**
 * The Amiga Workbench "screen": a blue desktop with a white menu/screen bar
 * across the top. Page content sits on the desktop below it (Layout C frames the
 * chart as a single Workbench window centered on this desktop).
 */
export function WorkbenchFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="flex flex-col h-dvh wb-out" style={{ background: 'var(--wb-blue)' }}>
      <Hotkeys onHelp={() => router.push('/help')} onAbout={() => router.push('/about')} onChart={() => router.push('/')} />
      <header className="wb-title flex justify-between items-center gap-2 px-2">
        <span className="phosphor-glow font-bold truncate">
          Timewave Zero 2<span className="hidden sm:inline"> · Novelty Theory Workbench</span>
        </span>
        <nav className="flex shrink-0 items-center gap-2 sm:gap-3 whitespace-nowrap">
          {NAV.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={active ? 'underline font-bold' : 'opacity-70 hover:opacity-100'}
              >
                {n.label}
              </Link>
            );
          })}
          <span className="opacity-80"><ShareButton /></span>
        </nav>
      </header>
      <main className="flex-1 min-h-0 relative p-3 sm:p-4">{children}</main>
    </div>
  );
}
