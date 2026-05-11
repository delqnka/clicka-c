import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#7c3aed',
};

export const metadata: Metadata = {
  title: 'clicka.bg — Твоята лична резервационна система, независима от платформи',
  description:
    'Собствен сайт и онлайн резервации: часовете и клиентите са твои — без комисионна върху всеки час и без да зависиш от чужди платформи.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
