import type { Metadata } from 'next';
import { FrizyorskiSalonPage } from '@/components/marketing/frizyorski-salon-page';

export const metadata: Metadata = {
  title: 'Сайт за фризьорски салон с онлайн записвания | clicka.bg',
  description:
    'Собствен сайт за твоя фризьорски салон с онлайн резервации, AI рецепционист и 0% комисионна. Готов за 15 минути. От 0.82 € на ден.',
  alternates: {
    canonical: 'https://clicka.bg/za-frizyorski-salon',
  },
  openGraph: {
    title: 'Сайт за фризьорски салон с онлайн записвания | clicka.bg',
    description:
      'Собствен сайт за твоя фризьорски салон с онлайн резервации, AI рецепционист и 0% комисионна. Готов за 15 минути.',
    url: 'https://clicka.bg/za-frizyorski-salon',
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
      'Платформа за фризьорски салони — собствен сайт с онлайн записвания, AI рецепционист и Stripe депозити. 0% комисионна.',
    url: 'https://clicka.bg',
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
        name: 'Как клиентите ми се записват онлайн за фризьор?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Получаваш собствен сайт с линк за резервации. Клиентите избират услуга, дата и час и се записват сами, без да се обаждат. Ти получаваш известие в Telegram веднага.',
        },
      },
      {
        '@type': 'Question',
        name: 'Мога ли да управлявам графика на фризьорски салон от телефона?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Управляваш всичко от Telegram — добавяш услуги, блокираш часове, преглеждаш резервации и качваш снимки директно от телефона си.',
        },
      },
      {
        '@type': 'Question',
        name: 'Колко струва сайт за фризьорски салон с Clicka?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'От 299 € за 12 месеца (0.82 € на ден). Включени са хостинг, SSL, AI рецепционист, онлайн резервации и техническа поддръжка. 0% комисионна върху резервациите.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да намалявам неявяванията в моя фризьорски салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'С Clicka можеш да поискаш депозит при записването. Клиентите, платили депозит, се явяват в 95% от случаите. Депозитите се приемат онлайн с карта чрез Stripe и постъпват директно при теб.',
        },
      },
      {
        '@type': 'Question',
        name: 'Работи ли Clicka за барбършоп?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Clicka работи за всеки специалист, работещ с часове — фризьори, барбъри, козметици, маникюристи и други.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да събирам повече Google ревюта за фризьорски салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Clicka изпраща автоматична покана за Google ревю след всяка завършена резервация. Повече ревюта означава по-висока позиция при търсене на "фризьор" в Google.',
        },
      },
      {
        '@type': 'Question',
        name: 'Трябва ли ми домейн за сайта на фризьорския ми салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не е задължително. Веднага получаваш безплатен адрес tvoiatsalon.clicka.bg. Ако искаш собствен домейн (например salonmaria.bg), можеш да го свържеш безплатно или ние да го регистрираме вместо теб.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как работи AI рецепционистът за фризьорски салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI рецепционистът отговаря на въпроси на клиентите и приема резервации 24/7 — дори когато ти си зает или спиш. Работи директно в чата на сайта ти.',
        },
      },
    ],
  },
];

export default function ZaFrizyorskiSalonRoute() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <FrizyorskiSalonPage />
    </>
  );
}
