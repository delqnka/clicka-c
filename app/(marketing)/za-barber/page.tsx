import type { Metadata } from 'next';
import { BarberPage } from '@/components/marketing/barber-page';

export const metadata: Metadata = {
  title: 'Сайт за барбър с онлайн записвания | clicka.bg',
  description:
    'Собствен сайт за твоя барбършоп с онлайн резервации, AI рецепционист и 0% комисионна. Онлайн записване за барбър, управление от Telegram. Готов веднага. От 0.82 € на ден.',
  alternates: {
    canonical: 'https://www.clicka.bg/za-barber',
  },
  openGraph: {
    title: 'Сайт за барбър с онлайн записвания | clicka.bg',
    description:
      'Собствен сайт за твоя барбършоп с онлайн резервации, AI рецепционист и 0% комисионна. Готов веднага.',
    url: 'https://www.clicka.bg/za-barber',
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
      'Сайт за барбър с онлайн резервации, AI рецепционист, Telegram управление и Stripe депозити. 0% комисионна.',
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
        name: 'Как клиентите ми се записват онлайн за барбър?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Получаваш собствен сайт с линк за резервации. Клиентите избират услуга, дата и час и се записват сами, без да звънят или пишат в Instagram. Ти получаваш известие в Telegram веднага.',
        },
      },
      {
        '@type': 'Question',
        name: 'Мога ли да управлявам графика на барбършопа от телефона?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Управляваш всичко от Telegram. Добавяш услуги, блокираш часове, преглеждаш резервации и качваш снимки директно от телефона си. Без компютър, без сложни панели.',
        },
      },
      {
        '@type': 'Question',
        name: 'Колко струва сайт за барбършоп с Clicka?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не предлагаме месечен абонамент. Плащаш еднократно за 6 или 12 месеца. Solo план: 299 € за 12 месеца (0.82 € на ден). Team план за до 3 специалисти: 499 € за 12 месеца. 0% комисионна върху резервациите.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да намалявам неявяванията в барбършопа?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Можеш да поискаш депозит при записването. Клиентите, платили депозит, се явяват значително по-редовно. Депозитите се приемат онлайн с карта чрез Stripe и постъпват директно при теб.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да събирам повече Google ревюта за барбършопа?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Сайтът изпраща автоматична покана за Google ревю след всяка завършена резервация. Не правиш нищо допълнително. Повече ревюта означава по-висока позиция при търсене на барбър в твоя град.',
        },
      },
      {
        '@type': 'Question',
        name: 'Трябва ли ми домейн за сайта на барбършопа?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не е задължително. Веднага получаваш безплатен адрес barber.clicka.bg и можеш да приемаш резервации веднага. Ако искаш собствен домейн като barbershop-ivan.bg, можеш да го свържеш безплатно или ние да го регистрираме вместо теб.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как работи AI рецепционистът за барбъри?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI рецепционистът отговаря на въпроси на клиентите и приема резервации 24/7, дори когато работиш или спиш. Работи директно в чата на сайта ти и те уведомява за всяка нова резервация в Telegram.',
        },
      },
      {
        '@type': 'Question',
        name: 'Трябва ли ми технически познания, за да управлявам сайта?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не. Всичко се управлява от Telegram. Качваш снимка, пишеш съобщение, блокираш час. Ако можеш да пишеш съобщение в телефона, можеш да управляваш сайта си.',
        },
      },
      {
        '@type': 'Question',
        name: 'Работи ли за барбершоп с повече специалисти?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Team планът поддържа до 3 специалисти. Всеки има собствен график и клиентите могат да запазват час при конкретен барбър.',
        },
      },
    ],
  },
];

export default function ZaBarberRoute() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <BarberPage />
    </>
  );
}
