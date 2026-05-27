'use client';

import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import DotPattern from '@/components/ui/dot-pattern-1';
import FlowArt, { FlowSection } from '@/components/ui/flow-art';
import {
  MARKETING_COMPARISON,
  MARKETING_FEATURES,
  MARKETING_FOUNDER,
  MARKETING_STEPS,
} from '@/lib/marketing-home-copy';

/* ── Audience strip ───────────────────────────────────── */

export function MarketingAudienceSection() {
  return (
    <section
      id="audience"
      data-home-section="audience"
      className="bg-[var(--background)]"
      style={{ padding: 'clamp(48px,8vw,72px) clamp(20px,5vw,60px)' }}
      aria-label="За кого е"
    >
      <div className="mx-auto max-w-7xl px-0">
        <div className="relative overflow-hidden border border-rose-300/70 bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
          <DotPattern width={5} height={5} />

          <div className="absolute -left-1.5 -top-1.5 h-3 w-3 bg-gradient-to-br from-rose-400 to-fuchsia-500" />
          <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 bg-gradient-to-br from-rose-400 to-fuchsia-500" />
          <div className="absolute -right-1.5 -top-1.5 h-3 w-3 bg-gradient-to-br from-rose-400 to-fuchsia-500" />
          <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 bg-gradient-to-br from-rose-400 to-fuchsia-500" />

          <div className="relative z-20 mx-auto max-w-6xl px-6 py-10 text-center md:px-10 md:py-14 xl:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 md:text-sm">
              За кого е?
            </p>
            <h2 className="mt-4 text-balance text-[clamp(1.5rem,4.3vw,3rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--foreground)]">
              За фризьори, фризьорски салони, бръснари, маникюристи, козметици, масажисти, груумъри и всеки, който работи с часове
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Feature flow config (pink/rose palette) ─────────── */

const FLOW_STYLE = [
  {
    bg: '#fff1f2',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.55)',
    line: 'rgba(255,241,242,0.9)',
    accent: '#fb7185',
  },
  {
    bg: '#ffe4e6',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.55)',
    line: 'rgba(255,228,230,0.9)',
    accent: '#f97373',
  },
  {
    bg: '#fecdd3',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.55)',
    line: 'rgba(254,205,211,0.9)',
    accent: '#f97373',
  },
  {
    bg: '#fda4af',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.6)',
    line: 'rgba(253,164,175,0.9)',
    accent: '#be123c',
  },
  {
    bg: '#fb7185',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.7)',
    line: 'rgba(251,113,133,0.9)',
    accent: '#fee2e2',
  },
  {
    bg: '#f43f5e',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.7)',
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

/* ── Features (FlowArt fullscreen scroll) ────────────── */

export function MarketingFeaturesSection() {
  const items = MARKETING_FEATURES.items;
  const total = items.length;

  return (
    <section id="features" data-home-section="features" aria-label="Какво получаваш">
      <div className="bg-[var(--background)] px-5 pb-3 pt-7 sm:px-[5vw] sm:pt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
          Какво получаваш?
        </p>
      </div>

      <FlowArt aria-label="Какво получаваш">
        {items.map((item, i) => {
          const s = FLOW_STYLE[i];
          return (
            <FlowSection
              key={item.title}
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
          className="mb-3 text-center text-[clamp(1.65rem,4.5vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--foreground)]"
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
          className="mb-10 text-center text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--foreground)]"
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
          className="mb-5 text-[clamp(1.5rem,5vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)]"
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
