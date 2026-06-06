import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter, Manrope, Merriweather, Montserrat, Playfair_Display, Source_Code_Pro } from 'next/font/google';
import { isSalonPublicRequest } from '@/lib/salon-public-request';
import './globals.base.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '700', '800'],
});

const merriweather = Merriweather({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '700'],
});

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-marketing-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-marketing-serif',
  display: 'swap',
  weight: ['400', '700'],
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-marketing-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-client-manrope',
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  preload: true,
  adjustFontFallback: true,
});

const marketingFontVariables = [
  inter.variable,
  merriweather.variable,
  montserrat.variable,
  playfair.variable,
  sourceCodePro.variable,
  manrope.variable,
].join(' ');

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
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
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const salonPublic = isSalonPublicRequest(headers());
  const htmlClass = salonPublic ? manrope.variable : marketingFontVariables;

  return (
    <html lang="bg" className={htmlClass} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
