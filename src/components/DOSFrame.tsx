'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Hotkeys } from './Hotkeys';
import { ShareButton } from './ShareButton';

const NAV = [
  { href: '/', label: 'CHART' },
  { href: '/help', label: 'HELP' },
  { href: '/about', label: 'ABOUT' },
];

export function DOSFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="flex flex-col h-screen">
      <Hotkeys onHelp={() => router.push('/help')} onAbout={() => router.push('/about')} onChart={() => router.push('/')} />
      <header className="flex justify-between items-center px-2 h-8 border-b border-[#163] text-sm phosphor-glow">
        <span>TIMEWAVE ZERO 2 · NOVELTY THEORY ENGINE</span>
        <nav className="flex gap-2">
          {NAV.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={active ? 'text-[#7fff9e]' : 'text-[var(--tw-dim)]'}>
                [{n.label}]
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 min-h-0 relative">{children}</main>
      <footer className="flex gap-3 items-center px-2 h-6 border-t border-[#163] text-xs text-[var(--tw-dim)]">
        <span>[H] HELP</span>
        <span className="ml-auto"><ShareButton /></span>
      </footer>
    </div>
  );
}
