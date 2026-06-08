'use client';

import { Suspense, useState, useEffect, useId } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { formatDualEur, formatDualEurText, formatDualEurParts } from '@/lib/salon-currency';
import { ButtonColorful } from '@/components/ui/button-colorful';

const SLUG_TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',
  и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',
  р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map(c => SLUG_TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);
}

type Plan   = 'solo' | 'team';
type Period = '12m'  | '6m';
type Expanded = { solo: boolean; team: boolean };

const PRICES: Record<Plan, Record<Period, number>> = {
  solo: { '12m': 299, '6m': 169 },
  team: { '12m': 499, '6m': 279 },
};

const DAYS: Record<Period, number> = { '12m': 365, '6m': 183 };

const SOLO_HIGHLIGHTS = [
  'Собствен сайт за резервации',
  'AI рецепционист 24/7',
  'Жив чат от Telegram',
  'Онлайн плащания',
  '0% комисионна',
];

const SOLO_ALL = [
  'Собствен сайт за резервации',
  'Хостинг включен',
  'SSL сертификат включен',
  'Поддръжка включена',
  'Неограничени резервации',
  'Неограничени посещения на сайта',
  'Онлайн плащания чрез Stripe',
  'Неограничени имейл известия',
  'Възможност за SMS напомняния',
  'Неограничена галерия',
  'Блог система',
  'AI рецепционист + управление от Telegram',
  '0% комисионна върху резервациите',
];

const TEAM_HIGHLIGHTS = [
  'Всичко от SOLO',
  'До 3 служители',
  'До 3 AI рецепциониста',
  'Жив чат от Telegram',
  '0% комисионна',
];

const TEAM_ALL = [
  'Всичко от SOLO',
  'До 3 служители',
  'До 3 AI рецепциониста в Telegram',
  'Отделни графици за всеки служител',
  'Свой портал за всеки служител: снимка, био и график',
  'Отделни линкове за резервации',
  'Отделни календари',
  'Отделни известия за всеки служител',
  'Управление на екип до 3 специалиста',
];

function IconCheck({ color }: { color?: string }) {
  const id = useId();
  const gradId = `ichk-${id}`;
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs><linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#db2777"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs>
      <path d="M20 6L9 17l-5-5" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function resolveInitial(param: string | null): { plan: Plan; period: Period } {
  if (!param) return { plan: 'solo', period: '12m' };
  if (param === 'solo_6m')  return { plan: 'solo', period: '6m' };
  if (param === 'team_12m') return { plan: 'team', period: '12m' };
  if (param === 'team_6m')  return { plan: 'team', period: '6m' };
  if (param === 'ekip' || param === 'team') return { plan: 'team', period: '12m' };
  return { plan: 'solo', period: '12m' };
}

function CreatePageContent() {
  const searchParams  = useSearchParams();
  const grantToken    = searchParams.get('grant');
  const initial       = resolveInitial(searchParams.get('plan'));
  const [plan,   setPlan]   = useState<Plan>(initial.plan);
  const [period, setPeriod] = useState<Period>(initial.period);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'ViewContent');
  }, []);

  const [expanded, setExpanded] = useState<Expanded>({ solo: false, team: false });
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [error,         setError]         = useState('');
  const [ownerName,     setOwnerName]     = useState('');
  const [email,         setEmail]         = useState('');
  const [emailStatus,   setEmailStatus]   = useState<'idle' | 'checking' | 'free' | 'exists'>('idle');
  const [salonName,     setSalonName]     = useState('');
  const [slug,          setSlug]          = useState('');
  const [slugEdited,    setSlugEdited]    = useState(false);
  const [slugStatus,    setSlugStatus]    = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Възстановяваме името/адреса при връщане от Stripe (различен домейн → загубено React състояние)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('clicka_create_draft');
      if (!saved) return;
      const draft = JSON.parse(saved) as { ownerName?: string; salonName?: string; slug?: string; slugEdited?: boolean };
      if (draft.ownerName) setOwnerName(draft.ownerName);
      if (draft.salonName) setSalonName(draft.salonName);
      if (draft.slug) setSlug(draft.slug);
      if (draft.slugEdited) setSlugEdited(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('clicka_create_draft', JSON.stringify({ ownerName, salonName, slug, slugEdited }));
    } catch { /* ignore */ }
  }, [ownerName, salonName, slug, slugEdited]);

  // Live проверка дали slug-ът е свободен (debounce)
  useEffect(() => {
    const candidate = slug.trim();
    if (!candidate) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-availability?slug=${encodeURIComponent(candidate)}`);
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [slug]);
  // Live проверка дали вече има акаунт с този имейл (debounce)
  useEffect(() => {
    const candidate = email.trim();
    if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) { setEmailStatus('idle'); return; }
    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/email-availability?email=${encodeURIComponent(candidate)}`);
        const data = await res.json();
        setEmailStatus(data.exists ? 'exists' : 'free');
      } catch {
        setEmailStatus('idle');
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [email]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [wantsInvoice,  setWantsInvoice]  = useState(false);
  const [companyName,   setCompanyName]   = useState('');
  const [eik,           setEik]           = useState('');
  const [vatNumber,     setVatNumber]     = useState('');

  const price    = PRICES[plan][period];
  const daily    = (price / DAYS[period]).toFixed(2);
  const planKey  = `${plan}_${period}` as const;

  async function handlePay() {
    if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'InitiateCheckout');
    if (grantToken) {
      if (!ownerName.trim()) { setError('Въведи твоето име.'); return; }
      if (!salonName.trim()) { setError('Въведи име на салона.'); return; }
      if (!slug.trim()) { setError('Въведи адрес на сайта.'); return; }
      if (slugStatus === 'taken') { setError('Този адрес вече е зает — избери друг.'); return; }
      setIsSubmitting(true);
      setError('');
      try {
        const res = await fetch('/api/grant-activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: grantToken, ownerName: ownerName.trim(), salonName: salonName.trim(), slug: slug.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Грешка');
        if (data.slug) { window.location.href = `/success?salon=${data.slug}`; return; }
        throw new Error('Грешка при активиране');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка');
        setIsSubmitting(false);
      }
      return;
    }

    if (!ownerName.trim()) { setError('Въведи твоето име.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Въведи валиден имейл.'); return; }
    if (emailStatus === 'exists') { setError('Вече има акаунт с този имейл — влез от страницата за вход, вместо да купуваш нов план.'); return; }
    if (!salonName.trim()) { setError('Въведи име на салона.'); return; }
    if (!slug.trim()) { setError('Въведи адрес на сайта.'); return; }
    if (!termsAccepted) { setError('Моля, приемете условията и правилата.'); return; }
    if (wantsInvoice) {
      if (!companyName.trim()) { setError('Въведи наименование на фирмата.'); return; }
      if (!/^\d{9}$/.test(eik.trim())) { setError('ЕИК трябва да е точно 9 цифри.'); return; }
      if (vatNumber.trim() && !/^BG\d{9,10}$/i.test(vatNumber.trim())) {
        setError('ДДС номерът трябва да е във формат BG123456789.'); return;
      }
      if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'AddPaymentInfo');
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          planKey,
          ownerName: ownerName.trim(),
          email: email.trim(),
          salonName: salonName.trim(),
          slug: slug.trim(),
          ...(wantsInvoice && {
            billingInfo: {
              companyName: companyName.trim(),
              eik:         eik.trim(),
              vatNumber:   vatNumber.trim() || null,
            },
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка');
      if (data.checkoutUrl) {
        if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'Subscribe', { value: '0.00', currency: 'BGN', predicted_ltv: '0.00' });
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('Няма линк за плащане');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при пренасочване');
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-dvh bg-white text-[#0a0a0a]"
      style={{ fontFamily: "var(--font-client-manrope, 'Manrope', system-ui, sans-serif)", colorScheme: 'light' }}
    >
      <style>{`
        .cp-grad-text {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cp-grad-bg {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7) !important;
        }
        .cp-plan-card {
          position: relative;
          border-radius: 20px;
          border: 1.5px solid #e5e7eb;
          background: #ffffff;
          padding: 20px 22px;
          cursor: pointer;
          transition: border-color 180ms, box-shadow 180ms;
          text-align: left;
          width: 100%;
          box-shadow: 0 2px 0 rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.10);
        }
        .cp-plan-card.selected {
          border-color: transparent;
          background: linear-gradient(white, white) padding-box, linear-gradient(135deg, #db2777, #a855f7) border-box;
          border: 2px solid transparent;
          box-shadow: 0 0 0 0px transparent, 0 4px 20px rgba(219,39,119,0.15);
        }
        .cp-period-btn {
          flex: 1;
          padding: 9px 0;
          border: 1.5px solid #e5e7eb;
          background: #ffffff;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 120ms;
          color: #6b7280;
        }
        .cp-period-btn.selected {
          border-color: transparent;
          background: linear-gradient(white, white) padding-box, linear-gradient(135deg, #db2777, #a855f7) border-box;
          border: 2px solid transparent;
          color: #0a0a0a;
        }
        .cp-period-btn.selected .cp-period-badge {
          display: inline-flex;
        }
        .cp-period-badge {
          display: none;
          margin-left: 6px;
          background: linear-gradient(135deg, #e11d48, #a855f7);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          letter-spacing: .04em;
          vertical-align: middle;
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
            border-top: 1px solid #e5e7eb;
            padding: 12px 16px 20px;
            z-index: 40;
          }
          .cp-sticky-spacer { height: 160px; }
        }
      `}</style>

      {/* NAV */}
      <nav
        className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#e5e7eb] px-[clamp(16px,5vw,60px)]"
        style={{
          background:           'rgba(255,255,255,0.93)',
          backdropFilter:       'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        <ClickaLogo size="nav" />
        <a href="/" className="text-[13px] font-semibold text-[#6b7280] hover:text-[#0a0a0a] transition-colors">
          ← Назад
        </a>
      </nav>

      <div className="mx-auto max-w-[600px] px-4 pb-6 pt-8 sm:px-5 sm:pb-24 sm:pt-12">

        <h1
          className="mb-2 text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-[1.08] tracking-[-0.03em]"
          style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        >
          Избери план
        </h1>
        <p className="mb-8 text-[15px] text-[#6b7280]">
          Еднократно плащане. Без месечни такси. Без скрити такси.
        </p>

        {/* ── Period toggle ── */}
        <div className="mb-6 flex gap-3">
          {(['12m', '6m'] as Period[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`cp-period-btn${period === p ? ' selected' : ''}`}
            >
              {p === '12m' ? 'Годишно' : '6 месеца'}
              {p === '12m' && <span className="cp-period-badge">Най-изгодно</span>}
            </button>
          ))}
        </div>

        {/* ── Plan cards ── */}
        <div className="flex flex-col gap-4">

          {/* SOLO */}
          <button
            type="button"
            onClick={() => { setPlan('solo'); if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'AddToCart', { content_name: 'SOLO', currency: 'BGN', value: PRICES.solo[period] }); }}
            className={`cp-plan-card${plan === 'solo' ? ' selected' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: plan === 'solo' ? 'none' : '2px solid #e5e7eb',
                    background: plan === 'solo' ? 'linear-gradient(135deg,#e11d48,#a855f7)' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {plan === 'solo' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SOLO</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>За самостоятелни специалисти</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDualEurParts(PRICES.solo[period]).eur}
                </p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDualEurParts(PRICES.solo[period]).bgn}
                </p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                  {period === '12m' ? '/ година' : '/ 6 месеца'}
                </p>
              </div>
            </div>

            {plan === 'solo' && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 10px', backgroundImage: 'linear-gradient(135deg,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Само {formatDualEurText((PRICES.solo[period] / DAYS[period]).toFixed(2))} на ден
                </p>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  {/* Key highlights — always visible */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 10 }}>
                    {SOLO_HIGHLIGHTS.map(f => {
                      const isZero = f === '0% комисионна';
                      return (
                        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, backgroundImage: isZero ? 'linear-gradient(135deg,#db2777,#a855f7)' : undefined, WebkitBackgroundClip: isZero ? 'text' : undefined, WebkitTextFillColor: isZero ? 'transparent' : undefined, color: isZero ? undefined : '#0a0a0a' }}>
                          <IconCheck color="#16a34a" /> {f}
                        </span>
                      );
                    })}
                  </div>
                  {/* Expanded full list */}
                  {expanded.solo && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', marginBottom: 10 }}>
                      {SOLO_ALL.map(f => (
                        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                          <IconCheck /> {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); setExpanded(v => ({ ...v, solo: !v.solo })); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpanded(v => ({ ...v, solo: !v.solo })); } }}
                    style={{ fontSize: 12, fontWeight: 600, color: '#db2777', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    {expanded.solo ? 'Скрий функциите ↑' : 'Виж всички функции ↓'}
                  </span>
                </div>
              </>
            )}
          </button>

          {/* TEAM */}
          <button
            type="button"
            onClick={() => { setPlan('team'); if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'AddToCart', { content_name: 'TEAM', currency: 'BGN', value: PRICES.team[period] }); }}
            className={`cp-plan-card${plan === 'team' ? ' selected' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: plan === 'team' ? 'none' : '2px solid #e5e7eb',
                    background: plan === 'team' ? 'linear-gradient(135deg,#e11d48,#a855f7)' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {plan === 'team' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TEAM</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>За салони с екип</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDualEurParts(PRICES.team[period]).eur}
                </p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDualEurParts(PRICES.team[period]).bgn}
                </p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                  {period === '12m' ? '/ година' : '/ 6 месеца'}
                </p>
              </div>
            </div>

            {plan === 'team' && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '10px 0 10px', backgroundImage: 'linear-gradient(135deg,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Само {formatDualEurText((PRICES.team[period] / DAYS[period]).toFixed(2))} на ден
                </p>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  {/* Key highlights — always visible */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 10 }}>
                    {TEAM_HIGHLIGHTS.map(f => {
                      const isZero = f === '0% комисионна';
                      return (
                        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, backgroundImage: isZero ? 'linear-gradient(135deg,#db2777,#a855f7)' : undefined, WebkitBackgroundClip: isZero ? 'text' : undefined, WebkitTextFillColor: isZero ? 'transparent' : undefined, color: isZero ? undefined : '#0a0a0a' }}>
                          <IconCheck color="#16a34a" /> {f}
                        </span>
                      );
                    })}
                  </div>
                  {/* Expanded full list */}
                  {expanded.team && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', marginBottom: 10 }}>
                      {TEAM_ALL.map(f => (
                        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                          <IconCheck /> {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); setExpanded(v => ({ ...v, team: !v.team })); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpanded(v => ({ ...v, team: !v.team })); } }}
                    style={{ fontSize: 12, fontWeight: 600, color: '#db2777', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    {expanded.team ? 'Скрий функциите ↑' : 'Виж всички функции ↓'}
                  </span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* ── Owner name ── */}
        <div className="mt-8">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
            Твоето име
          </label>
          <input
            type="text"
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            placeholder="напр. Деляна Иванова"
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#a855f7]"
          />
        </div>

        {/* ── Email ── */}
        <div className="mt-6">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
            Имейл
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="napr. ime@email.com"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 pr-10 text-[15px] outline-none focus:border-[#a855f7]"
            />
            {emailStatus === 'free' && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-[16px] font-bold">✓</span>
            )}
          </div>
          {emailStatus === 'exists' && (
            <p className="mt-1 text-[12px] font-semibold text-red-600">
              Имейлът вече съществува в системата, моля използвайте друг.
            </p>
          )}
        </div>

        {/* ── Salon name ── */}
        <div className="mt-6">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
            Име на салона
          </label>
          <input
            type="text"
            value={salonName}
            onChange={e => {
              const value = e.target.value;
              setSalonName(value);
              if (!slugEdited) setSlug(slugify(value));
            }}
            placeholder="напр. Salon Urban"
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#a855f7]"
          />

          <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
            Адрес на сайта (по желание промени)
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }}
            placeholder="salonurban"
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#a855f7]"
          />
          <p className="mt-1.5 text-[12px] text-[#6b7280]">
            Безплатният ти адрес ще бъде:{' '}
            <span className="font-semibold text-[#0a0a0a]">{slug || 'salonurban'}.clicka.bg</span>
          </p>
          {slugStatus === 'checking' && (
            <p className="mt-1 text-[12px] text-[#6b7280]">Проверка на адреса…</p>
          )}
          {slugStatus === 'available' && (
            <p className="mt-1 text-[12px] font-semibold text-emerald-600">✓ Адресът е свободен</p>
          )}
          {slugStatus === 'taken' && (
            <p className="mt-1 text-[12px] font-semibold text-red-600">Този адрес вече е зает — избери друг</p>
          )}
        </div>

        {/* ── Terms ── */}
        <label className="mt-8 flex cursor-pointer items-start gap-3">
          <span
            onClick={() => setTermsAccepted(v => !v)}
            role="checkbox"
            aria-checked={termsAccepted}
            tabIndex={0}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setTermsAccepted(v => !v); } }}
            style={{
              marginTop: 1, flexShrink: 0, width: 20, height: 20,
              borderRadius: 6, border: termsAccepted ? 'none' : '1.5px solid #e5e7eb',
              background: termsAccepted ? 'linear-gradient(135deg,#e11d48,#a855f7)' : '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {termsAccepted && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-[13px] leading-snug text-[#6b7280]" onClick={() => setTermsAccepted(v => !v)}>
            Съгласявам се с{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="cp-grad-text font-semibold underline underline-offset-2 hover:opacity-75" onClick={e => e.stopPropagation()}>
              Общите условия
            </a>{' '}
            и{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="cp-grad-text font-semibold underline underline-offset-2 hover:opacity-75" onClick={e => e.stopPropagation()}>
              Политиката за поверителност
            </a>{' '}
            на Clicka.bg
          </span>
        </label>

        {/* ── Invoice ── */}
        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-3">
            <span
              onClick={() => setWantsInvoice(v => !v)}
              role="checkbox"
              aria-checked={wantsInvoice}
              tabIndex={0}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setWantsInvoice(v => !v); } }}
              style={{
                flexShrink: 0, width: 20, height: 20,
                borderRadius: 6, border: wantsInvoice ? 'none' : '1.5px solid #e5e7eb',
                background: wantsInvoice ? 'linear-gradient(135deg,#e11d48,#a855f7)' : '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {wantsInvoice && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-[13px] font-semibold text-[#0a0a0a]" onClick={() => setWantsInvoice(v => !v)}>
              Искам фактура на фирма
            </span>
          </label>

          {wantsInvoice && (
            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-[#ffffff] p-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
                  Фирма / Търговско наименование <span className="cp-grad-text">*</span>
                </label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ПРИМЕРНА ФИРМА ЕООД"
                  className="cp-input-focus w-full rounded-xl border border-[#e5e7eb] bg-[#ffffff] px-4 py-2.5 text-[14px] outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
                    ЕИК <span className="cp-grad-text">*</span>
                  </label>
                  <input type="text" value={eik} onChange={e => setEik(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="123456789" maxLength={9}
                    className="cp-input-focus w-full rounded-xl border border-[#e5e7eb] bg-[#ffffff] px-4 py-2.5 font-mono text-[14px] outline-none transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
                    ДДС номер <span className="normal-case font-normal">(по желание)</span>
                  </label>
                  <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value.toUpperCase())} placeholder="BG123456789"
                    className="cp-input-focus w-full rounded-xl border border-[#e5e7eb] bg-[#ffffff] px-4 py-2.5 font-mono text-[14px] outline-none transition-all" />
                </div>
              </div>
              <p className="text-[11px] text-[#6b7280]">Адресът за фактуриране се попълва на следващата стъпка при плащането.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">{error}</div>
        )}

        <div className="cp-sticky-spacer" aria-hidden />

        {/* Pay button */}
        <div className="cp-sticky-bar mt-6">
          {!grantToken && (
            <p className="mb-2 text-center text-[13px] font-semibold text-[#0a0a0a]">
              Плащаш еднократно {formatDualEur(price)} за {period === '12m' ? '12 месеца' : '6 месеца'}.
            </p>
          )}
          <ButtonColorful
            label={isSubmitting
              ? (grantToken ? 'Активира…' : 'Пренасочване към Stripe…')
              : grantToken
                ? 'Активирай безплатния абонамент'
                : `Плати ${formatDualEur(price)} — ${plan.toUpperCase()} ${period === '12m' ? '(12 месеца)' : '(6 месеца)'}`}
            onClick={handlePay}
            disabled={isSubmitting || !ownerName.trim() || !salonName.trim() || !slug.trim() || slugStatus === 'taken' || slugStatus === 'checking' || (!grantToken && !termsAccepted)}
            className="h-14 w-full rounded-full text-[15px] font-bold sm:h-12"
          />
          <p className="mt-2 text-center text-[12px] text-[#6b7280]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1 inline align-middle" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Сигурно плащане чрез{' '}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="cp-grad-text font-semibold underline underline-offset-2">Stripe</a>.
          </p>
        </div>

      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-[#ffffff] text-[#6b7280]"
        style={{ fontFamily: "var(--font-client-manrope, 'Manrope', system-ui, sans-serif)" }}>
        Зареждане…
      </div>
    }>
      <CreatePageContent />
    </Suspense>
  );
}
