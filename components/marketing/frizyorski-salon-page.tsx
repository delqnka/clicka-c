'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { MarketingHomeHeader } from '@/components/marketing/marketing-home-header';
import { formatDualEurText } from '@/lib/salon-currency';

/* — existing visual components reused as-is — */
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
      aria-labelledby="fs-h1"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(96px,14vw,140px) clamp(20px,5vw,60px) clamp(56px,9vw,96px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 16 }}>
          За фризьори
        </p>
        <h1
          id="fs-h1"
          style={{ fontSize: 'clamp(28px,5.5vw,52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20, color: '#0f0f0f' }}
        >
          Сайт за фризьорски салон<br />
          <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            с онлайн записвания
          </span>
        </h1>
        <p style={{ fontSize: 'clamp(18px,2.5vw,22px)', color: '#555', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 36px' }}>
          Твоите клиенти се записват онлайн. Ти получаваш известие в Telegram.
          Без телефон, без тефтер, без пропуснати часове.
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
          <Link
            href="#цени"
            style={{
              fontSize: 12, fontWeight: 500, color: '#aaa',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Виж цените
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
        background: 'linear-gradient(180deg, #fff 0%, #fff1f2 50%, #fff 100%)',
        padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
        borderTop: '1px solid #f3f4f6',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
            Виж реален пример
          </p>
          <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: '#555', maxWidth: 440, margin: '0 auto' }}>
            Ето как изглежда сайт на реален фризьорски салон.
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

        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 'clamp(16px,2.2vw,20px)', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.3, marginBottom: 12 }}>
            Това не е профил в платформа.<br />
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Това е собствен сайт.
            </span>
          </p>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#555', lineHeight: 1.65, margin: 0 }}>
            Когато клиентът отвори сайта,<br />
            той вижда само теб.<br />
            <strong style={{ color: '#0f0f0f' }}>Не конкурентите ти. А само теб.</strong>
          </p>
        </div>

        <a
          href="https://salonurban.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 24px', borderRadius: 9999,
            background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg,#e11d48,#a855f7) border-box',
            border: '2px solid transparent', textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: '#0f0f0f' }}>salonurban.online</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
            borderRadius: 9999, backgroundImage: G, color: '#fff', fontSize: 11, fontWeight: 400,
          }}>
            Отвори
          </span>
        </a>
      </div>
    </section>
  );
}

/* ── Telegram bridge — pulled forward ───────────────────── */

function TelegramBridgeSection() {
  return (
    <section
      aria-labelledby="fs-telegram-h"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px) clamp(20px,4vw,40px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
          Управление на фризьорски салон
        </p>
        <h2
          id="fs-telegram-h"
          style={{ fontSize: 'clamp(24px,4.5vw,42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Управляваш целия си салон<br />от Telegram.
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 28px' }}>
          Докато повечето решения те карат да учиш нов софтуер —
          Clicka работи там, където вече си: в Telegram.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, margin: '0 auto', textAlign: 'left' }}>
          {[
            '📲 Получаваш резервация — известие в Telegram',
            '📲 Качваш снимка на ценоразписа — услугите влизат сами',
            '📲 Променяш работното си време — готово',
            '📲 Клиент пита за свободен час — AI отговаря',
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

/* ── Lost clients ───────────────────────────────────────── */

function LostClientsSection() {
  return (
    <section
      aria-labelledby="fs-lost-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Реалността
        </p>
        <h2
          id="fs-lost-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 28, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Защо фризьорите губят клиенти<br />без онлайн записване
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              title: 'Клиентите търсят фризьор в 22:30',
              body: 'Повечето хора не звънят по телефона. Търсят в Google вечерта, докато са на дивана. Ако нямаш сайт с онлайн записване — просто не съществуваш за тях в тоя момент. Записват се при конкурента, който е на две улици по-далеч, но е достъпен онлайн.',
            },
            {
              title: 'Пропусната резервация = пропуснати пари',
              body: 'Клиент се записва в Instagram, ти не виждаш навреме, часът остава незает. Или се записва по телефон и не се явява — без депозит нямаш лост. С онлайн записване и задължителен депозит чрез Stripe, неявяванията падат драстично.',
            },
            {
              title: 'Конкурентът вече приема онлайн',
              body: 'Фризьорите в твоя квартал, които имат онлайн резервации, запълват часовете по-бързо. Не защото са по-добри — а защото са по-достъпни. Онлайн записването вече е стандарт, не предимство.',
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 16, background: '#fdf2f8', border: '1.5px solid #f0e6f6' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <ButtonColorful href="/create" label="Не губи повече клиенти →" className="h-12 rounded-full px-8 text-[15px] font-bold" />
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
  { label: 'Google SEO за твоя салон', platform: 'Не', clicka: 'Да' },
  { label: 'Контрол над клиентските данни', platform: 'Не', clicka: 'Да' },
  { label: 'Данни за реклами (Meta Pixel, GA4)', platform: 'Не', clicka: 'Да' },
] as const;

function VsPlatformSection() {
  return (
    <section
      aria-labelledby="fs-vs-h"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Сравнение
        </p>
        <h2
          id="fs-vs-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Защо собствен сайт е по-добър<br />от платформа за резервации
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 32, maxWidth: 520, lineHeight: 1.6 }}>
          В платформа за резервации твоят клиент вижда съседните салони и ти плащаш комисионна за всяка резервация.
          С Clicka — само ти, твой бранд, твои клиенти.
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

/* ── iPhone mockup section (reused from below-fold) ─────── */

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
            Ето какво виждат твоите клиенти
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
            Професионален сайт, който работи за теб{' '}
            <span style={{ backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              24/7 и приема резервации
            </span>
            , дори когато спиш.
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

/* ── Stripe / deposits (reused from below-fold) ─────────── */

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
          Приемай депозити онлайн
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
          Клиентите могат да платят депозит още при записването. Парите постъпват директно в твоя Stripe акаунт.
          Без неявявания, без изгубени часове.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Намалява неявяванията',
            'Приемай плащания с карта',
            'Парите отиват директно при теб',
            '0% комисионна от Clicka',
          ].map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckIcon id={`dep-${i}`} />
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Google reviews (reused from below-fold) ────────────── */

function GoogleReviewsSection() {
  return (
    <section
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
      aria-labelledby="fs-reviews-h"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Автоматично след резервация
        </p>
        <h2
          id="fs-reviews-h"
          style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 16, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
        >
          Събирай повече Google ревюта
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 32 }}>
          След всяка завършена резервация клиентът получава автоматична покана да остави ревю в Google.
          Повече ревюта = по-висока позиция при търсене на &ldquo;фризьор&rdquo; в твоя град.
        </p>

        <div style={{ background: '#0f0f0f', borderRadius: 16, padding: '24px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Как Google ревютата носят клиенти
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            Когато някой търси:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {['фризьор варна', 'фризьор лозенец', 'фризьор бургас'].map((q) => (
              <span key={q} style={{ fontSize: 13, color: '#e879f9', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{q}</span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>Google показва:</p>
          {['⭐ рейтинг', '💬 брой ревюта', '📍 позиция в картата'].map((item) => (
            <p key={item} style={{ fontSize: 13, color: '#e2e8f0', margin: '0 0 6px' }}>{item}</p>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.8 }}>
              Повече ревюта<br />= Повече доверие<br />= Повече клиенти
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Local SEO ──────────────────────────────────────────── */

const LOCAL_SEO_ITEMS = [
  { icon: '📍', title: 'Google Business Profile', body: 'Сайтът ти е свързан с Google Business — клиентите те намират в картата и в търсенето едновременно.' },
  { icon: '⭐', title: 'Автоматични Google ревюта', body: 'Повече ревюта = по-висока позиция при търсене на "фризьор" в твоя район. Системата работи автоматично.' },
  { icon: '🔍', title: 'HairSalon структурирани данни', body: 'Сайтът използва schema.org специфично за фризьорски салони. Google разбира бизнеса ти по-добре.' },
  { icon: '🌐', title: 'Собствен домейн', body: 'Собственият домейн гради SEO авторитет с времето — той е твой, не на чужда платформа.' },
  { icon: '📝', title: 'Блог за твоя салон', body: 'Публикувай съвети за коса в блога на сайта си. Всяка статия е нов шанс да те намерят в Google.' },
  { icon: '⚡', title: 'Lighthouse 100/100', body: 'Перфектна техническа SEO оценка. Бърз сайт, правилни мета тагове и структура — без да правиш нищо.' },
] as const;

function LocalSeoSection() {
  return (
    <section
      aria-labelledby="fs-seo-h"
      style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ maxWidth: 600, marginBottom: 'clamp(36px,6vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Локално SEO
          </p>
          <h2
            id="fs-seo-h"
            style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Как нови клиенти ще те намират в Google
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', lineHeight: 1.6 }}>
            Clicka прави повече от красив сайт — помага ти да се показваш, когато хора търсят
            "фризьор" в твоя квартал или град.
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
      aria-labelledby="fs-price-h"
      style={{ background: '#fff', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Ценова справка
        </p>
        <h2
          id="fs-price-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Колко струва сайт за фризьорски салон
        </h2>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: '#888', marginBottom: 36, maxWidth: 520, lineHeight: 1.6 }}>
          Три начина да получиш онлайн присъствие. Ето какво получаваш и какво плащаш.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          <div style={{ padding: '20px 24px', borderRadius: 16, border: '1.5px solid #eee', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f0f' }}>Уеб агенция</h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e11d48' }}>от 600 €</span>
            </div>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
              Еднократна разработка + месечна поддръжка 50–150 €. Онлайн резервации обикновено не са включени — изискват отделна интеграция. Времето за изработка: 4–12 седмици.
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
    q: 'Как клиентите ми се записват онлайн за фризьор?',
    a: 'Получаваш собствен сайт с линк за резервации. Клиентите избират услуга, дата и час и се записват сами — без да се обаждат. Ти получаваш известие в Telegram веднага.',
  },
  {
    q: 'Мога ли да управлявам графика на салона от телефона?',
    a: 'Да. Управляваш всичко от Telegram — добавяш услуги, блокираш часове, преглеждаш резервации и качваш снимки директно от телефона си. Без компютър.',
  },
  {
    q: 'Правите ли сайтове и за барбършоп или козметично студио?',
    a: 'Да. Правим сайтове за всеки, който работи с часове — фризьори, барбъри, козметици, маникюристи, масажисти. Ако записваш клиенти за час, това е точният продукт за теб.',
  },
  {
    q: 'Как да намалявам неявяванията?',
    a: 'С този сайт можеш да поискаш депозит при записването. Клиентите, платили депозит, се явяват в по-голяма честота. Депозитите се приемат онлайн с карта чрез Stripe и постъпват директно при теб.',
  },
  {
    q: 'Мога ли да приемам депозит онлайн?',
    a: 'Да, депозитите се приемат онлайн чрез Stripe и постъпват директно при теб. Ние не вземаме комисионна от тези транзакции!',
  },
  {
    q: 'Как да събирам повече Google ревюта за салона си?',
    a: 'Clicka изпраща автоматична покана за Google ревю след всяка завършена резервация. Не правиш нищо — системата работи сама. Повече ревюта = по-висока позиция при търсене на "фризьор" в твоя град.',
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
    q: 'Трябва ли ми домейн за сайта на фризьорския ми салон?',
    a: 'Не е задължително. Веднага получаваш адрес tvoiatsalon.clicka.bg и можеш да приемаш резервации веднага. Ако искаш собствен домейн (например salonmaria.bg), можеш да го свържеш безплатно или ние да го регистрираме вместо теб.',
  },
  {
    q: 'Как работи AI рецепционистът за фризьорски салон?',
    a: 'AI рецепционистът отговаря на въпроси на клиентите и приема резервации 24/7 — дори когато ти си зает или спиш. Работи директно в чата на сайта ти и ти докладва всяка нова резервация в Telegram.',
  },
] as const;

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section
      id="faq"
      aria-labelledby="fs-faq-h"
      style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)', position: 'relative' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>FAQ</p>
        <h2
          id="fs-faq-h"
          style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 36, backgroundImage: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Чести въпроси за фризьорски салон
        </h2>
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid #f0e6f6' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', gap: 12 }}
              >
                <span style={{ fontSize: 'clamp(14px,1.8vw,15px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.4 }}>{item.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <path d="M6 9l6 6 6-6" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open === i && (
                <p style={{ fontSize: 'clamp(13px,1.6vw,14px)', color: '#666', lineHeight: 1.7, paddingBottom: 16, margin: 0 }}>{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}

/* ── Final CTA ──────────────────────────────────────────── */

function FinalCta() {
  return (
    <section
      aria-labelledby="fs-cta-h"
      style={{
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a 30%, #5a0a20 55%, #8b1040 72%, #c0185a 85%, #e11d60 95%, #fb7185 100%)',
        padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px) 0',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2
          id="fs-cta-h"
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
            <Link href="/demo" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Виж активен сайт</Link>
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

export function FrizyorskiSalonPage() {
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

        {/* Telegram pulled forward — key differentiator */}
        <TelegramBridgeSection />
        <TelegramManagementSection />
        <PriceListImportSection />
        <TelegramChatSection />

        {/* Problem awareness */}
        <LostClientsSection />
        <VsPlatformSection />

        {/* AI + features proof */}
        <MarketingFeaturesSection />

        {/* Visual proof — client-side view */}
        <IPhoneDemoSection />
        <DepositsSection />
        <GoogleReviewsSection />

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
