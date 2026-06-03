'use client';

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
      className="relative overflow-hidden bg-rose-50"
      style={{ padding: 'clamp(24px,4vw,40px) 0 clamp(56px,10vw,96px)' }}
      aria-label="За кого е"
    >
      <style>{`
        @keyframes aud-marquee   { from { transform: translateX(0) }    to { transform: translateX(-50%) } }
        @keyframes aud-marquee-r { from { transform: translateX(-50%) } to { transform: translateX(0) } }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-700 md:text-sm">
          За кого е?
        </p>
        <h2
          className={`mt-5 text-balance text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_AUDIENCE.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[clamp(0.95rem,2vw,1.1rem)] leading-relaxed text-[var(--muted-foreground)]">
          {MARKETING_AUDIENCE.subtitle}
        </p>
      </div>

      <div
        className="relative mt-10 space-y-3 overflow-hidden"
        aria-hidden="true"
        style={{
          maskImage: 'linear-gradient(to right, transparent 2%, black 12%, black 88%, transparent 98%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 2%, black 12%, black 88%, transparent 98%)',
        }}
      >
        <MarqueeRow tags={TAGS_ROW_1} duration={35} />
        <MarqueeRow tags={TAGS_ROW_2} duration={28} reverse />
      </div>
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
  'Calendar\nsync',
  'От\nтелефона',
] as const;

/* ── Price list AI import section ────────────────────── */

export function PriceListImportSection() {
  const services = [
    { cat: 'КОСА', items: ['Дамско подстригване — 40 €', 'Мъжко подстригване — 25 €', 'Боядисване на цяла коса — 95 €', 'Боядисване на корен — 70 €', 'Измиване и сешоар — 35 €'] },
    { cat: 'МАНИКЮР', items: ['Маникюр — 40 €', 'Педикюр — 55 €', 'Гел маникюр — 45 €', 'Нокт­опластика — 85 €'] },
  ];

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
            Снимай ценоразписа от стената, изпрати го в Telegram бота и готово — всичките ти услуги са в сайта.
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(24px,4vw,48px)',
          alignItems: 'center',
        }}>

          {/* Left: price list photo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{
              background: '#f5f0eb',
              borderRadius: 16,
              padding: 'clamp(20px,3vw,32px)',
              width: '100%',
              maxWidth: 320,
              fontFamily: 'serif',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              position: 'relative',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>Салон Urban</p>
                <p style={{ fontSize: 'clamp(28px,6vw,42px)', fontWeight: 900, fontStyle: 'italic', color: '#0f0f0f', lineHeight: 1 }}>ЦЕНОРАЗПИС</p>
              </div>
              {services.map((group) => (
                <div key={group.cat} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8, color: '#0f0f0f' }}>{group.cat}:</p>
                  {group.items.map((item) => {
                    const [name, price] = item.split(' — ');
                    return (
                      <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#333', marginBottom: 4 }}>
                        <span>{name}</span>
                        <span style={{ fontWeight: 600 }}>{price}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>Снимка на ценоразписа</p>
          </div>

          {/* Middle: arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 60 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg,#e11d48,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(219,39,119,0.35)',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#db2777', letterSpacing: '0.05em', textAlign: 'center' }}>AI парсира</span>
          </div>

          {/* Right: Telegram bot mockup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{
              background: '#1a1a2e',
              borderRadius: 20,
              padding: 'clamp(16px,2.5vw,24px)',
              width: '100%',
              maxWidth: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
              {/* Bot header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>C</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>@clickabot</p>
                  <p style={{ fontSize: 10, color: '#888', margin: 0 }}>bot</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* User sends photo */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: '#7c3aed', borderRadius: '12px 12px 2px 12px', padding: '8px 12px', maxWidth: '75%' }}>
                    <div style={{ width: 80, height: 56, background: '#f5f0eb', borderRadius: 6, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 18 }}>🖼️</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#e0d7ff', margin: 0 }}>ценоразпис</p>
                  </div>
                </div>

                {/* Bot typing */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', flexShrink: 0 }} />
                  <div style={{ background: '#2a2a3e', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', maxWidth: '85%' }}>
                    <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
                      🔍 Анализирам ценоразписа...
                    </p>
                  </div>
                </div>

                {/* Bot result */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', flexShrink: 0 }} />
                  <div style={{ background: '#2a2a3e', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', maxWidth: '85%' }}>
                    <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, margin: '0 0 6px' }}>✅ Добавени 9 услуги:</p>
                    {['✂️ Дамско подстригване — 40 €', '✂️ Боядисване — 95 €', '💅 Маникюр — 40 €', '💅 Гел маникюр — 45 €'].map(line => (
                      <p key={line} style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0' }}>{line}</p>
                    ))}
                    <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', fontStyle: 'italic' }}>и още 5...</p>
                  </div>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>Telegram бот — @clickabot</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
            Работи с всякакъв ценоразпис — ръкописен, принтиран, на табло или в Excel.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Features (FlowArt fullscreen scroll) ────────────── */

export function MarketingFeaturesSection() {
  const items = MARKETING_FEATURES.items;
  const total = items.length;

  return (
    <section id="features" data-home-section="features" aria-label="Какво получаваш">
      <div className="bg-[var(--background)] px-5 pb-3 pt-7 sm:px-[5vw] sm:pt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
          Какво получаваш?
        </p>
      </div>

      <FlowArt aria-label="Какво получаваш">
        {items.map((item, i) => {
          const s = FLOW_STYLE[i];
          return (
            <FlowSection
              key={item.title}
              index={i}
              aria-label={item.title}
              style={{ backgroundColor: s.bg, color: s.fg }}
            >
              <div>
                <p
                  className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{
                    color: s.accent,
                    background:
                      s.fg === '#fff'
                        ? 'rgba(0,0,0,0.12)'
                        : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </p>

                <hr
                  className="mt-[4vw] sm:mt-[2vw]"
                  style={{ border: 'none', borderTop: `1px solid ${s.line}` }}
                />

                <h2
                  className="mt-[4vw] sm:mt-[2vw] text-[clamp(3rem,12vw,10rem)] font-bold leading-[0.85] uppercase tracking-tight"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {FLOW_HEADINGS[i]}
                </h2>
              </div>

              <div className="mt-auto">
                <hr
                  className="mb-[4vw] sm:mb-[2vw]"
                  style={{ border: 'none', borderTop: `1px solid ${s.line}` }}
                />
                <p
                  className="max-w-[45ch] text-[clamp(1rem,3.5vw,1.35rem)] leading-relaxed"
                  style={{ color: s.sub }}
                >
                  {item.body}
                </p>
              </div>
            </FlowSection>
          );
        })}
      </FlowArt>
    </section>
  );
}

/* ── How it works (3 steps) ───────────────────────────── */

export function MarketingStepsSection() {
  return (
    <section
      id="steps"
      data-home-section="steps"
      className="border-t border-[var(--border)] bg-[var(--card)]"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
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
      className="border-t border-[var(--border)] bg-[var(--background)]"
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Left: platforms */}
          <div
            data-reveal
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7"
          >
            <h3 className="mb-5 text-lg font-bold text-[var(--foreground)]">
              {MARKETING_COMPARISON.left.title}
            </h3>
            <ul className="space-y-3">
              {MARKETING_COMPARISON.left.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>&#10005;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: clicka */}
          <div
            data-reveal
            className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--card)] p-7"
            style={{ transitionDelay: '0.1s' }}
          >
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-[var(--foreground)]">
              <ClickaLogo size="compact" href={null} className="inline-flex shrink-0" />
            </h3>
            <ul className="space-y-3">
              {MARKETING_COMPARISON.right.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[var(--foreground)]">
                  <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden>&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Founder section ──────────────────────────────────── */

export function MarketingFounderSection() {
  return (
    <section
      id="founder"
      className="border-t border-[var(--border)] bg-[var(--card)] text-center"
      style={{ padding: 'clamp(56px,8vw,88px) clamp(20px,5vw,60px)' }}
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
          {MARKETING_FOUNDER.body}
        </p>
      </div>
    </section>
  );
}
