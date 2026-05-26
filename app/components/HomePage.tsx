'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import Image from 'next/image';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  MarketingFeaturesSection,
  MarketingFounderSection,
  MarketingProblemSection,
  MarketingPromiseSection,
} from '@/components/marketing/marketing-home-sections';
import { ClickaHero } from '@/components/ui/clicka-hero';
import { MARKETING_PRICING } from '@/lib/marketing-home-copy';
import type { MarketingActivity } from '@/lib/marketing-activity-shared';

type MarketingHomePageProps = {
  activity?: MarketingActivity;
};

const SeoBenefitsAccordion = dynamic(
  () => import('@/components/ui/seo-benefits-accordion').then((m) => ({ default: m.SeoBenefitsAccordion })),
  { ssr: false },
);

function IconCheck({ color = 'var(--primary)' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Data
═══════════════════════════════════════════════════════════ */
const PLANS = [
  { id: 'solo',   name: 'Solo',   price: 299, daily: '0.82', desc: '1 специалист',     popular: false },
  { id: 'ekip',   name: 'Екип',   price: 399, daily: '1.09', desc: 'до 3 специалисти', popular: true  },
  { id: 'studio', name: 'Студио', price: 599, daily: '1.64', desc: 'без ограничения',  popular: false },
];

const SEO_BENEFITS = [
  {
    title: 'Техническо предимство',
    body: 'Google разбира, че сайтът ти е бърз, сигурен и добре структуриран, което автоматично му дава предимство. Как това ти носи нови клиенти?',
  },
  {
    title: 'Безплатни посещения',
    body: 'Получаваш безплатен трафик от хора, които вече активно търсят твоите услуги.',
  },
  {
    title: 'Бързина, която продава',
    body: 'Високият SEO резултат означава и светкавично бърз сайт на телефона на клиента, което ги подтиква да направят резервация.',
  },
  {
    title: 'Гарантирано класиране',
    body: 'Твоят салон ще излиза много по-напред, когато някой в твоя град търси „фризьор в центъра“ или „добър козметик“.',
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

/* ═══════════════════════════════════════════════════════════
   Scoped CSS — uses .hp theme tokens from globals.css
═══════════════════════════════════════════════════════════ */
const CSS = `
  .hp {
    font-family: var(--font-body, 'Inter', system-ui, sans-serif);
    background: #ffffff;
    background: var(--background);
    color: var(--foreground);
    overflow-x: hidden;
    color-scheme: light;
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
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(16px, 5vw, 60px);
  }

  .hp-label {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--muted-foreground); margin-bottom: 16px;
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
    font-size:14px; font-weight:400;
    color:var(--secondary-foreground);
    line-height:1.5; padding:4px 0;
  }

  .hp-section-alt { background: var(--background); }
  .hp-section-card { background: var(--card); border-top: 1px solid var(--border); }
  .hp-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--primary); display: inline-block; }

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

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function HomePage({ activity }: MarketingHomePageProps = {}) {
  /* Scroll reveal */
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

  return (
    <div className="hp">
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <header>
      <nav className="hp-nav" aria-label="Главна навигация">
        <ClickaLogo size="nav" priority />
        <ButtonColorful href="/create" label="Стартирай" className="h-9 rounded-full px-5 text-[13px] font-semibold" />
      </nav>
      </header>

      <main id="main-content">
      {/* ── HERO ────────────────────────────────────────────── */}
      <ClickaHero activity={activity} />

      <MarketingProblemSection />
      <MarketingPromiseSection />
      <MarketingFeaturesSection />
      <MarketingFounderSection />

      {/* ── SEO 100/100 ─────────────────────────────────────── */}
      <section
        className="hp-section-card cv-defer"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <div className="hp-label">
              <span className="hp-dot" />
              SEO резултат
            </div>

            <h2 id="seo-h" className="hp-heading" style={{ fontSize: 'clamp(26px,3.8vw,44px)', marginBottom: 20 }}>
              Постигни невъзможното:<br />100/100 SEO резултат
            </h2>

            <p style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--secondary-foreground)', lineHeight: 1.74, margin: 0 }}>
              Докато другите само говорят за SEO, ние го доказваме. Това е реалният резултат от теста на Google Lighthouse
              за нашия демо сайт — перфектна оценка от 100 от 100 за SEO оптимизация. Това означава, че сайтът ти е
              технически безупречен в очите на Google. Това е твоят билет за предна линия в локалното търсене.
            </p>
          </div>

          <figure className="hp-seo-visual">
            <Image
              src="/images/lighthouse-seo-100.webp"
              alt="Google Lighthouse SEO резултат 100 от 100 и мобилен сайт на салон — Google те обича, а с него и клиентите в твоя град"
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
            Какво получаваш с този перфектен резултат?
          </p>
          <SeoBenefitsAccordion benefits={SEO_BENEFITS} />
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section
        className="hp-section-card"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="pricing-h"
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="hp-label">
            <span className="hp-dot" />
            07 · Цени
          </div>

          <h2 id="pricing-h" data-reveal className="hp-heading" style={{ fontSize: 'clamp(28px,4.2vw,50px)', lineHeight: 1.1, marginBottom: 12 }}>
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
                  href="/create"
                  label={`Избери ${plan.name}`}
                  className="h-12 w-full rounded-full text-[15px] font-semibold"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section
        style={{ background: 'var(--hp-cta-bg)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)', textAlign: 'center' }}
        aria-labelledby="cta-h"
      >
        <div data-reveal style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 id="cta-h" className="hp-heading" style={{ fontSize: 'clamp(30px,5vw,58px)', lineHeight: 1.1, color: 'var(--hp-cta-fg)', marginBottom: 20 }}>
            Готов ли си да спреш<br />да даваш % на другите?
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.6vw,18px)', fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 55%, transparent)', marginBottom: 44, lineHeight: 1.67 }}>
            Попълни данните, избери план, плати — и сайтът ти е онлайн.<br />
            Без процент от резервациите. Без скрити такси.
          </p>
          <ButtonColorful
            href="/create"
            label="Стартирай сега"
            className="h-14 rounded-full px-12 text-[17px] font-bold"
          />
          <p style={{ marginTop: 20, fontSize: 13, fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 35%, transparent)' }}>
            от 0.82 € / ден · без скрити такси · без комисионна
          </p>
        </div>
      </section>

      </main>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: 'var(--hp-cta-bg)', borderTop: '1px solid color-mix(in srgb, var(--hp-cta-fg) 12%, transparent)', padding: 'clamp(28px,4vw,44px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <ClickaLogo size="footer" variant="on-dark" href={null} />
          <p style={{ fontSize: 13, fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 30%, transparent)', margin: 0 }}>
            © {new Date().getFullYear()} clicka.bg · Всички права запазени
          </p>
        </div>
      </footer>
    </div>
  );
}

