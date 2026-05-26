'use client';

import type { ReactNode } from 'react';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { cn } from '@/lib/utils';
import { WHY_US } from '@/lib/marketing-why-us';

const GRADIENT_STYLES = [
  { gradient: 'from-[var(--primary)] to-[var(--chart-3)]', text: 'text-[var(--primary-foreground)]' },
  { gradient: 'from-[var(--chart-2)] to-[var(--chart-4)]', text: 'text-white' },
  { gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-50' },
  { gradient: 'from-amber-400 to-orange-500', text: 'text-orange-50' },
  { gradient: 'from-fuchsia-500 to-[var(--chart-5)]', text: 'text-fuchsia-50' },
  { gradient: 'from-sky-500 to-[var(--chart-2)]', text: 'text-sky-50' },
  { gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-50' },
  { gradient: 'from-rose-500 to-red-600', text: 'text-rose-50' },
] as const;

function colClassForIndex(index: number, total: number): string {
  if (total === 4) {
    return 'col-span-12 md:col-span-6';
  }
  if (index === 0) {
    return 'col-span-12';
  }
  if (index === total - 1 && total % 2 === 1) {
    return 'col-span-12 md:col-span-8 md:col-start-3';
  }
  const row = Math.floor(index / 2);
  const isWide = row % 2 === 0 ? index % 2 === 1 : index % 2 === 0;
  return isWide ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4';
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export function BouncyCardsFeatures() {
  const rows = chunkPairs(
    WHY_US.map((item, index) => ({
      ...item,
      index,
      colClass: colClassForIndex(index, WHY_US.length),
      style: GRADIENT_STYLES[index % GRADIENT_STYLES.length],
    })),
  );

  return (
    <section
      className="cv-defer mx-auto max-w-7xl px-4 py-8 text-[var(--foreground)] md:px-8 lg:py-12"
      aria-labelledby="why-h"
    >
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <div className="hp-label mb-3">
            <span className="hp-dot" />
            За кого е и защо го правим?
          </div>
          <h2
            id="why-h"
            className="font-display text-4xl font-bold leading-tight md:text-5xl"
          >
            Защо да избереш нас?
          </h2>
          <p className="mt-5 text-base font-medium leading-relaxed text-[var(--secondary-foreground)] md:text-lg">
            <strong className="font-bold text-[var(--foreground)]">На 1-во място:</strong>{' '}
            Ние <strong className="font-bold text-[var(--foreground)]">НЕ</strong> сме резервационна
            платформа. Ние предлагаме на бизнеса ти собствен дигитален дом, с идея за максимално
            добро локално позициониране!
          </p>
        </div>
        <ButtonColorful
          href="/create"
          label="Създай сайт сега"
          className="h-11 shrink-0 rounded-full px-5 text-sm font-semibold"
        />
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-12 gap-4">
            {row.map((card) => (
              <FeatureBounceCard key={card.title} card={card} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

type CardData = {
  title: string;
  body: string;
  colClass: string;
  style: (typeof GRADIENT_STYLES)[number];
};

function FeatureBounceCard({ card }: { card: CardData }) {
  const longTitle = card.title.length > 42;
  const longBody = card.body.length > 140;
  const compact = longTitle || longBody;

  return (
    <BounceCard className={card.colClass} compact={compact}>
      <CardTitle compact={compact}>{card.title}</CardTitle>
      <div
        className={cn(
          'absolute bottom-0 left-3 right-3 top-[4.25rem] translate-y-4 rounded-t-xl bg-gradient-to-br p-3.5 md:left-4 md:right-4 md:top-[4.5rem] md:p-4',
          'transition-transform duration-[250ms]',
          'group-hover:translate-y-2 group-hover:rotate-[1.5deg]',
          card.style.gradient,
          compact && 'top-[5.25rem] md:top-[5.5rem]',
        )}
      >
        <p
          className={cn(
            'text-center text-[13px] font-normal leading-relaxed md:text-sm',
            card.style.text,
          )}
        >
          {card.body}
        </p>
      </div>
    </BounceCard>
  );
}

function BounceCard({
  className,
  children,
  compact = false,
}: {
  className?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'hp-bounce-card group relative cursor-default overflow-hidden rounded-2xl bg-[var(--muted)]/45 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.14)] md:p-5',
        compact ? 'min-h-[248px]' : 'min-h-[220px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <h3
      className={cn(
        'mx-auto max-w-md text-center font-medium text-[var(--foreground)]',
        compact ? 'text-base leading-snug md:text-lg' : 'text-lg md:text-xl',
      )}
    >
      {children}
    </h3>
  );
}
