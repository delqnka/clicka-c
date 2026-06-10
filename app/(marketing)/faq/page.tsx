import type { Metadata } from 'next';
import { FaqPage } from '@/components/marketing/faq-page';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Въпроси и отговори | clicka.bg — Сайт за салони с онлайн резервации',
  description:
    'Отговори на най-честите въпроси за clicka.bg — цени, онлайн резервации, управление от Telegram, домейн и специалисти.',
  alternates: {
    canonical: 'https://www.clicka.bg/faq',
  },
  openGraph: {
    title: 'Въпроси и отговори | clicka.bg',
    description:
      'Колко струва абонаментът? Как работят резервациите? Мога ли да свържа собствен домейн? Отговори на всички въпроси.',
    url: 'https://www.clicka.bg/faq',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Колко струва абонаментът?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Планът Solo е 299 € годишно (0.82 € на ден) — за един специалист. Планът Team е 499 € годишно (1.37 € на ден) и включва до 3 специалисти. И двата включват сайт, онлайн резервации, хостинг, SSL и AI рецепционист. 0% комисионна.',
      },
    },
    {
      '@type': 'Question',
      name: 'Получавам ли собствен сайт?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Веднага след регистрация твоят сайт е онлайн — с услугите ти, галерия, ценоразпис и онлайн резервации. Оптимизиран за Google, зарежда се светкавично на мобилни устройства.',
      },
    },
    {
      '@type': 'Question',
      name: 'Мога ли да свържа собствен домейн?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Веднага получаваш безплатен адрес tvoiatsalon.clicka.bg. Ако искаш собствен домейн, свързваш го безплатно и самостоятелно — инструкциите са в дашборда. Домейнът остава твоя собственост.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как работят онлайн резервациите?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Клиентът отваря сайта ти, избира услуга, специалист, дата и свободен час. Часът се блокира автоматично. Ти получаваш известие в Telegram веднага.',
      },
    },
    {
      '@type': 'Question',
      name: 'Получават ли клиентите потвърждение?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Клиентът получава имейл потвърждение веднага след записването и автоматично напомняне преди срещата. Всичко се изпраща в твое име.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как получавам известия за нови резервации?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Получаваш известие директно в Telegram веднага след всяка нова резервация — с имената на клиента, часа и услугата. Получаваш известие и при анулиране.',
      },
    },
    {
      '@type': 'Question',
      name: 'Мога ли да приемам депозити и онлайн плащания?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Сам решаваш дали да изискваш депозит и в какъв размер. Плащанията работят чрез Stripe — сумата постъпва директно в твоята сметка. Без посредник.',
      },
    },
    {
      '@type': 'Question',
      name: 'Има ли комисионна върху резервациите?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Не. 0% комисионна от приходите ти. Запазваш 100% от приходите си.',
      },
    },
    {
      '@type': 'Question',
      name: 'Плаща ли се всеки месец?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Не. Абонаментът е за 6 или 12 месеца и се плаща еднократно. Няма месечни такси и няма автоматично подновяване.',
      },
    },
    {
      '@type': 'Question',
      name: 'Колко специалисти мога да добавя?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Solo поддържа 1 специалист. Team поддържа до 3 специалисти с отделни графици, резервационни линкове и Telegram акаунти.',
      },
    },
    {
      '@type': 'Question',
      name: 'Трябва ли ми технически опит?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Не. Ако можеш да изпратиш съобщение в Telegram, можеш да управляваш сайта си. Хостинг, SSL, актуализации — всичко това е поето.',
      },
    },
  ],
};

export default function FaqRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqPage />
    </>
  );
}
