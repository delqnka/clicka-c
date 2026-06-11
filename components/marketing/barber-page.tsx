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

const MarketingHomePricingSection = dynamic(
  () => import('@/components/marketing/marketing-home-pricing').then((m) => ({ default: m.MarketingHomePricingSection })),
);
const IPhoneMockup = dynamic(
  () => import('@/components/ui/iphone-mockup').then((m) => ({ default: m.IPhoneMockup })),
  { ssr: false },
);

const G = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

/* ── Glassmorphism helpers ───────────────────────────────── */
const GLASS: React.CSSProperties = {
  background: 'rgba(6, 6, 10, 0.62)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  color: '#fff',
};

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

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
      aria-labelledby="br-h1"
      style={{
        ...GLASS,
        padding: 'clamp(96px,14vw,140px) clamp(20px,5vw,60px) clamp(56px,9vw,96px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          За барбъри
        </p>
        <h1
          id="br-h1"
          style={{ fontSize: 'clamp(28px,5.5vw,52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20, color: '#fff' }}
        >
          Собствен сайт и онлайн резервации<br />
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            за барбъри
          </span>
        </h1>
        <p style={{ fontSize: 'clamp(18px,2.5vw,22px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 36px' }}>
          Клиентите запазват час сами. Ти получаваш известие в Telegram.
          Без телефон, без тефтер, без пропуснати часове.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <ButtonColorful href="/create" label="Създай сайта си" className="h-12 rounded-full px-8 text-[15px] font-bold w-full max-w-[280px]" />
          <Link
            href="/demo"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 40, padding: '0 24px', borderRadius: 9999,
              background: '#fff',
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              color: '#0f0f0f',
            }}
          >
            Виж готов сайт
          </Link>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, fontWeight: 600, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          от {formatDualEurText('0.82')} на ден · 0% комисионна · Готов веднага
        </p>
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
        background: '#fff',
        padding: 'clamp(64px,11vw,110px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
            Виж реален пример
          </p>
          <p style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 800, color: '#0f0f0f', maxWidth: 500, margin: '0 auto', lineHeight: 1.2 }}>
            Това не е профил в платформа.{' '}
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Това е собствен сайт.
            </span>
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
          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: '#555', lineHeight: 1.65, margin: 0 }}>
            Когато клиентът отвори сайта ти,
            той вижда само теб.
            <strong style={{ color: '#0f0f0f', display: 'block', marginTop: 6 }}>Не конкурентите ти. А само теб.</strong>
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
          <span style={{ fontSize: 11, fontWeight: 300, color: '#888', letterSpacing: '0.02em' }}>salonurban.online</span>
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

/* ── Online bookings ─────────────────────────────────────── */

function OnlineBookingsSection() {
  return (
    <section
      aria-labelledby="br-bookings-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
          Онлайн записване за барбър
        </p>
        <h2
          id="br-bookings-h"
          style={{ fontSize: 'clamp(24px,4.5vw,42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20, color: '#0f0f0f' }}
        >
          Клиентите запазват час сами.{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            По всяко време.
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.7, marginBottom: 32 }}>
          Клиентът отваря сайта ти, избира услуга, дата и час и се записва без да звъни. Ти получаваш известие в Telegram веднага. Системата приема резервации 24/7 и никога не пропуска час.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            'Клиентът избира услуга, час и специалист',
            'Ти получаваш известие в Telegram веднага',
            'Часът влиза автоматично в графика ти',
            'Системата работи 24/7 без твоето участие',
            'Без двойни записвания и обърквания',
          ].map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckIcon id={`book-${i}`} />
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Own site section ────────────────────────────────────── */

function OwnSiteSection() {
  return (
    <section
      aria-labelledby="br-ownsite-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
          Твой сайт за барбършоп
        </p>
        <h2
          id="br-ownsite-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}
        >
          Собствен сайт за твоя{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            барбършоп
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 32 }}>
          Получаваш готов сайт с твоите услуги и твоите цени. Клиентите намират бизнеса ти в Google, отварят сайта и се записват директно. Без посредници, без платформи, без чужд бранд.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(
            [
              { title: 'Твоя собствен сайт', body: 'Сайтът е персонализиран под твоя барбършоп с твоите услуги, цени и съдържание. Клиентите виждат само теб.' },
              { title: 'Списък с услуги и цени', body: 'Добавяш снимка на ценоразписа си или ръчно добавяш подстригване, оформяне на брада, бръснене и всяка друга услуга с точна цена и времетраене.' },
              { title: 'Собствен домейн', body: (<>Получаваш адрес на сайта. Например barbershop-ivan.bg или <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>твоятсалон.clicka.bg</span>.</>) },
              { title: 'Готов веднага', body: 'Сайтът е онлайн в рамките на минути. Не чакаш агенция, не учиш нов софтуер.' },
            ] as { title: string; body: React.ReactNode }[]
          ).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 14, ...GLASS_CARD }}>
              <span style={{ fontSize: 22, fontWeight: 900, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0, lineHeight: 1, minWidth: 28 }}>0{i + 1}</span>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Telegram bridge ─────────────────────────────────────── */

function TelegramBridgeSection() {
  return (
    <section
      aria-labelledby="br-telegram-h"
      style={{
        background: '#fff',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px) clamp(20px,4vw,40px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>
          Управление на барбършоп
        </p>
        <h2
          id="br-telegram-h"
          style={{ fontSize: 'clamp(24px,4.5vw,42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, color: '#0f0f0f' }}
        >
          Управляваш всичко{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            от Telegram.
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 32px' }}>
          Не се налага да учиш нов панел. Всичко се случва в Telegram. Получаваш резервация, управляваш графика и отговаряш на клиенти от телефона си.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
          {[
            'Получаваш резервация — известие в Telegram',
            'Качваш ценоразпис — услугите влизат сами',
            'Променяш работното си време — готово',
            'Клиент пита за свободен час — AI отговаря',
            'Блокираш час за почивка или отпуска',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckIcon id={`tg-br-${i}`} />
              <span style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#0f0f0f', lineHeight: 1.55, fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── AI receptionist ─────────────────────────────────────── */

function AiReceptionistSection() {
  return (
    <section
      aria-labelledby="br-ai-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
            AI рецепционист 24/7
          </p>
          <h2
            id="br-ai-h"
            style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}
          >
            AI рецепционист, който приема<br />
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              резервации 24/7
            </span>
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 540 }}>
            Докато бръснеш следващия клиент, AI рецепционистът отговаря на въпроси и приема резервации в чата на сайта ти. Работи денонощно и те уведомява за всяка нова резервация в Telegram.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {[
            { title: 'Отговаря на въпроси', body: 'Клиентите питат за цени, свободни часове и услуги. AI рецепционистът отговаря точно и бързо.' },
            { title: 'Приема резервации', body: 'Дори когато ти спиш или работиш, AI приема резервации директно в чата.' },
            { title: 'Говори на български', body: 'Разбира и отговаря на естествен български. Не изглежда като бот.' },
            { title: 'Уведомява те веднага', body: 'Всяка нова резервация от AI рецепциониста пристига като известие в Telegram.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '18px 18px', borderRadius: 14, ...GLASS_CARD }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Gallery section ─────────────────────────────────────── */

function GallerySection() {
  return (
    <section
      aria-labelledby="br-gallery-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
          Галерия с прически и бради
        </p>
        <h2
          id="br-gallery-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#0f0f0f' }}
        >
          Покажи работата си.{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Привлечи нови клиенти.
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.7, marginBottom: 28 }}>
          Сайтът ти включва галерия, в която показваш снимки на прически и бради. Клиентите виждат стила ти преди да дойдат и решават по-бързо. Качваш снимки директно от Telegram.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Качваш снимки директно от Telegram',
            'Организирана галерия с прически и бради',
            'Клиентите виждат стила ти преди да дойдат',
            'Новите снимки влизат в сайта веднага',
          ].map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckIcon id={`gal-${i}`} />
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
      aria-labelledby="br-reviews-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          Автоматично след резервация
        </p>
        <h2
          id="br-reviews-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, color: '#fff' }}
        >
          Събирай повече{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Google ревюта
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, marginBottom: 32 }}>
          След всяка завършена резервация клиентът получава автоматична покана да остави ревю в Google. Не правиш нищо. Повече ревюта означава по-висока позиция при търсене на барбър в твоя град.
        </p>
        <div style={{ ...GLASS_CARD, borderRadius: 16, padding: '24px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Хората търсят барбър така:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {['барбър варна', 'barbershop пловдив', 'барбър лозенец', 'оформяне брада бургас'].map((q) => (
              <span key={q} style={{ fontSize: 13, color: '#e879f9', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{q}</span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.5 }}>Google показва рейтинг, брой ревюта и позиция в картата.</p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.8 }}>
              Повече ревюта<br />= Повече доверие<br />= Повече клиенти
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Deposits ───────────────────────────────────────────── */

function DepositsSection() {
  return (
    <section
      aria-label="Онлайн плащания"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#635BFF', letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>stripe</span>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#635BFF', margin: 0 }}>интеграция</p>
        </div>
        <h2
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 14, color: '#0f0f0f' }}
        >
          Онлайн депозити и{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            плащания
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
          Клиентите плащат депозит при записването. Парите постъпват директно в твоя Stripe акаунт. Неявяванията падат, а приходите са сигурни.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Намалява неявяванията значително',
            'Клиентите плащат с карта онлайн',
            'Парите постъпват директно при теб',
            '0% комисионна от Clicka',
            'Работи за всяка услуга в менюто',
          ].map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckIcon id={`dep-br-${i}`} />
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Domain section ─────────────────────────────────────── */

function DomainSection() {
  return (
    <section
      aria-labelledby="br-domain-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>
          Собствен домейн
        </p>
        <h2
          id="br-domain-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}
        >
          Твой адрес.{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Твой бранд.
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 28 }}>
          Веднага получаваш безплатен адрес от вида barbershopivan.clicka.bg. Ако искаш собствен домейн като barbershop-ivan.bg, можеш да го свържеш безплатно или ние да го регистрираме вместо теб.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Безплатен поддомейн', value: 'barbershopivan.clicka.bg — веднага' },
            { label: 'Собствен домейн', value: 'barbershop-ivan.bg — свързваш безплатно' },
            { label: 'SEO авторитет', value: 'Домейнът е твой и гради позиция с времето' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 18px', borderRadius: 12, ...GLASS_CARD }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{row.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Lost clients ───────────────────────────────────────── */

function LostClientsSection() {
  return (
    <section
      aria-labelledby="br-lost-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          Реалността
        </p>
        <h2
          id="br-lost-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 28, color: '#0f0f0f' }}
        >
          Защо барбърите губят клиенти<br />
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            без онлайн записване
          </span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              title: 'Клиентите търсят барбър вечерта',
              body: 'Повечето хора не звънят по телефон. Търсят в Google вечерта, докато са у дома. Ако нямаш сайт с онлайн записване, просто не съществуваш за тях в онзи момент. Записват се при конкурента, който е достъпен онлайн.',
            },
            {
              title: 'Instagram не е система за записвания',
              body: 'Съобщенията се губят. Часовете се пазят ръчно. Лесно стават обърквания. Колкото повече клиенти имаш, толкова повече хаос и пропуснати резервации.',
            },
            {
              title: 'Конкурентът вече приема онлайн',
              body: 'Барбърите в твоя квартал, които имат онлайн резервации, запълват часовете по-бързо. Не защото са по-добри, а защото са по-достъпни. Онлайн записването вече е стандарт, не предимство.',
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 16, background: '#f9f9f9', border: '1.5px solid #eee' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <ButtonColorful href="/create" label="Не губи повече клиенти" className="h-12 rounded-full px-8 text-[15px] font-bold" />
        </div>
      </div>
    </section>
  );
}

/* ── Own site vs platform ───────────────────────────────── */

const PLATFORM_ROWS = [
  { label: 'Виждат ли клиентите конкурентите ти?', platform: 'Да — до теб', clicka: 'Не — само ти' },
  { label: 'Комисионна от резервациите', platform: '30–50% от всяка', clicka: '0%' },
  { label: 'Собствен домейн и бранд', platform: 'Не', clicka: 'Да' },
  { label: 'Google SEO за твоя барбършоп', platform: 'Не', clicka: 'Да' },
  { label: 'Контрол над клиентските данни', platform: 'Не', clicka: 'Да' },
] as const;

function VsPlatformSection() {
  return (
    <section
      aria-labelledby="br-vs-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          Сравнение
        </p>
        <h2
          id="br-vs-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, color: '#fff' }}
        >
          Защо собствен сайт е по-добър<br />
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            от платформа за резервации
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'rgba(255,255,255,0.45)', marginBottom: 32, maxWidth: 520, lineHeight: 1.6 }}>
          В платформа за резервации твоят клиент вижда съседните барбъри и ти плащаш комисионна за всяка резервация. Собственият сайт означава само ти, твой бранд, твои клиенти.
        </p>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(255,255,255,0.06)', padding: '12px 16px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Критерий</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>Платформа</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clicka</span>
          </div>
          {PLATFORM_ROWS.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                padding: '14px 16px',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{row.label}</span>
              <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600, textAlign: 'center' }}>{row.platform}</span>
              <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>{row.clicka}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Barber services SEO ─────────────────────────────────── */

function BarberServicesSection() {
  return (
    <section
      aria-labelledby="br-services-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          За всяка услуга
        </p>
        <h2
          id="br-services-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 16, color: '#0f0f0f' }}
        >
          Подстригване, оформяне на брада и бръснене{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            с онлайн записване
          </span>
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 32, lineHeight: 1.65 }}>
          Без значение дали предлагаш класическо подстригване, fade, оформяне и боядисване на брада или hot towel бръснене, всяка услуга може да се резервира онлайн с точно определено времетраене и цена.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'clamp(8px,1.5vw,12px)' }}>
          {[
            { title: 'Подстригване', body: 'Клиентите запазват час за подстригване онлайн и виждат цената предварително.' },
            { title: 'Fade и Taper', body: 'Добави fade и taper като отделни услуги с точна цена и времетраене.' },
            { title: 'Оформяне на брада', body: 'Оформяне, подравняване и дизайн на брада с онлайн резервация.' },
            { title: 'Бръснене', body: 'Класическо hot towel бръснене като отделна услуга в менюто.' },
            { title: 'Боядисване', body: 'Боядисване на коса или брада с предварително запазен час.' },
            { title: 'Комбо услуги', body: 'Подстригване плюс оформяне на брада в едно записване с правилно блокиране на времето.' },
          ].map((item) => (
            <div key={item.title} style={{ padding: '14px 14px', borderRadius: 14, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.07)' }}>
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
  { title: 'Google Business Profile', body: 'Сайтът се свързва с Google Business. Клиентите те намират в картата и в търсенето едновременно.' },
  { title: 'Автоматични Google ревюта', body: 'Повече ревюта означава по-висока позиция при търсене на барбър в твоя район. Системата работи автоматично след всяка резервация.' },
  { title: 'BarberShop структурирани данни', body: 'Сайтът използва schema.org тип BarberShop. Google разбира бизнеса ти по-добре и го показва по-добре в резултатите.' },
  { title: 'Собствен домейн', body: 'Собственият домейн гради SEO авторитет с времето. Той е твой и не зависи от чужда платформа.' },
  { title: 'Блог за твоя барбършоп', body: 'Публикувай съвети за прически и грижа за брада. Всяка статия е нов шанс да те намерят в Google.' },
  { title: 'Lighthouse 100/100', body: 'Технически перфектен сайт. Бърза скорост, правилни мета тагове и структура без да правиш нищо.' },
] as const;

function LocalSeoSection() {
  return (
    <section
      aria-labelledby="br-seo-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ maxWidth: 600, marginBottom: 'clamp(36px,6vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
            Локално SEO
          </p>
          <h2
            id="br-seo-h"
            style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, color: '#fff' }}
          >
            Как нови клиенти ще те{' '}
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              намират в Google
            </span>
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Сайтът ти е изграден така, че да се показва когато хора търсят барбър в твоя квартал или град.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'clamp(12px,2vw,20px)' }}>
          {LOCAL_SEO_ITEMS.map((item) => (
            <div key={item.title} style={{ padding: '22px 20px', borderRadius: 16, ...GLASS_CARD }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
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
      aria-labelledby="br-price-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          Ценова справка
        </p>
        <h2
          id="br-price-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, color: '#0f0f0f' }}
        >
          Колко струва сайт за{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            барбършоп
          </span>
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
              Еднократна разработка плюс месечна поддръжка 50–150 €. Онлайн резервации обикновено не са включени и изискват отделна интеграция. Времето за изработка: 4–12 седмици.
            </p>
          </div>
          <div style={{ padding: '20px 24px', borderRadius: 16, border: '1.5px solid #eee', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Платформа за резервации</h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>30–50% комисионна</span>
            </div>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
              При 50 резервации/месец × средна цена 30 € = 450 – 750 € комисионна на месец.
              За 12 месеца: 5 400 – 9 000 €. Без собствен домейн, без SEO за твоя личен бранд.
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
    q: 'Как клиентите ми се записват онлайн за барбър?',
    a: 'Получаваш собствен сайт с линк за резервации. Клиентите избират услуга, дата и час и се записват сами, без да звънят или пишат в Instagram. Ти получаваш известие в Telegram веднага.',
  },
  {
    q: 'Мога ли да управлявам графика на барбършопа от телефона?',
    a: 'Да. Управляваш всичко от Telegram. Добавяш услуги, блокираш часове, преглеждаш резервации и качваш снимки директно от телефона си. Без компютър, без сложни панели.',
  },
  {
    q: 'Колко струва сайт за барбършоп с Clicka?',
    a: 'Не предлагаме месечен абонамент. Плащаш еднократно за 6 или 12 месеца. Solo план: 299 € за 12 месеца (0.82 € на ден). Team план за до 3 специалисти: 499 € за 12 месеца. 0% комисионна върху резервациите.',
  },
  {
    q: 'Как да намалявам неявяванията в барбършопа?',
    a: 'Можеш да поискаш депозит при записването. Клиентите, платили депозит, се явяват значително по-редовно. Депозитите се приемат онлайн с карта чрез Stripe и постъпват директно при теб.',
  },
  {
    q: 'Мога ли да приемам онлайн плащания за услуги?',
    a: 'Да, депозитите се приемат онлайн чрез Stripe и постъпват директно при теб. Clicka не взима комисионна от тези транзакции.',
  },
  {
    q: 'Как да събирам повече Google ревюта за барбършопа?',
    a: 'Сайтът изпраща автоматична покана за Google ревю след всяка завършена резервация. Не правиш нищо допълнително. Повече ревюта означава по-висока позиция при търсене на барбър в твоя град.',
  },
  {
    q: 'Трябва ли ми домейн за сайта на барбършопа?',
    a: 'Не е задължително. Веднага получаваш безплатен адрес barber.clicka.bg и можеш да приемаш резервации веднага. Ако искаш собствен домейн като barbershop-ivan.bg, можеш да го свържеш безплатно или ние да го регистрираме вместо теб.',
  },
  {
    q: 'Как работи AI рецепционистът за барбъри?',
    a: 'AI рецепционистът отговаря на въпроси на клиентите и приема резервации 24/7, дори когато работиш или спиш. Работи директно в чата на сайта ти и те уведомява за всяка нова резервация в Telegram.',
  },
  {
    q: 'Трябва ли ми технически познания, за да управлявам сайта?',
    a: 'Не. Всичко се управлява от Telegram. Качваш снимка, пишеш съобщение, блокираш час. Ако можеш да пишеш съобщение в телефона, можеш да управляваш сайта си.',
  },
  {
    q: 'Работи ли за барбершоп с повече специалисти?',
    a: 'Да. Team планът поддържа до 3 специалисти. Всеки има собствен график и клиентите могат да запазват час при конкретен барбър.',
  },
] as const;

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section
      id="faq"
      aria-labelledby="br-faq-h"
      style={{ ...GLASS, padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>FAQ</p>
        <h2
          id="br-faq-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 40, color: '#fff' }}
        >
          Чести въпроси за{' '}
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            барбъри
          </span>
        </h2>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 0', gap: 16, textAlign: 'left',
              }}
              aria-expanded={open === i}
            >
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{item.q}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6" stroke="url(#faq-grad-br)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="faq-grad-br" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#e11d48" /><stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </button>
            {open === i && (
              <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, paddingBottom: 20, margin: 0 }}>
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
      aria-labelledby="br-cta-h"
      style={{
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a 30%, #5a0a20 55%, #8b1040 72%, #c0185a 85%, #e11d60 95%, #fb7185 100%)',
        color: '#fff',
        padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px) 0',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2
          id="br-cta-h"
          style={{ fontSize: 'clamp(26px,5vw,48px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, backgroundImage: 'linear-gradient(135deg, #fb7185, #e879f9, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Следващата резервация може<br />да е след 15 минути.
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: 'rgba(255,255,255,0.65)', marginBottom: 40, lineHeight: 1.65 }}>
          Попълни данните си, избери план и сайтът ти е онлайн веднага.
          Твоите клиенти ще могат да се записват онлайн още днес.
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
            <Link href="/za-frizyorski-salon" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>За фризьори</Link>
            <Link href="/za-manikyurist" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>За маникюристи</Link>
            <Link href="/#pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Планове и цени</Link>
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

export function BarberPage() {
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
    <div
      className="hp"
      style={{ background: 'linear-gradient(160deg, #08080e 0%, #100718 25%, #0c0a16 50%, #07090f 75%, #060608 100%)' }}
    >
      <MarketingHomeHeader />
      <main id="main-content">
        <Hero />
        <RealExample />

        <OnlineBookingsSection />
        <OwnSiteSection />

        <TelegramBridgeSection />
        <TelegramManagementSection />
        <PriceListImportSection />
        <TelegramChatSection />

        <AiReceptionistSection />
        <GallerySection />

        <LostClientsSection />
        <VsPlatformSection />

        <MarketingFeaturesSection />

        <GoogleReviewsSection />
        <DepositsSection />
        <DomainSection />

        <BarberServicesSection />
        <LocalSeoSection />

        <PricingContextSection />
        <MarketingHomePricingSection />

        <FaqSection />
        <FinalCta />
      </main>
    </div>
  );
}
