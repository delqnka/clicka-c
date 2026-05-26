'use client';

import type { ReactNode } from 'react';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  MARKETING_FEATURES,
  MARKETING_FOUNDER,
  MARKETING_PROBLEM,
  MARKETING_PROMISE,
} from '@/lib/marketing-home-copy';

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="hp-label">
      <span className="hp-dot" aria-hidden />
      {children}
    </div>
  );
}

function ProseBlock({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`hp-prose-p ${className}`}
      style={{
        fontSize: 'clamp(16px,1.6vw,18px)',
        lineHeight: 1.75,
        color: 'var(--secondary-foreground)',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

export function MarketingProblemSection() {
  return (
    <section
      className="hp-section-alt"
      style={{
        borderTop: '1px solid var(--border)',
        padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)',
      }}
      aria-labelledby="problem-h"
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2
          id="problem-h"
          data-reveal
          className="font-display"
          style={{
            fontSize: 'clamp(32px,5vw,52px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            marginBottom: 24,
            color: 'var(--foreground)',
          }}
        >
          {MARKETING_PROBLEM.headline}
        </h2>

        <ProseBlock className="mb-8">{MARKETING_PROBLEM.subheadline}</ProseBlock>

        <div
          data-reveal
          style={{
            display: 'grid',
            gap: 20,
            marginBottom: 32,
            padding: '24px 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {MARKETING_PROBLEM.story.split('\n\n').map((para) => (
            <ProseBlock key={para.slice(0, 40)}>{para}</ProseBlock>
          ))}
        </div>

        <p
          data-reveal
          style={{
            fontSize: 'clamp(20px,2.8vw,28px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: 'var(--foreground)',
            margin: '0 0 20px',
          }}
        >
          {MARKETING_PROBLEM.punchline}
        </p>

        <div data-reveal style={{ marginTop: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
              margin: '0 0 6px',
            }}
          >
            {MARKETING_PROBLEM.kicker}
          </p>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--muted-foreground)',
              margin: 0,
            }}
          >
            {MARKETING_PROBLEM.kickerSub}
          </p>
        </div>
      </div>
    </section>
  );
}

export function MarketingPromiseSection() {
  return (
    <section
      className="hp-section-card"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="promise-h"
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <SectionLabel>{MARKETING_PROMISE.label}</SectionLabel>

        <h2
          id="promise-h"
          data-reveal
          className="font-display"
          style={{
            fontSize: 'clamp(28px,4.2vw,48px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 28,
            color: 'var(--foreground)',
          }}
        >
          {MARKETING_PROMISE.title}
        </h2>

        <div style={{ display: 'grid', gap: 20 }}>
          <p
            style={{
              fontSize: 'clamp(16px,1.6vw,18px)',
              lineHeight: 1.75,
              color: 'var(--secondary-foreground)',
              margin: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 8px',
            }}
          >
            <ClickaLogo size="compact" href={null} className="inline-flex shrink-0" />
            <span>{MARKETING_PROMISE.introAfterLogo}</span>
          </p>
          {MARKETING_PROMISE.paragraphs.map((para, i) => (
            <ProseBlock key={i}>{para}</ProseBlock>
          ))}
        </div>

        <div data-reveal style={{ marginTop: 36 }}>
          <ButtonColorful
            href="/create"
            label="Създай своя сайт сега"
            className="h-12 rounded-full px-8 text-base font-semibold"
          />
        </div>
      </div>
    </section>
  );
}

export function MarketingFeaturesSection() {
  return (
    <section
      className="hp-section-alt"
      style={{
        borderTop: '1px solid var(--border)',
        padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)',
      }}
      aria-labelledby="features-h"
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionLabel>{MARKETING_FEATURES.label}</SectionLabel>
        <h2
          id="features-h"
          data-reveal
          className="font-display"
          style={{
            fontSize: 'clamp(28px,4.2vw,48px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 40,
            color: 'var(--foreground)',
            maxWidth: 640,
          }}
        >
          {MARKETING_FEATURES.title}
        </h2>

        <div
          className="hp-features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 16,
          }}
        >
          {MARKETING_FEATURES.items.map((item, i) => (
            <article
              key={item.title}
              data-reveal
              style={{
                transitionDelay: `${i * 0.08}s`,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'calc(var(--radius) * 2)',
                padding: '28px 24px',
                boxShadow: 'var(--hp-shadow)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  margin: '0 0 12px',
                }}
              >
                Блок {i + 1}
              </p>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  margin: '0 0 12px',
                  color: 'var(--foreground)',
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'var(--secondary-foreground)',
                  margin: 0,
                }}
              >
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MarketingFounderSection() {
  return (
    <section
      className="hp-section-card"
      style={{
        borderTop: '1px solid var(--border)',
        padding: 'clamp(56px,8vw,88px) clamp(20px,5vw,60px)',
        textAlign: 'center',
      }}
      aria-labelledby="founder-h"
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <SectionLabel>{MARKETING_FOUNDER.label}</SectionLabel>
        <h2
          id="founder-h"
          data-reveal
          className="font-display"
          style={{
            fontSize: 'clamp(24px,3.5vw,36px)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            marginBottom: 16,
            color: 'var(--foreground)',
          }}
        >
          {MARKETING_FOUNDER.title}
        </h2>
        <ProseBlock>{MARKETING_FOUNDER.body}</ProseBlock>
      </div>
    </section>
  );
}
