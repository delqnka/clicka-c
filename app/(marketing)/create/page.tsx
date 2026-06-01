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
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [eik, setEik] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  async function handlePay() {
    if (!planId) { setError('Избери план.'); return; }
    if (!termsAccepted) { setError('Моля, приемете условията и правилата.'); return; }
    if (wantsInvoice) {
      if (!companyName.trim()) { setError('Въведи наименование на фирмата.'); return; }
      if (!/^\d{9}$/.test(eik.trim())) { setError('ЕИК трябва да е точно 9 цифри.'); return; }
      if (vatNumber.trim() && !/^BG\d{9,10}$/i.test(vatNumber.trim())) {
        setError('ДДС номерът трябва да е във формат BG123456789.'); return;
      }
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: planId,
          ...(wantsInvoice && {
            billingInfo: {
              companyName: companyName.trim(),
              eik: eik.trim(),
              vatNumber: vatNumber.trim() || null,
            },
          }),
        }),
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
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]" style={{ fontFamily: "var(--font-client-manrope, 'Manrope', system-ui, sans-serif)" }}>
      <style>{`
        .cp-grad-text {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cp-grad-bg {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7);
          border-color: #e11d48 !important;
        }
        .cp-card {
          box-shadow: 0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06);
        }
        .cp-card-selected {
          border-color: #e11d48 !important;
          box-shadow: 0 0 0 1.5px #e11d48, 0 6px 24px rgba(225,29,72,0.18), 0 2px 8px rgba(0,0,0,0.08);
        }
        .cp-card-popular {
          border-color: rgba(219,39,119,0.35) !important;
        }
        .cp-input-focus:focus {
          border-color: #db2777 !important;
          box-shadow: 0 0 0 3px rgba(219,39,119,0.12) !important;
          outline: none;
        }
        @media (max-width: 639px) {
          .cp-sticky-bar {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid var(--border);
            padding: 12px 16px 20px;
            z-index: 40;
          }
          .cp-sticky-spacer { height: 88px; }
        }
      `}</style>
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
      <div className="mx-auto max-w-[680px] px-4 pb-6 pt-7 sm:px-5 sm:pb-24 sm:pt-10">

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
            <div className="cp-card cp-card-selected rounded-2xl border-2 bg-[var(--card)] p-5 sm:p-6">
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
              className="cp-grad-text mt-3 text-[13px] font-semibold transition-opacity hover:opacity-75"
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
                    className={`cp-card relative rounded-2xl border-[1.5px] bg-[var(--card)] p-5 text-left transition-all duration-200 active:scale-[0.99] sm:p-6 ${
                      isSelected
                        ? 'cp-card-selected'
                        : p.popular
                          ? 'cp-card-popular border-[var(--border)]'
                          : 'border-[var(--border)]'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    {p.popular && (
                      <span className="cp-grad-bg absolute -top-3 right-5 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-white">
                        Най-популярен
                      </span>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        {/* Radio dot */}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all ${
                            isSelected
                              ? 'cp-grad-bg'
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
                ? 'cp-grad-bg'
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
              className="cp-grad-text font-semibold underline underline-offset-2 hover:opacity-75"
              onClick={e => e.stopPropagation()}
            >
              Общите условия
            </a>{' '}
            и{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="cp-grad-text font-semibold underline underline-offset-2 hover:opacity-75"
              onClick={e => e.stopPropagation()}
            >
              Политиката за поверителност
            </a>{' '}
            на Clicka.bg
          </span>
        </label>

        {/* ── Invoice section ── */}
        <div className="mt-5">
          <label className="flex cursor-pointer items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all ${
                wantsInvoice
                  ? 'cp-grad-bg'
                  : 'border-[var(--border)] bg-[var(--card)]'
              }`}
              onClick={() => setWantsInvoice(v => !v)}
              role="checkbox"
              aria-checked={wantsInvoice}
              tabIndex={0}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setWantsInvoice(v => !v); } }}
            >
              {wantsInvoice && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-[13px] font-semibold text-[var(--foreground)]" onClick={() => setWantsInvoice(v => !v)}>
              Искам фактура на фирма
            </span>
          </label>

          {wantsInvoice && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  Фирма / Търговско наименование <span className="cp-grad-text">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="ПРИМЕРНА ФИРМА ЕООД"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none cp-input-focus transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    ЕИК <span className="cp-grad-text">*</span>
                  </label>
                  <input
                    type="text"
                    value={eik}
                    onChange={e => setEik(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="123456789"
                    maxLength={9}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none cp-input-focus transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    ДДС номер <span className="text-[var(--muted-foreground)] normal-case font-normal">(по желание)</span>
                  </label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={e => setVatNumber(e.target.value.toUpperCase())}
                    placeholder="BG123456789"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none cp-input-focus transition-all font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Адресът за фактуриране ще бъде попълнен на следващата стъпка при плащането.
              </p>
            </div>
          )}
        </div>

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

        {/* Sticky spacer — mobile only */}
        <div className="cp-sticky-spacer" aria-hidden />

        {/* Pay button — sticky on mobile, inline on desktop */}
        <div className="cp-sticky-bar mt-6">
          <ButtonColorful
            label={isSubmitting ? 'Пренасочване към Stripe…' : `Плати ${selectedPlan?.price ?? 399} € →`}
            onClick={handlePay}
            disabled={isSubmitting || !planId || !termsAccepted}
            className="h-14 w-full rounded-full text-[16px] font-bold sm:h-12 sm:text-[15px]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {['0% комисионна', 'Сигурно плащане', 'Готов веднага'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] sm:text-[12px]">
                <IconCheck color="#22C55E" />
                {t}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-[var(--muted-foreground)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1 inline align-middle" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Сигурно плащане чрез{' '}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="cp-grad-text font-semibold underline underline-offset-2">
              Stripe
            </a>. Можеш да смениш плана по всяко време.
          </p>
        </div>
      </div>
    </div>
  );
}

function CreatePageFallback() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)]"
      style={{ fontFamily: "var(--font-client-manrope, 'Manrope', system-ui, sans-serif)" }}
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
