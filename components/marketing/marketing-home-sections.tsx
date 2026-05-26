'use client';

import type { ReactNode } from 'react';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { CardSticky, ContainerScroll } from '@/components/ui/card-sticky';
import {
  MARKETING_FEATURES,
  MARKETING_FOUNDER,
  MARKETING_PROBLEM_CARDS,
  MARKETING_PROMISE,
  type MarketingProblemCard,
} from '@/lib/marketing-home-copy';
import { cn } from '@/lib/utils';

/** Същата sans типография като clicka-hero (без serif / font-display). */
const HP_LEAD =
  'text-[clamp(1rem,3.2vw,1.35rem)] font-medium leading-snug tracking-[-0.02em] text-[var(--foreground)]';
const HP_SMALL = 'text-sm font-normal leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]';
const HP_EMPHASIS =
  'text-[clamp(1.05rem,2.6vw,1.25rem)] font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)]';
const HP_SECTION_TITLE =
  'text-[clamp(1.65rem,4.5vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--foreground)]';

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="hp-label">
      <span className="hp-dot" aria-hidden />
      {children}
    </div>
  );
}

function ProseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(HP_LEAD, 'm-0', className)}>{children}</p>;
}

function ProblemCardContent({ card }: { card: MarketingProblemCard }) {
  if (card.variant === 'small') {
    return <p className={cn(HP_SMALL, 'm-0')}>{card.body}</p>;
  }

  if (card.variant === 'emphasis') {
    return (
      <div className="space-y-3">
        <p className={cn(HP_EMPHASIS, 'm-0')}>{card.body}</p>
        {card.kicker ? (
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {card.kicker}
          </p>
        ) : null}
      </div>
    );
  }

  return <p className={cn(HP_LEAD, 'm-0')}>{card.body}</p>;
}

export function MarketingProblemSection() {
  const cardCount = MARKETING_PROBLEM_CARDS.length;

  return (
    <section
      className="hp-section-alt border-t border-[var(--border)]"
      style={{ padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,60px)' }}
      aria-label="Защо собствен сайт"
    >
      <ContainerScroll
        className="mx-auto max-w-2xl"
        style={{ minHeight: `calc(${cardCount} * 52vh)` }}
      >
        {MARKETING_PROBLEM_CARDS.map((card, index) => (
          <CardSticky
            key={card.id}
            index={index}
            incrementY={20}
            incrementZ={2}
            className="top-20 mb-6 sm:top-24"
          >
            <article
              data-reveal
              className="rounded-[calc(var(--radius)*2)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--hp-shadow)] sm:p-8"
              style={{ transitionDelay: `${index * 0.06}s` }}
            >
              <ProblemCardContent card={card} />
            </article>
          </CardSticky>
        ))}
      </ContainerScroll>
    </section>
  );
}

export function MarketingPromiseSection() {
  return (
    <section
      className="hp-section-card border-t border-[var(--border)]"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="promise-h"
    >
      <div className="mx-auto max-w-2xl">
        <SectionLabel>{MARKETING_PROMISE.label}</SectionLabel>

        <h2 id="promise-h" data-reveal className={cn(HP_SECTION_TITLE, 'mb-7')}>
          {MARKETING_PROMISE.title}
        </h2>

        <div className="grid gap-5">
          <p
            className={cn(
              HP_LEAD,
              'm-0 flex flex-wrap items-center gap-x-2 gap-y-2',
            )}
          >
            <ClickaLogo size="compact" href={null} className="inline-flex shrink-0" />
            <span>{MARKETING_PROMISE.introAfterLogo}</span>
          </p>
          {MARKETING_PROMISE.paragraphs.map((para, i) => (
            <ProseBlock key={i}>{para}</ProseBlock>
          ))}
        </div>

        <div data-reveal className="mt-9">
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
      className="hp-section-alt border-t border-[var(--border)]"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="features-h"
    >
      <div className="mx-auto max-w-[1100px]">
        <SectionLabel>{MARKETING_FEATURES.label}</SectionLabel>
        <h2 id="features-h" data-reveal className={cn(HP_SECTION_TITLE, 'mb-10 max-w-xl')}>
          {MARKETING_FEATURES.title}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MARKETING_FEATURES.items.map((item, i) => (
            <article
              key={item.title}
              data-reveal
              className="rounded-[calc(var(--radius)*2)] border border-[var(--border)] bg-[var(--card)] p-7 shadow-[var(--hp-shadow)]"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <h3 className="mb-3 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className={cn(HP_SMALL, 'text-[var(--secondary-foreground)]')}>{item.body}</p>
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
      className="hp-section-card border-t border-[var(--border)] text-center"
      style={{ padding: 'clamp(56px,8vw,88px) clamp(20px,5vw,60px)' }}
      aria-labelledby="founder-h"
    >
      <div className="mx-auto max-w-xl">
        <SectionLabel>{MARKETING_FOUNDER.label}</SectionLabel>
        <h2 id="founder-h" data-reveal className={cn(HP_SECTION_TITLE, 'mb-4')}>
          {MARKETING_FOUNDER.title}
        </h2>
        <ProseBlock className="text-center">{MARKETING_FOUNDER.body}</ProseBlock>
      </div>
    </section>
  );
}
