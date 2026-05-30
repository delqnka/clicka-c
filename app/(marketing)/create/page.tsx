'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';

const PLANS = [
  { id: 'solo',   name: 'Solo',   price: 299, daily: '0.82', desc: '1 специалист' },
  { id: 'ekip',   name: 'Екип',   price: 399, daily: '1.09', desc: 'до 3 специалисти', popular: true },
  { id: 'studio', name: 'Студио', price: 599, daily: '1.64', desc: 'без ограничения' },
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

function IconCheck({ color = 'var(--primary)' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CreatePageContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const initialPlan = planParam || 'ekip';
  const [planId, setPlanId]             = useState(() => PLANS.some(p => p.id === initialPlan) ? initialPlan : 'ekip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(!planParam);

  async function handlePay() {
    if (!planId) { setError('Избери план.'); return; }
    if (!termsAccepted) { setError('Моля, приемете условията и правилата.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('Няма линк за плащане');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при пренасочване');
      setIsSubmitting(false);
    }
  }

  const selectedPlan = PLANS.find(p => p.id === planId);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]" style={{ fontFamily: "var(--font-body, 'Inter', system-ui, sans-serif)" }}>
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border)] px-[clamp(16px,5vw,60px)]"
        style={{
          background: 'color-mix(in srgb, var(--background) 93%, transparent)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
        aria-label="Навигация"
      >
        <ClickaLogo size="nav" />
        <a href="/" className="text-[13px] font-semibold text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">← Начало</a>
      </nav>

      {/* CONTENT */}
      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-10">

        {/* ── Pre-selected plan summary (when coming from homepage) ── */}
        {!showPlanPicker && selectedPlan && (
          <>
            <h1
              className="mb-3 bg-clip-text text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' }}
            >
              Избрахте план {selectedPlan.name}
            </h1>
            <p className="mb-8 text-[clamp(0.875rem,2vw,1.05rem)] leading-relaxed text-[var(--muted-foreground)]">
              След плащане ще получиш код на имейла си и ще можеш да създадеш сайта.
            </p>

            {/* Selected plan card */}
            <div className="rounded-2xl border-2 border-rose-500 bg-[var(--card)] p-6 shadow-[0_0_0_1px_#f43f5e,0_8px_32px_rgba(244,63,94,0.12)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">{selectedPlan.name}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">{selectedPlan.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[var(--foreground)]">{selectedPlan.price} €</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">от {selectedPlan.daily} € / ден</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-4">
                {PLAN_FEATURES.map(f => (
                  <span key={f} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                    <IconCheck />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPlanPicker(true)}
              className="mt-3 text-[13px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
            >
              Промени плана →
            </button>
          </>
        )}

        {/* ── Plan picker (default or expanded) ── */}
        {showPlanPicker && (
          <>
            <h1
              className="mb-3 bg-clip-text text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' }}
            >
              Избери план
            </h1>
            <p className="mb-10 text-[clamp(0.875rem,2vw,1.05rem)] leading-relaxed text-[var(--muted-foreground)]">
              След плащане ще получиш код на имейла си и ще можеш да създадеш сайта.
            </p>

            {/* Plan cards */}
            <div className="flex flex-col gap-3">
              {PLANS.map(p => {
                const isSelected = planId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className={`relative rounded-2xl border-[1.5px] bg-[var(--card)] p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] ${
                      isSelected
                        ? 'border-rose-500 shadow-[0_0_0_1px_#f43f5e,0_8px_32px_rgba(244,63,94,0.18)]'
                        : p.popular
                          ? 'border-rose-300'
                          : 'border-[var(--border)]'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-white">
                        Най-популярен
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        {/* Radio dot */}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all ${
                            isSelected
                              ? 'border-rose-500 bg-rose-500'
                              : 'border-[var(--border)] bg-[var(--card)]'
                          }`}
                        >
                          {isSelected && <span className="h-[7px] w-[7px] rounded-full bg-white" />}
                        </span>
                        <div>
                          <p className="text-[17px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">{p.name}</p>
                          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">{p.desc}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[22px] font-bold tabular-nums tracking-[-0.04em] text-[var(--foreground)]">{p.price} €</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">от {p.daily} € / ден</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] pt-4">
                        {PLAN_FEATURES.map(f => (
                          <span key={f} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                            <IconCheck />
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Terms checkbox ── */}
        <label className="mt-8 flex cursor-pointer items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all ${
              termsAccepted
                ? 'border-rose-500 bg-rose-500'
                : 'border-[var(--border)] bg-[var(--card)]'
            }`}
            onClick={() => setTermsAccepted(v => !v)}
            role="checkbox"
            aria-checked={termsAccepted}
            tabIndex={0}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setTermsAccepted(v => !v); } }}
          >
            {termsAccepted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span
            className="text-[13px] leading-snug text-[var(--muted-foreground)]"
            onClick={() => setTermsAccepted(v => !v)}
          >
            Съгласявам се с{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rose-500 underline underline-offset-2 hover:text-rose-600"
              onClick={e => e.stopPropagation()}
            >
              условията и правилата
            </a>{' '}
            на CLicka.bg
          </span>
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            Домейн (по желание)
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            Техническа администрация и конфигуриране: <strong>25 EUR</strong> (еднократно). Цената на домейна е отделно за 1 година:
            {' '}
            <strong>.com 12 EUR</strong>, <strong>.bg 30 EUR</strong>, <strong>.org 8 EUR</strong>, <strong>.info 8 EUR</strong>.
          </p>
        </div>

        {/* Pay button */}
        <div className="mt-6">
          <ButtonColorful
            label={isSubmitting ? 'Пренасочване към Stripe…' : `Плати ${selectedPlan?.price ?? 399} € →`}
            onClick={handlePay}
            disabled={isSubmitting || !planId || !termsAccepted}
            className="h-12 w-full rounded-full text-[15px] font-bold"
          />
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
          {['0% комисионна', 'Сигурно плащане', 'Готов за 15 мин'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
              <IconCheck color="#22C55E" />
              {t}
            </span>
          ))}
        </div>

        <p className="mt-5 text-center text-[13px] text-[var(--muted-foreground)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1 inline align-middle" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Сигурно плащане чрез Stripe. Можеш да смениш плана по всяко време.
        </p>
      </div>
    </div>
  );
}

function CreatePageFallback() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]"
      style={{ fontFamily: "var(--font-body, 'Inter', system-ui, sans-serif)" }}
    >
      Зареждане…
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreatePageFallback />}>
      <CreatePageContent />
    </Suspense>
  );
}
