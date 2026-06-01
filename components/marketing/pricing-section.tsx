'use client';

import { Check, X } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';

const alternatives = [
  { label: 'WordPress хостинг', price: '~100 EUR/год.' },
  { label: 'Booking плъгин', price: '~80 EUR/год.' },
  { label: 'Домейн', price: '~15 EUR/год.' },
  { label: 'Настройка от специалист', price: '~300 EUR еднократно' },
];

const included = [
  'Професионален сайт с резервации',
  'Хостинг за цялата година',
  'Неограничени имейли до клиентите',
  'Безплатен домейн (.online)',
  'Свързване на домейна',
  '0% комисионна от резервации',
  'Техническа поддръжка',
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative border-t border-white/[0.06] py-24 sm:py-32"
      aria-labelledby="pricing-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Цена</p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
            id="pricing-title"
          >
            По-малко от чаша кафе на ден.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
            Всичко необходимо за онлайн присъствие на твоя салон — на една годишна цена.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Алтернативата */}
          <Reveal>
            <div className="glass flex h-full flex-col rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30">
                Ако го правиш сам
              </p>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white/40 line-through">
                ~495 EUR+
              </p>
              <p className="mt-1 text-xs text-white/30">само за първата година</p>

              <ul className="mt-8 space-y-4">
                {alternatives.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-3 text-sm text-white/40">
                      <X className="h-4 w-4 shrink-0 text-red-500/60" />
                      {item.label}
                    </span>
                    <span className="shrink-0 text-sm text-white/30">{item.price}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-sm text-white/30">
                И след това — поддържаш, обновяваш и оправяш сам.
              </p>
            </div>
          </Reveal>

          {/* Clicka */}
          <Reveal delay={0.08}>
            <div
              className="relative flex h-full flex-col rounded-3xl p-6 sm:p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(225,29,72,0.08), rgba(168,85,247,0.08))',
                border: '1px solid rgba(225,29,72,0.2)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                С Clicka
              </p>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-5xl font-bold tracking-[-0.04em] text-white">250</p>
                <p className="mb-2 text-lg text-white/50">EUR / год.</p>
              </div>
              <p className="mt-1 text-xs text-white/40">≈ 0,68 EUR на ден · без скрити такси</p>

              <ul className="mt-8 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className="mt-10 inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #a855f7)',
                }}
              >
                Започни сега
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
