import type { Metadata } from 'next';
import { AiReceptionistPage } from '@/components/marketing/ai-receptionist-page';

export const metadata: Metadata = {
  title: 'AI Рецепционист за салон | Отговаря 24/7 и записва часове | clicka.bg',
  description:
    'AI рецепционист за твоя салон — отговаря на въпроси за цени, часове и услуги, и записва клиенти автоматично. Включен в сайта на Clicka. 0% комисионна.',
  alternates: {
    canonical: 'https://www.clicka.bg/ai-receptionist',
  },
  openGraph: {
    title: 'AI Рецепционист за салон | clicka.bg',
    description:
      'Докато работиш с клиент, AI рецепционистът отговаря на въпроси и насочва към резервация 24/7. Включен в сайта на Clicka.',
    url: 'https://www.clicka.bg/ai-receptionist',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI Рецепционист — clicka.bg',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI рецепционист за салони — отговаря на въпроси за цени, услуги и свободни часове, и записва клиенти автоматично 24/7.',
  url: 'https://www.clicka.bg/ai-receptionist',
  offers: {
    '@type': 'Offer',
    price: '299',
    priceCurrency: 'EUR',
    description: 'Включено в годишния план на Clicka',
  },
};

export default function AiReceptionistRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AiReceptionistPage />
    </>
  );
}
