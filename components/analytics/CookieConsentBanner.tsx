'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  hasAnsweredConsent,
  saveConsentPreferences,
} from '@/lib/cookie-consent';

type View = 'simple' | 'details';

export function CookieConsentBanner({ cookiesPath = '/cookies' }: { cookiesPath?: string }) {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>('simple');
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    if (!hasAnsweredConsent()) setVisible(true);
  }, []);

  function acceptAll() {
    saveConsentPreferences({ analytics: true, marketing: true });
    setVisible(false);
  }

  function rejectAll() {
    saveConsentPreferences({ analytics: false, marketing: false });
    setVisible(false);
  }

  function saveCustom() {
    saveConsentPreferences({ analytics, marketing });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9998,
      maxWidth: 500, margin: '0 auto',
      background: '#18181b', color: '#fff',
      borderRadius: 16, padding: '20px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 14,
      fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
    }}>
      {view === 'simple' ? (
        <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#d4d4d8' }}>
            Използваме бисквитки за анализ и маркетинг. Можете да изберете кои да приемете.{' '}
            <Link href={cookiesPath} style={{ color: '#a78bfa', textDecoration: 'underline' }}>
              Научи повече
            </Link>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={acceptAll} style={btnPrimary}>Приемам всички</button>
            <button onClick={rejectAll} style={btnSecondary}>Отказвам</button>
            <button onClick={() => setView('details')} style={btnText}>Настройки</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Настройки за поверителност</p>

          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>Задължителни</p>
              <p style={descStyle}>Необходими за работата на сайта.</p>
            </div>
            <span style={{ color: '#71717a', fontSize: 13 }}>Винаги активни</span>
          </div>

          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>Аналитични</p>
              <p style={descStyle}>Google Analytics 4, Microsoft Clarity — анализ на трафика.</p>
            </div>
            <Toggle checked={analytics} onChange={setAnalytics} />
          </div>

          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>Маркетингови</p>
              <p style={descStyle}>Meta Pixel — персонализирана реклама.</p>
            </div>
            <Toggle checked={marketing} onChange={setMarketing} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveCustom} style={btnPrimary}>Запази избора</button>
            <button onClick={acceptAll} style={btnSecondary}>Приемам всички</button>
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      style={{
        flexShrink: 0,
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'linear-gradient(135deg,#e11d48,#a855f7)' : '#3f3f46',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

const btnPrimary: React.CSSProperties = {
  flex: 1, minWidth: 120, padding: '10px 0', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#e11d48,#a855f7)',
  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnSecondary: React.CSSProperties = {
  flex: 1, minWidth: 100, padding: '10px 0', borderRadius: 10,
  border: '1px solid #3f3f46', background: 'transparent',
  color: '#a1a1aa', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnText: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent',
  color: '#71717a', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  paddingBottom: 12, borderBottom: '1px solid #27272a',
};

const labelStyle: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: '#fff',
};

const descStyle: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 12, color: '#71717a', lineHeight: 1.4,
};
