'use client';
import '@/app/(marketing)/marketing.css';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  MarketingAudienceSection,
  MarketingFeaturesSection,
  MarketingStepsSection,
  MarketingComparisonSection,
  MarketingFounderSection,
  MarketingFaqSection,
  PriceListImportSection,
  TelegramManagementSection,
} from '@/components/marketing/marketing-home-sections';
import { ClickaHero } from '@/components/ui/clicka-hero';
import { IPhoneMockup } from '@/components/ui/iphone-mockup';
import { MARKETING_PRICING } from '@/lib/marketing-home-copy';
import type { MarketingActivity } from '@/lib/marketing-activity-shared';

type MarketingHomePageProps = {
  activity?: MarketingActivity;
};

const SeoBenefitsAccordion = dynamic(
  () => import('@/components/ui/seo-benefits-accordion').then((m) => ({ default: m.SeoBenefitsAccordion })),
  { ssr: true },
);

function IconCheck({ color = 'var(--primary)' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PLANS = [
  { id: 'solo',   name: 'Solo',   price: 299, daily: '0.82', desc: '1 специалист',     popular: false },
  { id: 'ekip',   name: 'Екип',   price: 399, daily: '1.09', desc: 'до 3 специалисти', popular: true  },
];

const SEO_BENEFITS = [
  {
    title: 'Техническо предимство',
    body: 'Google разбира, че сайтът ти е бърз, сигурен и добре структуриран, което автоматично му дава предимство.',
  },
  {
    title: 'Безплатни посещения',
    body: 'Получаваш безплатен трафик от хора, които вече активно търсят твоите услуги.',
  },
  {
    title: 'Бързина, която продава',
    body: 'Високият SEO резултат означава светкавично бърз сайт на телефона на клиента.',
  },
  {
    title: 'Локално класиране',
    body: 'Твоят салон излиза напред, когато някой в твоя град търси „фризьор" или „козметик".',
  },
];

const PLAN_FEATURES = [
  'Готов сайт за 15 минути',
  'Резервационна система',
  'Google Calendar sync',
  'Telegram нотификации',
  'Email потвърждения',
  'Собствен домейн с 1 клик',
  'Хостинг включен',
];

const SECTION_LINKS = [
  { id: 'audience', label: 'За кого е' },
  { id: 'features', label: 'Какво получаваш' },
  { id: 'steps', label: 'Как работи' },
  { id: 'pricing', label: 'Цени' },
  { id: 'cta', label: 'Старт' },
] as const;

const CSS = `
  .hp {
    font-family: var(--font-client-manrope, 'Manrope', var(--font-body, 'Inter', system-ui, sans-serif));
    font-weight: 400;
    background: var(--background);
    color: var(--foreground);
    overflow-x: hidden;
    color-scheme: light;
  }

  /* Typography tiers for marketing page */
  .hp [style*='var(--muted-foreground)'] {
    font-weight: 300 !important; /* Manrope Light */
  }
  .hp footer p,
  .hp .hp-section-link {
    font-weight: 200 !important; /* Manrope Thin */
  }

  [data-reveal] {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1);
  }

  .hp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 64px;
    background: color-mix(in srgb, var(--background) 93%, transparent);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(16px, 5vw, 60px);
  }

  .hp-section-nav {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    z-index: 95;
    background: color-mix(in srgb, var(--background) 90%, transparent);
    backdrop-filter: blur(16px) saturate(170%);
    -webkit-backdrop-filter: blur(16px) saturate(170%);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .hp-section-nav::-webkit-scrollbar { display: none; }
  .hp-section-nav-wrap {
    display: flex;
    gap: clamp(16px, 4vw, 28px);
    padding: 14px clamp(12px, 4vw, 60px);
    min-width: max-content;
  }
  .hp-section-link {
    display: inline-block;
    padding: 4px 0;
    font-size: 15px;
    font-weight: 300;
    color: var(--muted-foreground);
    background: none;
    border: none;
    border-radius: 0;
    text-decoration: none;
    transition: color .2s ease, text-decoration-color .2s ease;
    white-space: nowrap;
  }
  .hp-section-link:hover {
    color: #ec4899;
  }
  .hp-section-link.active {
    color: #ec4899;
    font-weight: 400;
    text-decoration: underline;
    text-decoration-color: #ec4899;
    text-underline-offset: 4px;
    text-decoration-thickness: 2px;
  }
  @media (min-width: 640px) {
    .hp-section-link { font-size: 13px; }
  }

  .hp-price-card {
    background: var(--card);
    border: 1.5px solid var(--border);
    border-radius: calc(var(--radius) * 3);
    padding: 36px 28px;
    display: flex; flex-direction: column;
    position: relative;
    transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
  }
  .hp-price-card:hover { transform: translateY(-5px); box-shadow: var(--hp-shadow); }
  .hp-price-card.popular {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary), 0 8px 32px color-mix(in srgb, var(--primary) 18%, transparent);
  }

  .hp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 16px;
  }
  @media (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr; } }
  @media (min-width:640px) and (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr 1fr; } }

  .hp-seo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(32px, 5vw, 64px);
    align-items: center;
    max-width: 1100px;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    .hp-seo-grid { grid-template-columns: 1fr; }
    .hp-seo-visual { order: 1; }
  }
  .hp-seo-visual {
    position: relative;
    border-radius: calc(var(--radius) * 2.5);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--hp-shadow);
    background: var(--card);
  }
  .hp-check {
    display:flex; align-items:center; gap:10px;
    font-size:14px; font-weight:300;
    color:var(--secondary-foreground);
    line-height:1.5; padding:4px 0;
  }

  [data-home-section] {
    scroll-margin-top: 128px;
  }

  .hp-heading {
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.12;
    color: var(--foreground);
  }

  @media (prefers-reduced-motion: reduce) {
    [data-reveal] { opacity:1; transform:none; transition:none; }
  }
`;

const HOME_SECTION_IDS = SECTION_LINKS.map((s) => s.id);
const HEADER_OFFSET = 128;

function getHomeSectionElement(id: string): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(`[data-home-section="${id}"]`) ??
    document.getElementById(id)
  );
}

export default function HomePage({ activity }: MarketingHomePageProps = {}) {
  const [activeSection, setActiveSection] = useState<string>('audience');
  const sectionRatiosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      }),
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const ratios = sectionRatiosRef.current;
    ratios.clear();

    const pickActive = () => {
      let bestId = HOME_SECTION_IDS[0];
      let bestRatio = 0;
      for (const id of HOME_SECTION_IDS) {
        const ratio = ratios.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestRatio > 0) setActiveSection(bestId);
    };

    const observers: IntersectionObserver[] = [];

    HOME_SECTION_IDS.forEach((id) => {
      const el = getHomeSectionElement(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            ratios.set(id, entry.intersectionRatio);
          });
          pickActive();
        },
        {
          root: null,
          rootMargin: `-${HEADER_OFFSET}px 0px -45% 0px`,
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      ratios.clear();
    };
  }, []);

  return (
    <div className="hp">
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────── */}
      <header>
      <nav className="hp-nav" aria-label="Главна навигация">
        <ClickaLogo size="nav" priority />
        <ButtonColorful href="/create" label="Стартирай" className="h-9 rounded-full px-5 text-[13px] font-semibold" />
      </nav>
      <nav className="hp-section-nav" aria-label="Навигация по секции">
        <div className="hp-section-nav-wrap">
          {SECTION_LINKS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`hp-section-link ${activeSection === section.id ? 'active' : ''}`}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>
      </header>

      <main id="main-content">
      {/* ── HERO ──────────────────────────────────────── */}
      <ClickaHero activity={activity} />

      {/* ── PRICE LIST AI IMPORT ──────────────────────── */}
      <PriceListImportSection />

      {/* ── TELEGRAM MANAGEMENT ───────────────────────── */}
      <TelegramManagementSection />

      {/* ── COMPARISON ────────────────────────────────── */}
      <MarketingComparisonSection />

      {/* ── CLIENT SITE PREVIEW ───────────────────────── */}
      <section
        aria-label="Клиентски сайт"
        style={{
          background: 'linear-gradient(180deg, #fff 0%, #fff1f2 30%, #fff1f2 100%)',
          padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <h2
              className="hp-heading"
              style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 12, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}
            >
              Ето какво виждат твоите клиенти
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
              Професионален сайт, който работи за теб <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24/7 и приема резервации</span>, дори когато спиш!
            </p>
          </div>

          {/* mobile-first: big on phone, constrained on desktop */}
          <div style={{ width: '100%', maxWidth: 'min(52vw, 200px)' }}>
            <IPhoneMockup src="/vid1.mov" playbackRate={2} blurQuickType blurTimeRange={[44, 57]} />
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ──────────────────────────────────── */}
      <MarketingAudienceSection />

      {/* ── WHAT YOU GET ──────────────────────────────── */}
      <MarketingFeaturesSection />



      {/* ── DEPOSITS ──────────────────────────────────── */}
      <section
        style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
        aria-label="Онлайн плащания"
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#635BFF', letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>stripe</span>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#635BFF', margin: 0 }}>
              интеграция
            </p>
          </div>
          <h2 className="hp-heading" style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
            Приемай депозити онлайн
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
            Клиентите могат да платят депозит още при записването. Парите постъпват директно в твоя Stripe акаунт.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Намалява неявяванията',
              'Приемай плащания с карта',
              'Парите отиват директно при теб',
              'Без комисионна от Clicka',
            ].map((f, i) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <defs><linearGradient id={`dep${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e11d48"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs>
                  <path d="M20 6L9 17l-5-5" stroke={`url(#dep${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── GOOGLE REVIEWS ────────────────────────────── */}
      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 50%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)' }}
        aria-label="Google ревюта"
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Автоматично след резервация
          </p>
          <h2 className="hp-heading" style={{ fontSize: 'clamp(24px,4.5vw,40px)', marginBottom: 16, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
            Събирай повече Google ревюта
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#555', lineHeight: 1.65, marginBottom: 32 }}>
            След всяка завършена резервация клиентът получава автоматична покана да остави ревю.
            Защото Google ревютата имат реална стойност. А ревютата в твоя сайт — почти нямат.
          </p>

          {/* Comparison cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
            {/* Card 1 */}
            <div style={{ borderRadius: 16, border: '1.5px solid #eee', padding: '20px 16px', background: '#fafafa' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Вариант 1</p>
              <p style={{ fontSize: 14, color: '#f59e0b', marginBottom: 6 }}>⭐⭐⭐⭐⭐</p>
              <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.4 }}>"Много съм доволна"</p>
              <p style={{ fontSize: 11, color: '#aaa', marginBottom: 16 }}>на salonani.clicka.bg</p>
              <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>Клиентът мисли:</p>
                <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic', lineHeight: 1.4 }}>"Да бе, те сами са си ги сложили."</p>
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              borderRadius: 16,
              padding: '20px 16px',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg,#e11d48,#a855f7) border-box',
              border: '2px solid transparent',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Вариант 2</p>
              <p style={{ fontSize: 14, color: '#f59e0b', marginBottom: 4 }}>⭐⭐⭐⭐⭐</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', marginBottom: 10 }}>4.9 <span style={{ fontWeight: 400, color: '#888' }}>(187 ревюта)</span></p>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>в Google Business</p>
              <div style={{ borderTop: '1px solid #f3e8ff', paddingTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>Клиентът мисли:</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f0f0f', fontStyle: 'italic', lineHeight: 1.4 }}>"ОК, това е истинско."</p>
              </div>
            </div>
          </div>

          {/* SEO reason */}
          <div style={{ background: '#0f0f0f', borderRadius: 16, padding: '24px 20px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Има още по-важна причина
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              Google ревютата носят клиенти
            </p>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 14, lineHeight: 1.5 }}>
              Когато някой търси:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {['фризьор варна', 'маникюр лозенец', 'козметик бургас'].map(q => (
                <span key={q} style={{ fontSize: 13, color: '#e879f9', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>{q}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 10, lineHeight: 1.5 }}>Google показва:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {['⭐ рейтинг', '💬 брой ревюта', '📍 позиция в картата'].map(item => (
                <p key={item} style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{item}</p>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', backgroundImage: 'linear-gradient(135deg,#e11d48,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.8 }}>
                Повече ревюта<br/>= Повече доверие<br/>= Повече клиенти
              </p>
            </div>
          </div>

          {/* Bottom summary */}
          <div style={{ borderRadius: 16, border: '1.5px solid #eee', padding: '24px 20px', background: '#fff' }}>
            <h3 style={{ fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: 700, color: '#0f0f0f', marginBottom: 12, lineHeight: 1.3 }}>
              Google ревютата работят за теб
            </h3>
            <p style={{ fontSize: 'clamp(14px,1.7vw,16px)', color: '#555', lineHeight: 1.65, marginBottom: 10 }}>
              След всяка завършена резервация клиентът получава покана да остави ревю в Google.
            </p>
            <p style={{ fontSize: 'clamp(14px,1.7vw,16px)', color: '#555', lineHeight: 1.65, margin: 0 }}>
              Новите ревюта автоматично се показват и на сайта ти, за да изграждат доверие и да помагат на повече хора да изберат теб.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEO 100/100 ───────────────────────────────── */}
      <section
        style={{ background: 'linear-gradient(180deg, #fff 0%, #f9fafb 100%)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <h2 id="seo-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(26px,3.8vw,44px)', marginBottom: 16, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', color: 'transparent' }}>
              Откриваем в Google
            </h2>

            <p style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--secondary-foreground)', lineHeight: 1.74, margin: 0 }}>
              Всеки сайт е технически оптимизиран за Google, за да помага на нови клиенти да те намират по-лесно.
            </p>
          </div>

          <figure className="hp-seo-visual" style={{ maxWidth: 220, margin: '0 auto' }}>
            <Image
              src="/images/lighthouse-seo-100.webp"
              alt="Google Lighthouse SEO резултат 100 от 100"
              width={576}
              height={1024}
              sizes="(max-width: 900px) 220px, 220px"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <MarketingFaqSection />

      {/* ── FOUNDER ───────────────────────────────────── */}
      <MarketingFounderSection />

      {/* ── PRICING ───────────────────────────────────── */}
      <section
        id="pricing"
        data-home-section="pricing"
        style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="pricing-h"
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 id="pricing-h" data-reveal className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(28px,4.2vw,50px)', lineHeight: 1.1, marginBottom: 12, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', color: 'transparent' }}>
            {MARKETING_PRICING.title}
          </h2>
          <p data-reveal style={{ fontSize: 'clamp(15px,1.5vw,17px)', fontWeight: 400, color: 'var(--muted-foreground)', marginBottom: 12, lineHeight: 1.67, maxWidth: 720 }}>
            {MARKETING_PRICING.subtitle}
          </p>
          <p data-reveal style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground)', marginBottom: 52, lineHeight: 1.6, maxWidth: 720 }}>
            {MARKETING_PRICING.domainNote}
          </p>

          <div className="hp-pricing-grid">
            {PLANS.map((plan, i) => (
              <div key={plan.id} data-reveal className={`hp-price-card${plan.popular ? ' popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 9999,
                      padding: '4px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                    aria-label="Най-популярен план"
                  >
                    Най-популярен
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <h3 className="hp-heading" style={{ fontSize: 22, margin: '0 0 6px' }}>{plan.name}</h3>
                  <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0 }}>{plan.desc}</p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <span className="hp-heading tabular-nums" style={{ fontSize: 44, letterSpacing: '-0.04em', lineHeight: 1 }}>{plan.price} €</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 4 }}>/ год.</span>
                  <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground)', margin: '6px 0 0' }}>от {plan.daily} € на ден</p>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 28 }}>
                  {PLAN_FEATURES.map((f, fi) => (
                    <div key={fi} className="hp-check">
                      <IconCheck />
                      {f}
                    </div>
                  ))}
                </div>

                <ButtonColorful
                  href={`/create?plan=${plan.id}`}
                  label={`Избери ${plan.name}`}
                  className="h-12 w-full rounded-full text-[15px] font-semibold"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────── */}
      <section
        id="cta"
        data-home-section="cta"
        style={{ background: 'var(--hp-cta-bg)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)', textAlign: 'center' }}
        aria-labelledby="cta-h"
      >
        <div data-reveal style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 id="cta-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.1, marginBottom: 20, backgroundImage: 'linear-gradient(135deg, #fb7185, #e879f9, #c084fc)', color: 'transparent' }}>
            Готов ли си за собствен сайт?
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.6vw,18px)', fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 72%, transparent)', marginBottom: 44, lineHeight: 1.67 }}>
            Попълни данните, избери план и сайтът ти е онлайн за 15 минути.
          </p>
          <ButtonColorful
            href="/create"
            label="Създай своя сайт"
            className="h-14 rounded-full px-12 text-[17px] font-bold"
          />
          <p style={{ marginTop: 20, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            от 0.82 € на ден. 0% комисионна. Без скрити такси.
          </p>
        </div>
      </section>

      </main>

    </div>
  );
}
