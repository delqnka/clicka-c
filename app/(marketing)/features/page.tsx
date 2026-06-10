import type { Metadata } from 'next';
import { FeaturesPage } from '@/components/marketing/features-page';

export const metadata: Metadata = {
  title: 'Функции | Онлайн резервации, сайт и управление за салон | clicka.bg',
  description:
    'Всички функции на Clicka — онлайн резервации за салон, booking system, управление от Telegram, SEO оптимизация, собствен домейн и AI рецепционист. 0% комисионна.',
  alternates: {
    canonical: 'https://www.clicka.bg/features',
  },
  openGraph: {
    title: 'Функции | Онлайн резервации и сайт за салон | clicka.bg',
    description:
      'Онлайн резервации, booking system, управление от Telegram, SEO, домейн и AI рецепционист — всичко в един план. 0% комисионна.',
    url: 'https://www.clicka.bg/features',
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
      'Платформа за салони — собствен сайт с онлайн резервации, AI рецепционист, управление от Telegram и SEO оптимизация. 0% комисионна.',
    url: 'https://www.clicka.bg',
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
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Какво е онлайн резервационна система за салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Онлайн резервационната система позволява на клиентите ти да се записват за час директно от сайта ти, без да се налага да звънят. Те избират услуга, специалист, дата и час, а ти получаваш известие в Telegram веднага.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как работи booking системата на Clicka?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Клиентът отваря сайта ти, избира услуга и свободен час от твоя график, и потвърждава резервацията. Ти получаваш известие в Telegram и имейл. Часът се блокира автоматично — никой друг не може да го вземе.',
        },
      },
      {
        '@type': 'Question',
        name: 'Трябва ли ми технически умения за управление на сайта?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не. Управляваш всичко от Telegram — приложение, което вече ползваш. Добавяш услуги, снимки и часове с обикновено съобщение. Ако можеш да изпратиш текст в Telegram, можеш да управляваш сайта си.',
        },
      },
      {
        '@type': 'Question',
        name: 'Мога ли да имам собствен домейн за сайта на салона?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Веднага получаваш безплатен адрес tvoiatsalon.clicka.bg. Ако искаш собствен домейн (например mysalon.bg), можеш да го свържеш самостоятелно безплатно или ние да го регистрираме вместо теб срещу допълнително заплащане.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как Clicka помага за SEO на моя салон?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Сайтът постига 100/100 в Google Lighthouse. Генерира автоматичен sitemap, има коректни meta тагове и structured data. Можеш да публикуваш blog статии за дългосрочен SEO трафик. Свързваш Google Analytics и Facebook Pixel с едно кликване.',
        },
      },
      {
        '@type': 'Question',
        name: 'Как да намаля пропуснатите посещения в салона?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'С Clicka можеш да изискваш онлайн депозит при записването. Клиентите, платили депозит, се явяват в над 95% от случаите. Системата също изпраща автоматично напомняне по имейл 24 часа преди часа.',
        },
      },
      {
        '@type': 'Question',
        name: 'Работи ли Clicka за фризьор, маникюрист и козметик?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да. Clicka работи за всеки специалист, работещ с часове — фризьори, барбъри, козметици, маникюристи, масажисти, педикюристи, груумъри и всяко студио за красота.',
        },
      },
      {
        '@type': 'Question',
        name: 'Има ли комисионна върху резервациите в Clicka?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Не. Clicka не взима нито стотинка комисионна. Запазваш 100% от приходите си. Плащаш само годишния абонамент — от 299 € за 12 месеца (0.82 € на ден).',
        },
      },
    ],
  },
];

export default function FeaturesRoute() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <FeaturesPage />
    </>
  );
}
