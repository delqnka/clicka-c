'use client';

import { CLICKA_MARKETING_GRADIENT } from '@/lib/clicka-marketing-site';
import type { ServiceCategoryTab } from '@/lib/salon-service-categories';

type SalonServiceCategoryTabsProps = {
  categories: ServiceCategoryTab[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  size?: 'sm' | 'md';
  className?: string;
};

/** Text category filter — horizontal scroll, all labels in black. */
export function SalonServiceCategoryTabs({
  categories,
  selectedId,
  onSelect,
  size = 'md',
  className = '',
}: SalonServiceCategoryTabsProps) {
  const named = categories.filter((c) => c.id != null);
  if (named.length === 0) return null;

  const textClass = size === 'sm' ? 'text-[12px]' : 'text-sm';

  return (
    <div
      className={`flex items-center gap-4 overflow-x-auto pb-0.5 scrollbar-none ${textClass} ${className}`.trim()}
      role="tablist"
      aria-label="Категории услуги"
    >
      {categories.map((cat) => {
        const active = selectedId === cat.id;
        return (
          <span
            key={cat.id ?? 'all'}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => onSelect(cat.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(cat.id);
              }
            }}
            className={`relative inline-block shrink-0 cursor-pointer select-none whitespace-nowrap pb-1.5 font-bold text-black transition ${
              active ? '' : 'hover:opacity-80'
            }`}
          >
            {cat.label}
            <span
              aria-hidden
              className="absolute bottom-0 left-0 h-[2px] rounded-full transition-[width,opacity] duration-200"
              style={{
                width: active ? '100%' : '0%',
                opacity: active ? 1 : 0,
                backgroundImage: CLICKA_MARKETING_GRADIENT,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
