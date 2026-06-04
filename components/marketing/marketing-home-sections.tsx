'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import FlowArt, { FlowSection } from '@/components/ui/flow-art';
import {
  MARKETING_AUDIENCE,
  MARKETING_COMPARISON,
  MARKETING_FEATURES,
  MARKETING_FOUNDER,
  MARKETING_STEPS,
} from '@/lib/marketing-home-copy';

const GRADIENT_HEADING = 'bg-clip-text text-transparent';
const GRADIENT_BG = { backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' } as const;

/* ── Audience marquee ─────────────────────────────────── */

const TAGS_ROW_1 = [
  'Фризьори', 'Козметици', 'Маникюристи', 'Бръснари',
  'Масажисти', 'Груумъри', 'Студия за красота',
];
const TAGS_ROW_2 = [
  'Барбършопове', 'Педикюристи', 'Стилисти', 'Визажисти',
  'Спа центрове', 'Терапевти', 'Салони',
];

const TAG_STYLES = [
  'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20',
  'border border-rose-200 bg-rose-50/80 text-rose-700',
  'border border-rose-300/50 bg-white text-rose-700',
] as const;

function MarqueeRow({ tags, duration = 30, reverse = false }: { tags: string[]; duration?: number; reverse?: boolean }) {
  const doubled = [...tags, ...tags];
  return (
    <div
      className="flex w-max gap-3"
      style={{
        animation: `${reverse ? 'aud-marquee-r' : 'aud-marquee'} ${duration}s linear infinite`,
      }}
    >
      {doubled.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide whitespace-nowrap ${TAG_STYLES[i % 3]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function MarketingAudienceSection() {
  return (
    <section
      id="audience"
      data-home-section="audience"
      className="bg-rose-50"
      style={{ padding: 'clamp(56px,10vw,96px) clamp(20px,5vw,60px)', position: 'relative' }}
      aria-label="За кого е"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-700 md:text-sm">
          За кого е Clicka?
        </p>
        <h2
          className={`mt-5 text-balance text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          Работиш с часове?
        </h2>
        <p
          className="mx-auto mt-3 max-w-xl text-[clamp(1.1rem,2.5vw,1.4rem)] font-bold leading-relaxed"
          style={{ color: '#0f0f0f' }}
        >
          Значи{' '}
          <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>Clicka</span>
          {' '}е за теб.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-[clamp(0.9rem,1.8vw,1.05rem)] leading-relaxed text-[var(--muted-foreground)]">
          Clicka е създадена за{' '}
          {['фризьори', 'маникюристи', 'козметици', 'масажисти', 'барбъри', 'гримьори', 'терапевти', 'треньори', 'консултанти', 'груумъри', 'татуисти'].map((p, i, arr) => (
            <span key={p}>
              <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>{p}</span>
              {i < arr.length - 1 ? ', ' : ' '}
            </span>
          ))}
          и всички салони, които искат собствен сайт, онлайн резервации и пълен контрол над бизнеса си.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-[clamp(0.95rem,2vw,1.1rem)] font-semibold leading-relaxed" style={{ color: '#0f0f0f' }}>
          И най-важното е{' '}
          <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ЛЕСЕН</span>
          {' '}контрол
        </p>
      </div>
      <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, #ffffff 40%, transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}

/* ── Feature flow config (pink/rose palette) ─────────── */

const FLOW_STYLE = [
  {
    bg: '#fff1f2',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.72)',
    line: 'rgba(255,241,242,0.9)',
    accent: '#be123c',
  },
  {
    bg: '#ffe4e6',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.72)',
    line: 'rgba(255,228,230,0.9)',
    accent: '#be123c',
  },
  {
    bg: '#fecdd3',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.78)',
    line: 'rgba(254,205,211,0.9)',
    accent: '#9f1239',
  },
  {
    bg: '#fda4af',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.82)',
    line: 'rgba(253,164,175,0.9)',
    accent: '#881337',
  },
  {
    bg: '#fb7185',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.88)',
    line: 'rgba(251,113,133,0.9)',
    accent: '#fee2e2',
  },
  {
    bg: '#f43f5e',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.88)',
    line: 'rgba(244,63,94,0.9)',
    accent: '#fee2e2',
  },
] as const;

const FLOW_HEADINGS = [
  'Онлайн\nрезервации',
  'Твоят\nдомейн',
  'Google\nревюта',
  'SEO\n100/100',
  'AI\nрецепционист',
  'От\nтелефона',
] as const;

/* ── Price list AI import section ────────────────────── */

export function PriceListImportSection() {
  return (
    <section
      aria-label="Качи ценоразпис"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(48px,9vw,96px) clamp(20px,5vw,60px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,56px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Без ръчно въвеждане
          </p>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 14, color: '#0f0f0f' }}>
            Качи снимка на ценоразписа.<br />
            <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI добавя всичко за секунди.
            </span>
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: '#666', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Снимай ценоразписа си, качи снимката в Telegram бота и мигновено всичките ти услуги са в сайта!
          </p>
        </div>

        {/* Flow: price list → AI → bot result → site */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'clamp(12px,3vw,32px)',
          alignItems: 'end',
        }}>

          {/* 1: real price list photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src="/images/IMG_2403.jpg"
                alt="Ценоразпис — Diana Stoyanova"
                width={560}
                height={900}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>1</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Снимка на ценоразписа</p>
            </div>
          </div>


          {/* 2: Telegram bot screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '100%' }}>
              <Image
                src="/images/IMG_1817 2.jpg"
                alt="Telegram бот @clickabot — добавени услуги от ценоразпис"
                width={560}
                height={900}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>2</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>AI чете за секунди</p>
            </div>
          </div>


          {/* 3: real site screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src="/images/IMG_1819.jpg"
                alt="Услугите вече в сайта — salonurban.online"
                width={560}
                height={900}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>3</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Готови за резервиране</p>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(28px,4vw,44px)' }}>
          <p style={{ fontSize: 14, color: '#888' }}>
            Работи с всякакъв ценоразпис - ръкописен, принтиран, скрийншот или снимка.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Features (FlowArt fullscreen scroll) ────────────── */

export function TelegramManagementSection() {
  return (
    <section
      aria-label="Управление от Telegram"
      style={{
        background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)',
        padding: 'clamp(48px,9vw,96px) clamp(20px,5vw,60px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Твоят AI асистент
          </p>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 14, color: '#0f0f0f' }}>
            <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Управляваш всичко с едно съобщение.</span>
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: '#666', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Добавяй услуги, снимки, променяй работното си време, записвай часове и виждай резервациите си директно в <span style={{ color: '#229ED9', fontWeight: 700 }}>Telegram</span>, веднага.
          </p>
        </div>

        {/* Screenshots grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'clamp(10px,2.5vw,24px)',
          alignItems: 'start',
        }}>
          {[
            { src: '/images/IMG_1821.jpg', alt: 'Записване на клиент и добавяне на услуга' },
            { src: '/images/IMG_1826 2.jpg', alt: 'Преместване на резервация и бележки за клиент' },
            { src: '/images/IMG_1822.jpg', alt: 'Качване на снимки за портфолио' },
            { src: '/images/IMG_1823.jpg', alt: 'Снимките добавени в галерията' },
          ].map((img) => (
            <div key={img.src} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src={img.src}
                alt={img.alt}
                width={560}
                height={900}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MAIN_FEATURES = [
  'Собствен сайт, а не профил в платформа',
  '0% комисионна върху резервациите',
  'AI асистент в Telegram',
  'Онлайн плащания и депозити',
  'Автоматични имейли и известия',
  'Google ревюта, които работят за твоя бранд',
  'Хостинг, SSL и поддръжка включени',
  'Всичко управляваш от телефона си',
];

const EXTRA_BADGES = [
  'SEO 100/100', 'Блог', 'Собствен домейн', 'Неограничени посещения',
  'Неограничена галерия', 'AI рецепционист', 'SMS напомняния',
];

export function MarketingFeaturesSection() {
  return (
    <section
      id="features"
      data-home-section="features"
      aria-label="Какво получаваш"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(56px,10vw,96px) clamp(20px,5vw,60px)', position: 'relative' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(32px,5vw,48px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Какво получаваш
          </p>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 10, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Защо салоните избират Clicka?
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.6, maxWidth: 520 }}>
            Всичко необходимо, за да работи салонът ти онлайн.
          </p>
        </div>

        {/* Main features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 clamp(28px,4vw,40px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MAIN_FEATURES.map((f, i) => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}>
                <defs><linearGradient id={`fg${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e11d48"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs>
                <path d="M20 6L9 17l-5-5" stroke={`url(#fg${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 'clamp(15px,1.8vw,17px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.5 }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* Extra badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXTRA_BADGES.map((b) => (
            <span key={b} style={{
              fontSize: 12, fontWeight: 600, padding: '5px 12px',
              borderRadius: 999,
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg,#e11d48,#a855f7) border-box',
              border: '1.5px solid transparent',
              color: '#db2777',
            }}>{b}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works (3 steps) ───────────────────────────── */

export function MarketingStepsSection() {
  return (
    <section
      id="steps"
      data-home-section="steps"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="steps-h"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="steps-h"
          data-reveal
          className={`mb-3 text-center text-[clamp(1.65rem,4.5vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_STEPS.title}
        </h2>
        <p
          data-reveal
          className="mb-12 text-center text-[clamp(0.875rem,1.5vw,1.05rem)] leading-relaxed text-[var(--muted-foreground)]"
        >
          {MARKETING_STEPS.subtitle}
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {MARKETING_STEPS.steps.map((step, i) => (
            <div
              key={step.number}
              data-reveal
              className="text-center"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-bold text-[var(--primary-foreground)]">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-12 text-center">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт"
            className="h-12 rounded-full px-8 text-base font-semibold"
          />
        </div>
      </div>
    </section>
  );
}

/* ── Comparison (platform vs clicka) ──────────────────── */

export function MarketingComparisonSection() {
  return (
    <section
      id="comparison"
      className="bg-[var(--background)]"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="comparison-h"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="comparison-h"
          data-reveal
          className={`mb-10 text-center text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-[1.12] tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_COMPARISON.title}
        </h2>

        {/* Carousel on mobile, side-by-side on desktop */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 16,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: 8,
        }}>
          {/* Left: platforms */}
          <div
            data-reveal
            style={{
              flex: '0 0 82%',
              scrollSnapAlign: 'start',
              maxWidth: 420,
            }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">
              {MARKETING_COMPARISON.left.title}
            </h3>
            <ul className="space-y-2">
              {MARKETING_COMPARISON.left.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>&#10005;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: clicka */}
          <div
            data-reveal
            style={{
              flex: '0 0 82%',
              scrollSnapAlign: 'start',
              maxWidth: 420,
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e11d48, #db2777, #a855f7) border-box',
              border: '2px solid transparent',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <ClickaLogo size="compact" href={null} className="inline-flex shrink-0" />
            </h3>
            <ul className="space-y-2">
              {MARKETING_COMPARISON.right.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--foreground)]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><defs><linearGradient id="chk" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e11d48"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs><path d="M20 6L9 17l-5-5" stroke="url(#chk)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, marginTop: 10, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="sm:hidden">
          Плъзни за сравнение →
        </p>
      </div>
    </section>
  );
}

/* ── Founder section ──────────────────────────────────── */

const FAQ_ITEMS = [
  { q: 'Мога ли да използвам Clicka без технически умения?', a: 'Да. Clicka е създадена за хора, които не искат да учат сложни системи. Ако можеш да изпратиш съобщение в Telegram, можеш да управляваш сайта си.' },
  { q: 'Колко време отнема създаването на сайта?', a: 'Повечето сайтове са готови за по-малко от 15 минути. Добавяш информацията си и сайтът е онлайн.' },
  { q: 'Трябва ли да въвеждам услугите си ръчно?', a: 'Не. Просто качи снимка на ценоразписа си в Telegram и AI ще създаде услугите автоматично.' },
  { q: 'Как получавам известия за нови резервации?', a: 'Получаваш известия директно в Telegram и по имейл веднага след всяка нова резервация.' },
  { q: 'Мога ли да приемам депозити и онлайн плащания?', a: 'Да. Clicka работи със Stripe и ти позволява да приемаш депозити и плащания с карта директно от клиентите си.' },
  { q: 'На какъв адрес ще е сайтът ми?', a: 'Веднага получаваш сайта си на безплатен адрес tvoiatsalon.clicka.bg и можеш да приемаш резервации ВЕДНАГА!' },
  { q: 'Мога ли да свържа собствен домейн?', a: 'Да! Ако вече имаш домейн (например moiatsalon.com или salondidi.bg), можеш да го свържеш самостоятелно БЕЗ допълнителна такса. Инструкциите ще откриеш в дашборда си в меню Интеграции.' },
  { q: 'Можете ли вие да регистрирате и настроите домейн вместо мен?', a: 'Да. Ако не искаш да се занимаваш с настройките, можем да регистрираме и настроим домейна вместо теб. Услугата се заплаща допълнително и обикновено отнема до 48 часа. Домейнът се регистрира на името на твоята фирма и остава твоя собственост.' },
  { q: 'Мога ли да променям услугите и цените си по всяко време?', a: 'Да. Можеш да добавяш, редактираш или премахваш услуги директно от Telegram.' },
  { q: 'Как да редактирам цени и имена на услугите си?', a: 'Много лесно — просто кажи на Telegram бота "Редактирай ми услуга Х" и той ще се погрижи веднага!' },
  { q: 'Какво става, ако клиент отмени час?', a: 'Резервацията се обновява автоматично и ще получиш известие. При използване на депозити можеш да приложиш собствена политика за анулиране.' },
  { q: 'Мога ли да качвам снимки на работата си?', a: 'Да. Изпращаш снимките на Telegram бота и те автоматично се появяват в галерията на сайта ти.' },
  { q: 'Има ли ограничение за броя резервации?', a: 'Не. Няма ограничение за броя резервации или посещения на сайта.' },
  { q: 'Има ли комисионна върху резервациите?', a: 'Не. Clicka не взима комисионна. Запазваш 100% от приходите си.' },
  { q: 'Къде отиват плащанията от клиентите?', a: 'Директно в твоя Stripe акаунт. Clicka не задържа парите ти и не взима комисионна от плащанията.' },
  { q: 'Какво става ако загубя достъп до Telegram?', a: 'Можеш да свържеш нов Telegram акаунт и да продължиш да управляваш сайта си.' },
  { q: 'Трябва ли ми Google Calendar?', a: 'Не. Clicka има собствена система за управление на резервации и не изисква Google Calendar или Apple Calendar.' },
  { q: 'Колко специалисти мога да добавя?', a: 'SOLO поддържа 1 специалист. TEAM поддържа до 3 специалисти с отделни графици, резервационни линкове, Telegram акаунти и Google календари.' },
  { q: 'Обвързан ли съм с дългосрочен договор?', a: 'Не. Избираш план за 6 или 12 месеца. В края на периода сам решаваш дали да подновиш.' },
  { q: 'Плаща ли се всеки месец?', a: 'Не. Clicka не е месечен абонамент. Избираш план за 6 или 12 месеца и плащаш еднократно за целия период. Няма месечни такси и няма автоматично подновяване. Преди изтичането на периода ще получиш напомняне и сам ще решиш дали да продължиш.' },
  { q: 'Как се извършва плащането?', a: 'Плащането се извършва сигурно чрез Stripe – една от най-използваните платформи за онлайн плащания в света. Данните на картата ти не се съхраняват от Clicka.' },
  { q: 'Какво става след изтичане на периода?', a: 'Ще получиш напомняне преди изтичането. Сам решаваш дали да подновиш за нов период.' },
  { q: 'Мога ли да използвам Clicka, ако вече приемам резервации по телефон?', a: 'Да. Просто добавяй телефонните резервации през Telegram и часовете автоматично ще се блокират за онлайн записване.' },
  { q: 'Какво става, ако клиент ми пише в Instagram или Facebook?', a: 'Изпрати скрийншот или напиши резервацията на Telegram бота. Той ще я добави в системата и ще направи часа недостъпен за нови резервации.' },
  { q: 'Мога ли да затворя определени дни или часове?', a: 'Да. Кажи на Telegram бота кога не работиш и графикът ще се актуализира автоматично.' },
  { q: 'Мога ли да качвам нови снимки по всяко време?', a: 'Да. Изпращаш снимките на Telegram бота и те автоматично се появяват в галерията на сайта ти.' },
  { q: 'Какво става, ако променя цените си?', a: 'Просто изпрати новите цени на Telegram бота. Сайтът се обновява автоматично.' },
  { q: 'Мога ли да използвам собствено лого и цветове?', a: 'Да. Сайтът се персонализира с твоето лого, снимки и стил.' },
  { q: 'Ще виждат ли клиентите ми други салони?', a: 'Не. Сайтът е само за твоя бизнес. Няма конкуренти до теб.' },
  { q: 'Мога ли да използвам Clicka без Stripe?', a: 'Да. Онлайн плащанията и депозитите са по желание.' },
  { q: 'Има ли ограничение за броя клиенти?', a: 'Не. Няма ограничение за броя клиенти, резервации или посещения на сайта.' },
  { q: 'Какво става ако забравя да подновя?', a: 'Ще получиш напомняне преди изтичането на периода, за да решиш дали искаш да продължиш.' },
  { q: 'Мога ли да премина от SOLO към TEAM по-късно?', a: 'Да. Можеш да започнеш самостоятелно и когато екипът ти се разрасне, да преминеш към TEAM план.' },
];

const FAQ_INITIAL_COUNT = 5;

export function MarketingFaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, FAQ_INITIAL_COUNT);

  return (
    <section
      id="faq"
      style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)', position: 'relative' }}
      aria-label="Честo задавани въпроси"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          FAQ
        </p>
        <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 36, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Често задавани въпроси
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {visible.map((item, i) => (
            <div
              key={i}
              style={{ borderBottom: '1px solid #f0e6f6' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', background: 'none', border: 'none', padding: '16px 0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', textAlign: 'left', gap: 12,
                }}
              >
                <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.4 }}>{item.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {open === i && (
                <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#666', lineHeight: 1.7, paddingBottom: 16, margin: 0 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => { setShowAll(v => !v); setOpen(null); }}
          style={{
            marginTop: 20, width: '100%', padding: '14px',
            background: 'none', border: '1.5px solid',
            borderImageSource: 'linear-gradient(135deg,#e11d48,#a855f7)',
            borderImageSlice: 1,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
            backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {showAll
            ? 'Скрий въпросите ↑'
            : `Виж всички въпроси (${FAQ_ITEMS.length - FAQ_INITIAL_COUNT} още) ↓`}
        </button>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}

export function MarketingFounderSection() {
  return (
    <section
      id="founder"
      className="text-center"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(56px,8vw,88px) clamp(20px,5vw,60px)', position: 'relative', marginTop: '-1px' }}
      aria-labelledby="founder-h"
    >
      <div className="mx-auto max-w-xl">
        <h2
          id="founder-h"
          data-reveal
          className={`mb-5 text-[clamp(1.5rem,5vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_FOUNDER.title}
        </h2>
        <p
          data-reveal
          className="text-[clamp(1rem,2.2vw,1.15rem)] font-medium leading-snug text-[var(--foreground)]"
        >
          {'Знаем какво е да работиш с часове, да пазиш стандарта си и да усещаш, че някой друг печели от труда ти. '}
          <span style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>Clicka.bg</span>
          {' е създаден, за да върне контрола при теб.'}
        </p>
        <p
          data-reveal
          className="mt-5 text-[clamp(0.95rem,2vw,1.1rem)] italic leading-relaxed text-[var(--muted-foreground)]"
        >
          <span style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--muted-foreground)' }}>с фокус върху кредото: </span><span style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>„Изграждаш собствен бранд, а не чужда платформа."</span>
        </p>
      </div>

      {/* fade borders to white */}
      <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 50, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff 20%, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}
