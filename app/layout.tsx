import type { Metadata, Viewport } from 'next';
import { Inter, Merriweather, Montserrat, Playfair_Display, Source_Code_Pro } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '700'],
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

export const viewport: Viewport = {
  themeColor: '#f9f9fa',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'clicka.bg — Собствен сайт с резервации за твоя салон',
  description:
    'Собствен сайт с онлайн резервации за твоя бранд, готов за по-малко от 15 минути. 0% комисионна.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="bg"
      className={`${inter.variable} ${merriweather.variable} ${montserrat.variable} ${playfair.variable} ${sourceCodePro.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
