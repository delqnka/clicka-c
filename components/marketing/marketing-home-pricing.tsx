'use client';

import { useState } from 'react';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { MARKETING_PRICING } from '@/lib/marketing-home-copy';
import { formatDualEur, formatDualEurText } from '@/lib/salon-currency';

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="chk-pricing" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e11d48" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M20 6L9 17l-5-5" stroke="url(#chk-pricing)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PLANS = [
  { id: 'solo', name: 'Solo', price: { '12m': 299, '6m': 169 }, daily: { '12m': '0.82', '6m': '0.92' }, desc: '1 специалист', popular: false },
  { id: 'ekip', name: 'Team', price: { '12m': 499, '6m': 279 }, daily: { '12m': '1.37', '6m': '1.52' }, desc: 'До 3 специалисти', popular: true },
];

const SOLO_FEATURES = [
  'AI рецепционист — записва клиенти 24/7 вместо теб',
  'Онлайн записване директно от чат',
  'Автоматичен клиентски профил при всяка резервация',
  'Жив чат — поемаш разговора от Telegram когато искаш',
  'Собствен сайт с резервации',
  'Качване на услуги от ценоразпис със снимка',
  'Онлайн плащания и депозити',
  'Email и Telegram известия за теб и клиентите',
  'Автоматично събиране на Google ревюта',
  'Неограничена галерия',
  'Хостинг, SSL и поддръжка включени',
  '0% комисионна върху резервациите ти',
];

const EKIP_FEATURES = [
  'До 3 специалисти в един сайт',
  'Отделни графици и известия за всеки специалист',
  'Онлайн записване при избран специалист директно от чат',
  'AI рецепционист за целия екип',
  'Директно резервиране при избран специалист',
  'Жив чат — поемаш разговора от Telegram',
];

const PLAN_FEATURES: Record<string, string[]> = {
  solo: SOLO_FEATURES,
  ekip: EKIP_FEATURES,
};

export function MarketingHomePricingSection() {
  const [pricingPeriod, setPricingPeriod] = useState<'12m' | '6m'>('12m');
  const [featuresExpanded, setFeaturesExpanded] = useState<Record<string, boolean>>({});

  return (
    <section
      id="pricing"
      data-home-section="pricing"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)', position: 'relative' }}
      aria-labelledby="pricing-h"
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Value comparison */}
        <div style={{ marginBottom: 'clamp(48px,7vw,72px)', maxWidth: 760, display: 'flex', gap: 'clamp(24px,4vw,48px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Left: Without Clicka */}
          <div style={{ flex: '1 1 260px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 16 }}>Без clicka.bg</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {['Уеб сайт', 'Онлайн резервации', 'Хостинг и SSL', 'Домейн', 'Поддръжка', 'AI чат асистент', 'Имейл известия', 'Meta Pixel, Google Analytics', 'Google ревюта'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#d1d5db', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 'clamp(13px,1.6vw,14px)', color: '#9ca3af' }}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              {['Различни доставчици.', 'Различни настройки.', 'Различни абонаменти.'].map((line) => (
                <p key={line} style={{ fontSize: 'clamp(13px,1.6vw,14px)', fontWeight: 700, color: '#6b7280', margin: '0 0 3px' }}>{line}</p>
              ))}
              <p style={{ fontSize: 'clamp(12px,1.5vw,13px)', color: '#9ca3af', margin: '8px 0 0', lineHeight: 1.6 }}>
                и задължително да плащаш на специалист, който да се грижи за тези неща.
              </p>
            </div>
          </div>

          {/* Right: With Clicka */}
          <div style={{ flex: '1 1 260px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>С clicka.bg</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Собствен сайт', 'Онлайн резервации', 'AI асистент', 'Хостинг и SSL', 'Имейл известия', 'Google ревюта', 'Meta Pixel и Google Analytics', '0% комисионна', 'Лесен контрол на сайта'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#16a34a', flexShrink: 0, fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 'clamp(13px,1.6vw,14px)', fontWeight: 500, color: '#1a1a1a' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        <h2 id="pricing-h" data-reveal className="hp-heading" style={{ fontSize: 'clamp(28px,4.2vw,50px)', lineHeight: 1.15, marginBottom: 12, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Получаваш веднага сайта си на безплатен адрес{' '}
          <span style={{ fontSize: 'clamp(18px,2.8vw,32px)' }}>tvoiatsalon.clicka.bg.</span>
        </h2>
        <p data-reveal style={{ fontSize: 'clamp(15px,1.8vw,18px)', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 28, lineHeight: 1.6, maxWidth: 720 }}>
          И можеш да приемаш резервации{' '}
          <span style={{ fontWeight: 800, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ВЕДНАГА!</span>
        </p>
        <div style={{ marginBottom: 36, maxWidth: 720 }}>
          <p style={{ fontSize: 'clamp(16px,2vw,20px)', fontWeight: 600, color: 'var(--foreground)', marginBottom: 10, lineHeight: 1.5 }}>
            {'Искаш собствен домейн (например '}
            <span style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600, fontStyle: 'italic' }}>moiatsalon.com или salondidi.bg</span>
            {')? Или вече имаш такъв?'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span style={{ flexShrink: 0, marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #e11d48, #a855f7)', display: 'inline-block' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
                {MARKETING_PRICING.domainBullet1main}
              </p>
              <p style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', margin: '2px 0 0', lineHeight: 1.5, opacity: 0.75 }}>
                {MARKETING_PRICING.domainBullet1sub}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <span style={{ flexShrink: 0, marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #e11d48, #a855f7)', display: 'inline-block' }} />
            <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
              {MARKETING_PRICING.domainBullet2}
            </p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', margin: 0, lineHeight: 1.6 }}>
            {MARKETING_PRICING.domainNoteBold}
          </p>
        </div>

        {/* Promo banner */}
        <a
          href="/purvite-10"
          data-reveal
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#fff0f3,#faf5ff)',
            border: '1px solid #fce7f3', borderRadius: 9999,
            padding: '8px 18px', marginBottom: 28, textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e11d48', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Промо оферта за първите 10 бизнеса — виж тук →
          </span>
        </a>

        <div data-reveal style={{ display: 'inline-flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 9999, padding: 4, marginBottom: 40, gap: 2 }}>
          {(['12m', '6m'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPricingPeriod(p)}
              style={{
                padding: '7px 20px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s',
                background: pricingPeriod === p ? '#fff' : 'transparent',
                color: pricingPeriod === p ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: pricingPeriod === p ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {p === '12m' ? 'Годишно' : '6 месеца'}
              {p === '12m' && (
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  СПЕСТИ
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="hp-pricing-grid">
          {PLANS.map((plan, i) => (
            <div key={plan.id} data-reveal className={`hp-price-card${plan.popular ? ' popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
                    color: '#fff', borderRadius: 9999,
                    padding: '4px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}
                  aria-label="Най-популярен план"
                >
                  Най-популярен
                </div>
              )}

              <div style={{ marginBottom: 6 }}>
                <h3 className="hp-heading" style={{ fontSize: 14, margin: '0 0 1px', backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>{plan.name}</h3>
                <p style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0 }}>{plan.desc}</p>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span className="hp-heading tabular-nums" style={{ fontSize: 22, letterSpacing: '-0.04em', lineHeight: 1 }}>{formatDualEur(plan.price[pricingPeriod])}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 3 }}>
                  {pricingPeriod === '12m' ? '/ год.' : '/ 6 мес.'}
                </span>
                <p style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
                  от {formatDualEurText(plan.daily[pricingPeriod])} на ден
                </p>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 10 }}>
                {plan.id === 'ekip' && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', margin: '0 0 6px', fontStyle: 'italic' }}>
                    Всичко от Solo, плюс:
                  </p>
                )}
                {PLAN_FEATURES[plan.id].slice(0, featuresExpanded[plan.id] ? PLAN_FEATURES[plan.id].length : 5).map((f, fi) => (
                  <div key={fi} className="hp-check">
                    <IconCheck />
                    {f}
                  </div>
                ))}
                {PLAN_FEATURES[plan.id].length > 5 && (
                  <button
                    type="button"
                    onClick={() => setFeaturesExpanded((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 12, fontWeight: 600,
                      backgroundImage: 'linear-gradient(135deg, #e11d48, #a855f7)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}
                  >
                    <span>{featuresExpanded[plan.id] ? 'По-малко' : `+${PLAN_FEATURES[plan.id].length - 5} още`}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transition: 'transform 0.25s', transform: featuresExpanded[plan.id] ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                      <path d="M2 4.5L7 9.5L12 4.5" stroke="url(#g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <defs><linearGradient id="g" x1="2" y1="7" x2="12" y2="7" gradientUnits="userSpaceOnUse"><stop stopColor="#e11d48" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
                    </svg>
                  </button>
                )}
                {plan.id === 'ekip' && (
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', margin: '10px 0 0', lineHeight: 1.5 }}>
                    Идеален за салони с повече от един специалист.
                  </p>
                )}
              </div>

              <ButtonColorful
                href={`/create?plan=${plan.id}_${pricingPeriod}`}
                label={`Избери ${plan.name}`}
                className="h-8 w-full rounded-full text-[12px] font-semibold"
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}
