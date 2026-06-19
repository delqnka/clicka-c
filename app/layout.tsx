import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { TrackingScripts } from '@/components/analytics/TrackingScripts';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import { isEngineOnlyMode } from '@/lib/engine-mode';
import './globals.base.css';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

const engineOnly = isEngineOnlyMode();

export const metadata: Metadata = engineOnly
  ? {
      title: 'Booking Engine',
      description: 'Private booking and administration engine.',
      robots: { index: false, follow: false },
    }
  : {
      metadataBase: new URL('https://clicka.bg'),
      title: 'clicka.bg | Собствен сайт с резервации за твоя салон',
      description:
        'Собствен сайт с онлайн резервации за твоя бранд, готов за по-малко от 15 минути. 0% комисионна.',
      openGraph: {
        title: 'clicka.bg | Собствен сайт с резервации за твоя салон',
        description: 'Готов за под 15 минути. 0% комисионна. От 0,82 € на ден.',
        url: 'https://clicka.bg',
        siteName: 'clicka.bg',
        locale: 'bg_BG',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'clicka.bg | Собствен сайт с резервации за твоя салон',
        description: 'Готов за под 15 минути. 0% комисионна. От 0,82 € на ден.',
      },
      other: {
        'impact-site-verification': '4885e315-7bef-4133-b3c5-fd82b1aa0c3f',
        'facebook-domain-verification': '1qdogbm0t61e2aujns3bt7rtpnlgqy',
      },
    };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://o4511518502289408.ingest.de.sentry.io" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <TrackingScripts />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
