import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHomeHeader } from '@/components/marketing/marketing-home-header';
import { MarketingHomePricingSection } from '@/components/marketing/marketing-home-pricing';
import { RevealObserver } from '@/components/marketing/reveal-observer';
import { MetaPixelViewContent } from '@/components/meta-pixel-view-content';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Цени | clicka.bg — Сайт за салони с онлайн резервации',
  description:
    'Solo от 0.82 € на ден, Team от 1.37 € на ден. Включени: сайт, AI рецепционист, онлайн резервации, хостинг, SSL и 0% комисионна. Без скрити такси.',
  alternates: {
    canonical: 'https://www.clicka.bg/pricing',
  },
  openGraph: {
    title: 'Цени | clicka.bg — Сайт за салони с онлайн резервации',
    description:
      'Solo от 0.82 € на ден, Team от 1.37 € на ден. Включени: сайт, AI рецепционист, онлайн резервации, хостинг, SSL и 0% комисионна.',
    url: 'https://www.clicka.bg/pricing',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Цени — clicka.bg',
  url: 'https://www.clicka.bg/pricing',
  description:
    'Планове и цени за платформата clicka.bg — собствен сайт за салони с онлайн записвания, AI рецепционист и 0% комисионна.',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Начало', item: 'https://www.clicka.bg' },
      { '@type': 'ListItem', position: 2, name: 'Цени', item: 'https://www.clicka.bg/pricing' },
    ],
  },
};

export default function PricingPage() {
  return (
    <div className="hp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MetaPixelViewContent />
      <RevealObserver />
      <MarketingHomeHeader />
      <main id="main-content" style={{ paddingTop: 72 }}>
        {/* Breadcrumb */}
        <nav
          aria-label="Навигационна следа"
          style={{ maxWidth: 1000, margin: '0 auto', padding: '16px clamp(20px,5vw,60px) 0', fontSize: 13, color: 'var(--muted-foreground)' }}
        >
          <Link href="/" style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}>
            Начало
          </Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>›</span>
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>Цени</span>
        </nav>

        <MarketingHomePricingSection />

        {/* Internal links */}
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            padding: '0 clamp(20px,5vw,60px) clamp(48px,8vw,80px)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 13,
          }}
        >
        </div>
      </main>
    </div>
  );
}
