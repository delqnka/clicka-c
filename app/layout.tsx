import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Rubik } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const rubik = Rubik({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
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
    <html lang="bg" className={`${playfair.variable} ${rubik.variable}`}>
      <body>{children}</body>
    </html>
  );
}
