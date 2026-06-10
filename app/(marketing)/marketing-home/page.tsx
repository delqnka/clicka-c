import type { Metadata } from 'next';
import MarketingHomePage from '@/app/components/HomePage';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';
import { getMarketingActivity } from '@/lib/marketing-activity';
import { MetaPixelViewContent } from '@/components/meta-pixel-view-content';

export const revalidate = 60;

export const metadata: Metadata = {
  title: clickaMarketingSite.title,
  description: clickaMarketingSite.description,
  alternates: {
    canonical: 'https://www.clicka.bg/',
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'clicka.bg',
    url: 'https://www.clicka.bg/',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '„Буука" ЕООД',
    alternateName: 'Clicka',
    url: 'https://www.clicka.bg/',
    logo: 'https://www.clicka.bg/clicka-logo.png',
    sameAs: [
      'https://www.facebook.com/clickabg',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'clicka.bg',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Платформа за салони за красота — собствен сайт с онлайн резервации, AI рецепционист, управление от Telegram и SEO оптимизация. 0% комисионна.',
    url: 'https://www.clicka.bg/',
    featureList: [
      'Онлайн резервации 24/7',
      'Booking system за салон',
      'Управление от Telegram',
      'AI рецепционист',
      'Собствен домейн',
      'SEO оптимизация 100/100',
      'Галерия с резултати',
      'Услуги и ценоразпис',
      'Напомняния за часове',
      'Google ревюта',
      'Онлайн плащания и депозити',
    ],
    offers: {
      '@type': 'Offer',
      price: '299',
      priceCurrency: 'EUR',
    },
  },
];

export default async function MarketingHomeRoute() {
  const activity = await getMarketingActivity();
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <MetaPixelViewContent />
      <MarketingHomePage activity={activity} />
    </>
  );
}
