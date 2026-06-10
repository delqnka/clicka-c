import type { Metadata } from 'next';
import { ManikyuristPage } from '@/components/marketing/manikyurist-page';

export const metadata: Metadata = {
  title: 'Сайт за маникюрист с онлайн записвания | clicka.bg',
  description:
    'Собствен сайт за маникюрист с онлайн резервации за гел лак, ноктопластика и дизайн. AI асистент, Telegram управление и 0% комисионна. Готов веднага. От 0.82 € на ден.',
  alternates: {
    canonical: 'https://www.clicka.bg/za-manikyurist',
  },
  openGraph: {
    title: 'Сайт за маникюрист с онлайн записвания | clicka.bg',
    description:
      'Собствен сайт за маникюрист с онлайн резервации, AI асистент и 0% комисионна. Готов за 15 минути.',
    url: 'https://www.clicka.bg/za-manikyurist',
    type: 'website',
  },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'clicka.bg',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Сайт за маникюрист с онлайн записвания — гел лак, ноктопластика, дизайн. AI асистент, Telegram управление и Stripe депозити. 0% комисионна.',
    url: 'https://www.clicka.bg',
    offers: {
      '@type': 'Offer',
      price: '299',
      priceCurrency: 'EUR',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Как клиентките ми се записват онлайн за маникюр?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Получаваш собствен сайт с линк за резервации. Клиентките избират услуга, дата и час и се записват сами, без да пишат в Instagram или да звънят. Ти получаваш известие в Telegram веднага.',
        },
      },
      {
        '@type': 'Question',
        name: 'Мога ли да управлявам графика си от телефона?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Управляваш всичко от Telegram — добавяш услуги, блокираш часове, преглеждаш резервациите и качваш снимки на нови дизайни директно от телефона си.',
        },
      },
      {
        '@type': 'Question',
        name: 'Колко струва сайт за маникюрист с Clicka?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'От 299 € за 12 месеца (0.82 € на ден). Включени са хостинг, SSL, AI асистент, онлайн резервации и техническа поддръжка. 0% комисионна върху резервациите.',
        },
      },
      {
        '@type': 'Question',
        name: 'Мога ли да приемам депозит онлайн за маникюр?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да, депозитите се приемат онлайн чрез Stripe и постъпват директно при теб. Ние не вземаме комисионна от тези транзакции.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да събирам повече Google ревюта за маникюрно студио?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Сайтът изпраща автоматична покана за Google ревю след всяка завършена резервация. Повече ревюта означава по-висока позиция при търсене на "маникюрист" в Google.',
        },
      },
      {
        '@type': 'Question',
        name: 'Трябва ли ми технически познания, за да управлявам сайта?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не. Всичко се управлява от Telegram. Ако можеш да пишеш съобщение в телефона, можеш да управляваш сайта си.',
        },
      },
    ],
  },
];

export default function ZaManikyuristRoute() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ManikyuristPage />
    </>
  );
}
