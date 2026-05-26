'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WHY_US } from '@/lib/marketing-why-us';

const GRADIENT_STYLES = [
  { gradient: 'from-[var(--primary)] to-[var(--chart-3)]', text: 'text-[var(--primary-foreground)]' },
  { gradient: 'from-[var(--chart-2)] to-[var(--chart-4)]', text: 'text-white' },
  { gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-50' },
  { gradient: 'from-amber-400 to-orange-500', text: 'text-orange-50' },
  { gradient: 'from-fuchsia-500 to-[var(--chart-5)]', text: 'text-fuchsia-50' },
  { gradient: 'from-sky-500 to-[var(--chart-2)]', text: 'text-sky-50' },
  { gradient: 'from-violet-500 to-indigo-600', text: 'text-violet-50' },
  { gradient: 'from-rose-500 to-red-600', text: 'text-rose-50' },
] as const;

function colClassForIndex(index: number, total: number): string {
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
      className="cv-defer mx-auto max-w-7xl px-4 py-12 text-[var(--foreground)] md:px-8 lg:py-16"
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
        <Link
          href="/create"
          className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--card)] shadow-xl transition-transform duration-200 hover:scale-105 hover:bg-[var(--chart-4)] active:scale-95"
        >
          Създай сайт сега →
        </Link>
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

  return (
    <BounceCard className={card.colClass} tall={longTitle}>
      <CardTitle compact={longTitle}>{card.title}</CardTitle>
      <div
        className={cn(
          'absolute bottom-0 left-4 right-4 top-28 translate-y-8 rounded-t-2xl bg-gradient-to-br p-4 md:top-32',
          'transition-transform duration-[250ms]',
          'group-hover:translate-y-4 group-hover:rotate-[2deg]',
          card.style.gradient,
          longTitle && 'top-36 md:top-40',
        )}
      >
        <p
          className={cn(
            'text-center text-sm font-normal leading-relaxed md:text-[15px]',
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
  tall = false,
}: {
  className?: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={cn(
        'hp-bounce-card group relative cursor-default overflow-hidden rounded-2xl bg-[var(--muted)] p-6 md:p-8',
        tall ? 'min-h-[340px]' : 'min-h-[300px]',
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
        'mx-auto max-w-md text-center font-bold text-[var(--foreground)]',
        compact ? 'text-lg leading-snug md:text-xl' : 'text-xl md:text-2xl lg:text-3xl',
      )}
    >
      {children}
    </h3>
  );
}
