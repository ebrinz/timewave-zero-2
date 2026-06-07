import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { WorkbenchFrame } from '@/components/WorkbenchFrame';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

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
  icons: { apple: '/icons/apple-touch-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={vt323.variable}>
      <body>
        <WorkbenchFrame>{children}</WorkbenchFrame>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
