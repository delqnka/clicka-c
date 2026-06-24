'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

const STEPS_BG = [
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
    tab: null as string | null,
  },
];

const STEPS_EN = [
  {
    title: 'Fill in your salon details',
    desc: 'Add the name, phone, address and a short description. Clients will see them on your site.',
    tab: 'Site',
  },
  {
    title: 'Upload photos',
    desc: 'Add photos of your work. The first photo is the site cover.',
    tab: 'Images',
  },
  {
    title: 'Add services and prices',
    desc: 'Snap a photo of your price list using the green button — the system reads it automatically and adds the services for you.',
    tab: 'Services',
  },
  {
    title: 'Connect Telegram',
    desc: 'In the "Integrations" tab, find the "Telegram" section and tap the button. You will receive bookings directly in Telegram.',
    tab: 'Integrations',
  },
  {
    title: 'Done — your site is live!',
    desc: 'Changes are saved automatically. Press "Publish" only if you want to manually refresh the site after edits.',
    tab: null as string | null,
  },
];

const GRAD = '#000';
const FONT = "var(--font-client-manrope,'Manrope',system-ui,sans-serif)";
const KEY = 'clicka_onboarding_done';

export function OnboardingTour({ slug, done, locale = 'bg' }: { slug: string; done?: boolean; locale?: Locale }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const isEn = locale === 'en';
  const STEPS = isEn ? STEPS_EN : STEPS_BG;

  useEffect(() => {
    if (done) return;
    try {
      if (!localStorage.getItem(`${KEY}_${slug}`)) setVisible(true);
    } catch { /* ignore */ }
  }, [slug, done]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(`${KEY}_${slug}`, '1'); } catch { /* ignore */ }
    fetch('/api/admin/onboarding-done', { method: 'POST' }).catch(() => { /* ignore */ });
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
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
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
              background: 'rgba(0,0,0,0.08)',
              color: '#000',
            }}>
              {isEn ? 'TAB' : 'ТАБ'}: {current.tab.toUpperCase()}
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
              boxShadow: '0 4px 20px rgba(0,0,0,.25)',
            }}
          >
            {isLast ? (isEn ? "Got it, let's start! 🎉" : 'Разбрах, да започваме! 🎉') : (isEn ? `Next (${step + 1}/${STEPS.length})` : `Напред (${step + 1}/${STEPS.length})`)}
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
            {isEn ? 'Skip guide' : 'Пропусни ръководството'}
          </button>
        </div>
      </div>
    </>
  );
}
