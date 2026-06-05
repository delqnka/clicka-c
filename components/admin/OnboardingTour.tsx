'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  {
    title: 'Попълни данните за салона',
    desc: 'Добави името, телефона, адреса и кратко описание. Клиентите ще ги виждат на сайта ти.',
    tab: 'Сайт',
  },
  {
    title: 'Качи снимки',
    desc: 'Добави снимки от работата си. Първата снимка е корицата на сайта.',
    tab: 'Снимки',
  },
  {
    title: 'Добави услуги и цени',
    desc: 'Качи снимка на своя ценоразпис от зеления бутон — системата ще го прочете автоматично и ще добави услугите вместо теб.',
    tab: 'Услуги',
  },
  {
    title: 'Свържи Telegram',
    desc: 'От таба „Интеграции" намери секция „Telegram" и натисни бутона. Ще получаваш резервации директно в Telegram.',
    tab: 'Интеграции',
  },
  {
    title: 'Готово — сайтът ти е жив!',
    desc: 'Промените се запазват автоматично. Натисни „Публикувай" само ако искаш да обновиш сайта ръчно след редакция.',
    tab: null,
  },
];

const GRAD = 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)';
const FONT = "var(--font-client-manrope,'Manrope',system-ui,sans-serif)";
const KEY = 'clicka_onboarding_done';

export function OnboardingTour({ slug }: { slug: string }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(`${KEY}_${slug}`)) setVisible(true);
    } catch { /* ignore */ }
  }, [slug]);

  function dismiss() {
    try { localStorage.setItem(`${KEY}_${slug}`, '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, backdropFilter: 'blur(2px)' }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        fontFamily: FONT,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto 24px' }} />

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4,
              width: i === step ? 24 : 8,
              borderRadius: 99,
              background: i <= step ? GRAD : '#E5E7EB',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Step badge */}
        {current.tab && (
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              padding: '3px 10px',
              borderRadius: 99,
              background: 'rgba(225,29,72,0.08)',
              color: '#e11d48',
            }}>
              ТАБ: {current.tab.toUpperCase()}
            </span>
          </div>
        )}

        {/* Title */}
        <h2 style={{
          margin: '0 0 10px',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1.2,
          backgroundImage: GRAD,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {current.title}
        </h2>

        {/* Description */}
        <p style={{
          margin: '0 0 28px',
          fontSize: 15,
          color: '#6B7280',
          textAlign: 'center',
          lineHeight: 1.65,
        }}>
          {current.desc}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={next}
            style={{
              border: 'none',
              borderRadius: 999,
              background: GRAD,
              color: '#fff',
              padding: '13px 16px',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: FONT,
              boxShadow: '0 4px 20px rgba(219,39,119,.25)',
            }}
          >
            {isLast ? 'Разбрах, да започваме! 🎉' : `Напред (${step + 1}/${STEPS.length})`}
          </button>

          <button
            onClick={dismiss}
            style={{
              border: 'none',
              background: 'none',
              color: '#9CA3AF',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px',
              fontFamily: FONT,
            }}
          >
            Пропусни ръководството
          </button>
        </div>
      </div>
    </>
  );
}
