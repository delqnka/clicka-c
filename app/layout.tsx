import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Clicka.bg — Твоят личен 24/7 рецепционист',
  description: 'Готов сайт с резервационна система за твоя салон. Клиентите са си само твои. Без комисионна.',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
