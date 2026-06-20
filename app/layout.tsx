import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import { BRAND } from '@/lib/brand';
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

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: engineOnly ? 'Booking Engine' : 'Booking Platform',
  description: engineOnly
    ? 'Private booking and administration engine.'
    : 'Private booking platform and administration workspace.',
  robots: { index: false, follow: false },
};

/**
 * Extracts the Sentry ingest host from NEXT_PUBLIC_SENTRY_DSN so the preconnect
 * link works on any deploy (not just the canonical Clicka.bg Sentry project).
 * DSN format: https://<key>@<ingest_host>/<project_id> — we want <ingest_host>.
 */
function sentryIngestOrigin(): string | null {
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return null;
    const url = new URL(dsn);
    return `https://${url.hostname}`;
  } catch { return null; }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sentryOrigin = sentryIngestOrigin();
  return (
    <html lang="bg" suppressHydrationWarning>
      <head>
        {sentryOrigin && <link rel="preconnect" href={sentryOrigin} />}
      </head>
      <body suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
