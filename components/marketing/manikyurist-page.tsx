'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { MarketingHomeHeader } from '@/components/marketing/marketing-home-header';
import { formatDualEurText } from '@/lib/salon-currency';

import { PriceListImportSection } from '@/components/marketing/marketing-home-sections';
import { TelegramManagementSection } from '@/components/marketing/marketing-home-sections';
import { TelegramChatSection } from '@/components/marketing/marketing-home-sections';
import { MarketingFeaturesSection } from '@/components/marketing/marketing-home-sections';
import { IPhoneFrame } from '@/components/marketing/marketing-home-sections';

const MarketingHomePricingSection = dynamic(
  () => import('@/components/marketing/marketing-home-pricing').then((m) => ({ default: m.MarketingHomePricingSection })),
);
const IPhoneMockup = dynamic(
  () => import('@/components/ui/iphone-mockup').then((m) => ({ default: m.IPhoneMockup })),
  { ssr: false },
);

const G = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

function CheckIcon({ id }: { id: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e11d48" /><stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M20 6L9 17l-5-5" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      aria-labelledby="mn-h1"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 55%, #fff 100%)',
        padding: 'clamp(96px,14vw,140px) clamp(20px,5vw,60px) clamp(56px,9vw,96px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 16 }}>
          За маникюристи
        </p>
        <h1
          id="mn-h1"
          style={{ fontSize: 'clamp(28px,5.5vw,52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20, color: '#0f0f0f' }}
        >
          Сайт за маникюрист<br />
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            с онлайн записвания
          </span>
        </h1>
        <p style={{ fontSize: 'clamp(18px,2.5vw,22px)', color: '#555', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 36px' }}>
          Клиентките си резервират сами. Ти работиш спокойно.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <ButtonColorful href="/create" label="Създай сайта си" className="h-12 rounded-full px-8 text-[15px] font-bold w-full max-w-[280px]" />
          <Link
            href="/demo"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 40, padding: '0 24px', borderRadius: 9999,
              border: '1.5px solid transparent',
              backgroundImage: `linear-gradient(#fff, #fff), ${G}`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              fontSize: 13, fontWeight: 600,
              backgroundSize: '100%',
              textDecoration: 'none',
              color: '#db2777',
            }}
          >
            Виж готов сайт
          </Link>
          <p style={{ fontSize: 13, fontWeight: 700, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: 4 }}>
            от {formatDualEurText('0.82')} на ден · 0% комисионна · Готов веднага
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Real example ───────────────────────────────────────── */

function RealExample() {
  return (
    <section
      aria-label="Реален пример"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fff1f2 50%, #fff 100%)',
        padding: 'clamp(64px,11vw,110px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
            Виж реален пример
          </p>
          <p style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 800, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', maxWidth: 500, margin: '0 auto', lineHeight: 1.2 }}>
            Това не е профил в платформа. Това е собствен сайт за твоя бизнес.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 'min(52vw, 200px)' }}>
          <IPhoneMockup
            poster="/vid1-poster.webp"
            mp4Src="/video-clicka.mov"
            playbackRate={2}
              showPlayButton
            blurQuickType
            blurTimeRange={[44, 57]}
          />
        </div>

        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 'clamp(16px,2.2vw,20px)', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.3, marginBottom: 12 }}>
            Когато клиентката отвори сайта ти,<br />
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              вижда само теб.
            </span>
          </p>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#555', lineHeight: 1.65, margin: 0 }}>
            Не вижда десетки други маникюристи.<br />
            Не избира между конкуренти.<br />
            <strong style={{ color: '#0f0f0f' }}>Вижда твоите услуги, твоите цени, твоите снимки.</strong>
          </p>
        </div>

        <a
          href="https://salonurban.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 8px 5px 12px', borderRadius: 9999,
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg,#e11d48,#a855f7) border-box',
            border: '1px solid transparent', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 300, color: '#999', letterSpacing: '0.02em' }}>salonurban.online</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
            borderRadius: 9999, backgroundImage: G, color: '#fff', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            Отвори
          </span>
        </a>
      </div>
    </section>
  );
}

/* ── New client via Telegram ────────────────────────────── */

function NewClientSection() {
  return (
    <section
      aria-labelledby="mn-newclient-h"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
            Нова резервация
          </p>
          <h2
            id="mn-newclient-h"
            style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Нова клиентка.<br />Записана. Платила депозит.<br />В графика ти.
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#555', maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>
            Докато работиш по процедура, системата приема следващата резервация сама. Получаваш известие в Telegram — и продължаваш да работиш.
          </p>
          <p style={{ fontSize: 'clamp(18px,3vw,28px)', fontWeight: 900, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '20px auto 0', letterSpacing: '0.08em' }}>
            ИЛИ
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {[
            { src: '/IMG_1944.jpg', label: 'Добавяш услуга в Telegram', caption: 'Добавяш нова услуга директно от телефона си — без админ панели и сложности', fullRadius: false },
            { src: '/IMG_1950.webp', label: 'Новата клиентка вече е в базата', caption: 'Профилът се създава автоматично и моментално', fullRadius: true },
            { src: '/IMG_1948.jpg', label: 'Резервацията вече е в графика ти', caption: 'Часът влиза в календара ти веднага', fullRadius: true, imgPosition: '20% top' },
          ].map((item, i, arr) => (
            <div key={item.src} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <IPhoneFrame src={item.src} alt={item.label} size="md" fullRadius={item.fullRadius} imgPosition={(item as { imgPosition?: string }).imgPosition} />
                <p style={{ fontSize: 11, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>{item.caption}</p>
              </div>
              {i < arr.length - 1 && (
                <svg width="32" height="40" viewBox="0 0 32 40" fill="none" style={{ margin: '20px 0' }}>
                  <defs>
                    <linearGradient id={`arr-grad-${i}`} x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#e11d48" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <path d="M16 2 L16 30 M6 20 L16 32 L26 20" stroke={`url(#arr-grad-${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Telegram bridge ────────────────────────────────────── */

function TelegramBridgeSection() {
  return (
    <section
      aria-labelledby="mn-telegram-h"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px) clamp(20px,4vw,40px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
          Управление на маникюрно студио
        </p>
        <h2
          id="mn-telegram-h"
          style={{ fontSize: 'clamp(24px,4.5vw,42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Управляваш всичко от Telegram.<br />Без нов софтуер.
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 28px' }}>
          Не се налага да учиш нов панел. Всичко се случва в Telegram — точно там, където вече прекарваш времето си.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
          {[
            '📲 Клиентка се записва за гел лак — веднага знаеш',
            '📲 Качваш снимка на нов дизайн — влиза в галерията',
            '📲 Блокираш час за почивка — готово',
            '📲 Клиентка пита дали има свободен час — AI отговаря',
            '📲 Виждаш графика и списъка с клиенти по всяко време',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#0f0f0f', lineHeight: 1.55, fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Lost clients (manicure-specific) ───────────────────── */

function LostClientsSection() {
  return (
    <section
      aria-labelledby="mn-lost-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Реалността
        </p>
        <h2
          id="mn-lost-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 28, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Защо маникюристите губят клиентки<br />без онлайн записване
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              title: 'Клиентката иска час в 22:00',
              body: 'Повечето резервации не се случват през работно време. Клиентката приключва работа, ляга на дивана и започва да търси маникюрист за следващата седмица. Ако може да запази час веднага — записва се. Ако трябва да чака отговор в Instagram или Messenger — продължава към следващото студио.',
            },
            {
              title: 'Instagram не е система за резервации',
              body: 'Съобщенията се губят. Часовете се записват ръчно в тефтер или в телефона. Лесно стават обърквания и двойни записвания. Колкото повече клиентки имаш, толкова повече хаос — и толкова повече нерви по средата на процедура.',
            },
            {
              title: 'Всеки незает час е изгубен завинаги',
              body: 'За разлика от продукт, твоето работно време не може да се "продаде утре". Един незает час е загуба, която не може да бъде върната. Онлайн записването помага графикът ти да се запълва по-бързо, включително с нови клиентки, които те намират в Google.',
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 16, background: '#fdf2f8', border: '1.5px solid #f0e6f6' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <ButtonColorful href="/create" label="Спри да губиш клиентки →" className="h-12 rounded-full px-8 text-[15px] font-bold" />
        </div>
      </div>
    </section>
  );
}

/* ── Instagram → Bookings (unique section) ──────────────── */

function InstagramToBookingsSection() {
  return (
    <section
      aria-labelledby="mn-insta-h"
      style={{ background: 'linear-gradient(180deg, #fff1f2 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Instagram + Сайт
        </p>
        <h2
          id="mn-insta-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 16, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Как да превърнеш Instagram последователките в реални резервации
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 28, lineHeight: 1.65, maxWidth: 520 }}>
          Instagram привлича вниманието. Сайтът превръща вниманието в резервация. Двете работят заедно.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              step: '01',
              title: 'Линк в биото',
              body: 'Сложи линка към сайта си в Instagram биото. Клиентката вижда красив дизайн → кликва → записва се директно. Без Messenger, без чакане.',
            },
            {
              step: '02',
              title: 'Story с линк за записване',
              body: 'Качи нова снимка на дизайн в Story и добави линк към страницата за записване. Клиентките, вдъхновени от дизайна, могат да запазят час веднага.',
            },
            {
              step: '03',
              title: 'Реклама → директна резервация',
              body: 'Когато пускаш реклама в Instagram или Facebook, насочи я към сайта си. Meta Pixel, вграден в сайта, проследява резервациите и оптимизира рекламата автоматично.',
            },
            {
              step: '04',
              title: 'Google ревюта + Instagram = двойно доверие',
              body: 'Показвай Google ревютата си в сайта. Клиентките, дошли от Instagram, виждат реални отзиви — и са много по-склонни да запазят час.',
            },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 16, background: '#fff', border: '1.5px solid #f0e6f6' }}>
              <span style={{ fontSize: 24, fontWeight: 900, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0, lineHeight: 1 }}>{item.step}</span>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f', marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Own site vs platform ───────────────────────────────── */

const PLATFORM_ROWS = [
  { label: 'Виждат ли клиентките конкурентите ти?', platform: 'Да — до теб', clicka: 'Не — само ти' },
  { label: 'Комисионна от резервациите', platform: '30–50% от всяка', clicka: '0%' },
  { label: 'Собствен домейн и бранд', platform: 'Не', clicka: 'Да' },
  { label: 'Google SEO за твоя бизнес', platform: 'Не', clicka: 'Да' },
  { label: 'Контрол над клиентските данни', platform: 'Не', clicka: 'Да' },
  { label: 'Meta Pixel за реклами', platform: 'Не', clicka: 'Да' },
] as const;

function VsPlatformSection() {
  return (
    <section
      aria-labelledby="mn-vs-h"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Сравнение
        </p>
        <h2
          id="mn-vs-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Защо собствен сайт е по-добър<br />от платформа за резервации
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 32, maxWidth: 520, lineHeight: 1.6 }}>
          В платформа за резервации клиентката вижда десетки маникюристи наведнъж и ти плащаш комисионна за всяка резервация. С Clicka изграждаш собствен бранд и собствена клиентска база.
        </p>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #f0e6f6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#0f0f0f', padding: '12px 16px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Критерий</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Платформа</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clicka</span>
          </div>
          {PLATFORM_ROWS.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                padding: '14px 16px',
                background: i % 2 === 0 ? '#fff' : '#fdf8ff',
                borderTop: '1px solid #f0e6f6',
                alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: '#444', lineHeight: 1.4 }}>{row.label}</span>
              <span style={{ fontSize: 13, color: '#e11d48', fontWeight: 600, textAlign: 'center' }}>{row.platform}</span>
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, textAlign: 'center' }}>{row.clicka}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── iPhone demo section ────────────────────────────────── */

function IPhoneDemoSection() {
  return (
    <section
      aria-label="Клиентски сайт"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fff1f2 50%, #fff 100%)',
        padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
          >
            Ето какво виждат клиентките ти
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
            Професионален сайт, който приема резервации{' '}
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              24/7
            </span>
            {' '}— дори докато правиш маникюр на следващата клиентка.
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: 'min(52vw, 200px)' }}>
          <IPhoneMockup
            poster="/vid1-poster.webp"
            mp4Src="/video-clicka.mov"
            playbackRate={2}
              showPlayButton
            blurQuickType
            blurTimeRange={[44, 57]}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Deposits ───────────────────────────────────────────── */

function DepositsSection() {
  return (
    <section
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
      aria-label="Онлайн плащания"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#635BFF', letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>stripe</span>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#635BFF', margin: 0 }}>интеграция</p>
        </div>
        <h2
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 14, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
        >
          Приемай депозити за всяка процедура
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
          Клиентката плаща депозит при записването. Парите постъпват директно при теб чрез Stripe. Клиентките, платили депозит, се явяват — неявяванията падат драстично.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Намалява неявяванията почти до нула',
            'Приемай плащания с карта онлайн',
            'Парите отиват директно при теб',
            '0% комисионна от Clicka',
            'Работи за гел лак, ноктопластика, дизайн и всяка друга процедура',
          ].map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckIcon id={`dep-mn-${i}`} />
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Google reviews ─────────────────────────────────────── */

function GoogleReviewsSection() {
  return (
    <section
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
      aria-labelledby="mn-reviews-h"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Автоматично след всяка процедура
        </p>
        <h2
          id="mn-reviews-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 16, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
        >
          Събирай повече Google ревюта
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 32 }}>
          След всяка завършена резервация клиентката получава автоматична покана да остави ревю в Google.
          Повече ревюта = по-висока позиция при търсене на &ldquo;маникюрист&rdquo; в твоя град.
        </p>

        <div style={{ background: '#0f0f0f', borderRadius: 16, padding: '24px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Хората търсят маникюрист така:
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            Когато някой търси:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {['маникюр варна', 'гел лак лозенец', 'маникюрист бургас', 'ноктопластика пловдив'].map((q) => (
              <span key={q} style={{ fontSize: 13, color: '#e879f9', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{q}</span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>Google показва:</p>
          {['⭐ рейтинг', '💬 брой ревюта', '📍 позиция в картата'].map((item) => (
            <p key={item} style={{ fontSize: 13, color: '#e2e8f0', margin: '0 0 6px' }}>{item}</p>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.8 }}>
              Повече ревюта<br />= Повече доверие<br />= Повече нови клиентки
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Nail services SEO section ──────────────────────────── */

function NailServicesSection() {
  return (
    <section
      aria-labelledby="mn-services-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          За всяка процедура
        </p>
        <h2
          id="mn-services-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 16, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Гел лак, ноктопластика и дизайн на нокти — всичко с онлайн записване
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 32, lineHeight: 1.65 }}>
          Без значение дали предлагаш класически маникюр, гел лак, ноктопластика с акрил или гел, или сложни дизайни — всяка услуга може да се резервира онлайн, с точно определено времетраене и цена.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'clamp(8px,1.5vw,12px)' }}>
          {[
            { icon: '💅', title: 'Гел лак', body: 'Клиентките запазват час за гел лак онлайн — избират продължителност и виждат цената предварително.' },
            { icon: '✨', title: 'Ноктопластика', body: 'Акрил, гел или комбинирана техника — всяка услуга влиза в менюто с точна цена и времетраене.' },
            { icon: '🎨', title: 'Дизайн на нокти', body: 'Показвай портфолиото си директно в сайта. Клиентките избират дизайн и резервират веднага.' },
            { icon: '🧴', title: 'Педикюр', body: 'Комбинирай маникюр и педикюр в едно записване. Системата блокира правилното времетраене автоматично.' },
            { icon: '💆', title: 'SPA маникюр', body: 'По-дълги процедури с грижа за ръцете — задай правилното времетраене и клиентките знаят кога да дойдат.' },
            { icon: '🌸', title: 'Сваляне и поддръжка', body: 'Добави сваляне на гел лак или ноктопластика като отделна услуга с точна цена.' },
          ].map((item) => (
            <div key={item.title} style={{ padding: '14px 14px', borderRadius: 14, background: '#fff', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.07)' }}>
              <span style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>{item.icon}</span>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', marginBottom: 4 }}>{item.title}</h3>
              <p style={{ fontSize: 11, color: '#777', lineHeight: 1.55, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Local SEO ──────────────────────────────────────────── */

const LOCAL_SEO_ITEMS = [
  { icon: '📍', title: 'Google Business Profile', body: 'Сайтът ти се свързва с Google Business — клиентките те намират в картата и в търсенето едновременно.' },
  { icon: '⭐', title: 'Автоматични Google ревюта', body: 'Повече ревюта = по-висока позиция при търсене на "маникюрист" в твоя район. Системата работи автоматично след всяка процедура.' },
  { icon: '🔍', title: 'NailSalon структурирани данни', body: 'Сайтът използва schema.org тип NailSalon — Google разпознава твоя бизнес правилно и го показва по-добре.' },
  { icon: '🌐', title: 'Собствен домейн', body: 'Собственият домейн гради SEO авторитет с времето. Той е твой — не на чужда платформа.' },
  { icon: '📝', title: 'Блог за твоя бизнес', body: 'Публикувай статии за грижа за ноктите, нови дизайни и съвети. Всяка публикация е нов шанс да те намерят.' },
  { icon: '⚡', title: 'Lighthouse 100/100', body: 'Технически перфектен сайт. Бърза скорост, правилни мета тагове и структура — без да правиш нищо.' },
] as const;

function LocalSeoSection() {
  return (
    <section
      aria-labelledby="mn-seo-h"
      style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ maxWidth: 600, marginBottom: 'clamp(36px,6vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Локално SEO
          </p>
          <h2
            id="mn-seo-h"
            style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Как нови клиентки ще те намират в Google
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', lineHeight: 1.6 }}>
            Clicka прави повече от красив сайт — помага ти да се показваш, когато хора търсят &ldquo;маникюрист&rdquo;, &ldquo;гел лак&rdquo; или &ldquo;ноктопластика&rdquo; в твоя квартал или град.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'clamp(12px,2vw,20px)' }}>
          {LOCAL_SEO_ITEMS.map((item) => (
            <div key={item.title} style={{ padding: '22px 20px', borderRadius: 16, background: '#fff', border: '1.5px solid #f0e6f6' }}>
              <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{item.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f', marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing context ────────────────────────────────────── */

function PricingContextSection() {
  return (
    <section
      id="цени"
      aria-labelledby="mn-price-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Ценова справка
        </p>
        <h2
          id="mn-price-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Колко струва сайт за маникюрист
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 36, maxWidth: 520, lineHeight: 1.6 }}>
          Три варианта за онлайн присъствие. Ето какво получаваш и какво плащаш.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          <div style={{ padding: '20px 24px', borderRadius: 16, border: '1.5px solid #eee', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Уеб агенция</h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>от 600 €</span>
            </div>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
              Еднократна разработка + месечна поддръжка. Онлайн резервации обикновено не са включени — изискват отделна интеграция. Времето за изработка: 4–12 седмици.
            </p>
          </div>
          <div style={{ padding: '20px 24px', borderRadius: 16, border: '1.5px solid #eee', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Платформа за резервации</h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>30–50% комисионна</span>
            </div>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
              При 50 резервации/месец × средна цена 80 € = 1 200 – 2 000 € комисионна на месец.
              За 12 месеца: 14 400 – 24 000 €. Без собствен домейн, без SEO за твоя личен бранд.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: 'Как клиентките ми се записват онлайн за маникюр?',
    a: 'Получаваш собствен сайт с линк за резервации. Клиентките избират услуга (гел лак, ноктопластика, дизайн и др.), дата и час — и се записват сами, без да пишат в Instagram или да звънят. Ти получаваш известие в Telegram веднага.',
  },
  {
    q: 'Мога ли да управлявам графика си от телефона?',
    a: 'Да. Управляваш всичко от Telegram — добавяш услуги, блокираш часове, преглеждаш резервациите и качваш снимки на нови дизайни директно от телефона си. Без компютър, без сложни панели.',
  },
  {
    q: 'Правите ли сайтове и за козметик или студио за нокти?',
    a: 'Да. Правим сайтове за всеки, който работи с часове — маникюристи, педикюристи, козметици, барбъри, масажисти. Ако записваш клиентки за час, това е точният продукт за теб.',
  },
  {
    q: 'Как да намалявам неявяванията?',
    a: 'С този сайт можеш да поискаш депозит при записването. Клиентките, платили депозит, се явяват. Депозитите се приемат онлайн с карта чрез Stripe и постъпват директно при теб.',
  },
  {
    q: 'Мога ли да приемам депозит онлайн?',
    a: 'Да, депозитите се приемат онлайн чрез Stripe и постъпват директно при теб. Ние не вземаме комисионна от тези транзакции!',
  },
  {
    q: 'Мога ли да добавя различни видове маникюр и педикюр като отделни услуги?',
    a: 'Да. Всяка услуга влиза с отделна цена и времетраене. Гел лак, ноктопластика, класически маникюр, педикюр, дизайн, сваляне — всичко може да се резервира отделно или в комбинация.',
  },
  {
    q: 'Как да събирам повече Google ревюта?',
    a: 'Сайтът изпраща автоматична покана за Google ревю след всяка завършена резервация. Не правиш нищо — системата работи сама. Повече ревюта = по-висока позиция при търсене на "маникюрист" в твоя град.',
  },
  {
    q: 'Колко струва сайт от clicka.bg?',
    a: 'Не предлагаме месечен абонамент. Плащаш еднократно за 6 или 12 месеца. Solo: 299 € за 12 месеца (0.82 € на ден). Team (до 3 специалисти): 499 € за 12 месеца. 0% комисионна върху резервациите.',
  },
  {
    q: 'Трябва ли ми технически познания, за да управлявам сайта?',
    a: 'Не. Всичко се управлява от Telegram — точно като нормален чат. Качваш снимка, пишеш съобщение, блокираш час. Не се изисква компютър, не се изисква опит. Ако можеш да пишеш съобщение в телефона, можеш да управляваш сайта си.',
  },
  {
    q: 'Трябва ли ми домейн за сайта?',
    a: 'Не е задължително. Веднага получаваш адрес tvoiasalon.clicka.bg и можеш да приемаш резервации веднага. Ако искаш собствен домейн (например nailsbymaria.bg), можеш да го свържеш безплатно или ние да го регистрираме вместо теб.',
  },
  {
    q: 'Как работи AI асистентът за маникюрист?',
    a: 'AI асистентът отговаря на въпроси на клиентките и приема резервации 24/7 — дори когато работиш по процедура или спиш. Работи в чата на сайта ти и те уведомява за всяка нова резервация в Telegram.',
  },
] as const;

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section
      id="faq"
      aria-labelledby="mn-faq-h"
      style={{ background: '#fdf2f8', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>FAQ</p>
        <h2
          id="mn-faq-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.12, marginBottom: 40, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Чести въпроси за маникюристи
        </h2>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid #f0e0f0' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 0', gap: 16, textAlign: 'left',
              }}
              aria-expanded={open === i}
            >
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.4 }}>{item.q}</span>
              <span style={{ fontSize: 18, color: '#db2777', flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
            </button>
            {open === i && (
              <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#555', lineHeight: 1.7, paddingBottom: 20, margin: 0 }}>
                {item.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Final CTA ──────────────────────────────────────────── */

function FinalCta() {
  return (
    <section
      aria-labelledby="mn-cta-h"
      style={{
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a 30%, #5a0a20 55%, #8b1040 72%, #c0185a 85%, #e11d60 95%, #fb7185 100%)',
        padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px) 0',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2
          id="mn-cta-h"
          style={{ fontSize: 'clamp(26px,5vw,48px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, backgroundImage: 'linear-gradient(135deg, #fb7185, #e879f9, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Следващата резервация може<br />да е след 15 минути.
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', marginBottom: 40, lineHeight: 1.65 }}>
          Попълни данните си, избери план и сайтът ти е онлайн веднага.
          Твоите клиентки ще могат да се записват онлайн още днес.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          <ButtonColorful href="/create" label="Създай сайта си" className="h-14 rounded-full px-10 text-[16px] font-bold" />
          <Link
            href="/demo"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 44, padding: '0 28px', borderRadius: 9999,
              border: '1.5px solid rgba(255,255,255,0.35)',
              fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
              textDecoration: 'none',
            }}
          >
            Виж готов сайт
          </Link>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          от {formatDualEurText('0.82')} на ден · 0% комисионна · Готов веднага
        </p>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Вижте още</p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Начало</Link>
            <Link href="/demo" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Виж активен сайт</Link>
            <Link href="#цени" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Планове и цени</Link>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
        <div style={{
          width: '75%',
          maxWidth: 260,
          border: '10px solid #1a1a1a',
          borderBottom: 'none',
          borderRadius: '44px 44px 0 0',
          overflow: 'hidden',
          boxShadow: '0 0 0 2px #333',
        }}>
          <div style={{ background: '#000', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 90, height: 22, background: '#1a1a1a', borderRadius: 20 }} />
          </div>
          <Image
            src="/marketing/IMG_1832.webp"
            alt="Clicka в действие"
            width={520}
            height={1120}
            sizes="(max-width: 640px) 75vw, 260px"
            quality={78}
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Page assembly ──────────────────────────────────────── */

export function ManikyuristPage() {
  useEffect(() => {
    let obs: IntersectionObserver | null = null;
    const els = document.querySelectorAll('[data-reveal]');
    obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
          obs?.unobserve(e.target);
        }
      }),
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => obs!.observe(el));
    return () => obs?.disconnect();
  }, []);

  return (
    <div className="hp">
      <MarketingHomeHeader />
      <main id="main-content">
        <Hero />
        <RealExample />

        {/* New client flow — unique to manicurist page */}
        <NewClientSection />

        {/* Telegram management */}
        <TelegramBridgeSection />
        <TelegramManagementSection />
        <PriceListImportSection />
        <TelegramChatSection />

        {/* Problem awareness */}
        <LostClientsSection />
        <VsPlatformSection />

        {/* Instagram → bookings — unique section */}
        <InstagramToBookingsSection />

        {/* AI + features proof */}
        <MarketingFeaturesSection />

        {/* Visual proof */}
        <IPhoneDemoSection />
        <DepositsSection />
        <GoogleReviewsSection />

        {/* Nail services SEO — unique section */}
        <NailServicesSection />

        {/* SEO context */}
        <LocalSeoSection />

        {/* Pricing */}
        <PricingContextSection />
        <MarketingHomePricingSection />

        {/* FAQ + CTA */}
        <FaqSection />
        <FinalCta />
      </main>
    </div>
  );
}
