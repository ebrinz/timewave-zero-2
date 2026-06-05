import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { WorkbenchFrame } from '@/components/WorkbenchFrame';

const vt323 = localFont({
  src: '../../public/fonts/VT323.ttf',
  variable: '--font-vt323',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.github.io/timewave-zero-2/'),
  title: 'TIMEWAVE ZERO 2',
  description: 'A DOS-homage reboot of McKenna & Meyer’s Timewave Zero (Sheliak TW1 novelty wave).',
  openGraph: {
    title: 'TIMEWAVE ZERO 2',
    description: 'Explore the Sheliak timewave — McKenna’s novelty theory as an interactive DOS-style chart.',
    images: ['/og/chart.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={vt323.variable}>
      <body>
        <WorkbenchFrame>{children}</WorkbenchFrame>
      </body>
    </html>
  );
}
