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
  PriceListImportSection,
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
  { id: 'studio', name: 'Студио', price: 599, daily: '1.64', desc: 'без ограничения',  popular: false },
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
    .hp-seo-visual { order: -1; }
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

      {/* ── CLIENT SITE PREVIEW ───────────────────────── */}
      <section
        aria-label="Клиентски сайт"
        style={{
          background: 'linear-gradient(180deg, #fff1f2 0%, #fff 100%)',
          padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
              Твоят сайт
            </p>
            <h2
              className="hp-heading"
              style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 12 }}
            >
              Ето какво виждат твоите клиенти
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
              Готов сайт с онлайн резервации, галерия и пълна информация за салона.
            </p>
          </div>

          {/* mobile-first: big on phone, constrained on desktop */}
          <div style={{ width: '100%', maxWidth: 'min(72vw, 280px)' }}>
            <IPhoneMockup src="/client-demo.mp4" />
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ──────────────────────────────────── */}
      <MarketingAudienceSection />

      {/* ── WHAT YOU GET ──────────────────────────────── */}
      <MarketingFeaturesSection />

      {/* ── DASHBOARD PREVIEW ─────────────────────────── */}
      <section
        aria-label="Дашборд за собственика"
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,60px)',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
              Твоят дашборд
            </p>
            <h2
              className="hp-heading"
              style={{ fontSize: 'clamp(22px,4.5vw,38px)', marginBottom: 12 }}
            >
              Управляваш всичко от телефона
            </h2>
            <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', color: 'var(--muted-foreground)', maxWidth: 520, margin: '0 auto' }}>
              Резервации, услуги, клиенти и настройки — всичко на едно място, само с няколко докосвания.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: 'min(72vw, 280px)' }}>
            <IPhoneMockup src="/dashboard-demo.mp4" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <MarketingStepsSection />

      {/* ── COMPARISON ────────────────────────────────── */}
      <MarketingComparisonSection />

      {/* ── SEO 100/100 ───────────────────────────────── */}
      <section
        className="border-t border-[var(--border)] bg-[var(--card)]"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <h2 id="seo-h" className="hp-heading bg-clip-text" style={{ fontSize: 'clamp(26px,3.8vw,44px)', marginBottom: 20, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', color: 'transparent' }}>
              100/100 SEO резултат в Google
            </h2>

            <p style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--secondary-foreground)', lineHeight: 1.74, margin: 0 }}>
              Това е реалният резултат от Google Lighthouse за нашия демо сайт. Перфектна оценка от 100 от 100.
              Сайтът ти е технически безупречен в очите на Google и излиза напред в локалното търсене.
            </p>
          </div>

          <figure className="hp-seo-visual">
            <Image
              src="/images/lighthouse-seo-100.webp"
              alt="Google Lighthouse SEO резултат 100 от 100"
              width={576}
              height={1024}
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading="lazy"
            />
          </figure>
        </div>

        <div style={{ maxWidth: 760, marginTop: 'clamp(32px, 5vw, 48px)' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12, letterSpacing: '-0.01em' }}>
            Какво означава това за теб?
          </p>
          <SeoBenefitsAccordion benefits={SEO_BENEFITS} />
        </div>
      </section>

      {/* ── FOUNDER ───────────────────────────────────── */}
      <MarketingFounderSection />

      {/* ── PRICING ───────────────────────────────────── */}
      <section
        id="pricing"
        data-home-section="pricing"
        className="border-t border-[var(--border)] bg-[var(--background)]"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
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
