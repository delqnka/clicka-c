'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  hasAnsweredConsent,
  saveConsentPreferences,
} from '@/lib/cookie-consent';

type View = 'simple' | 'details';

type Props = {
  cookiesPath?: string;
  /** Light card styled for public salon sites; default is dark marketing style. */
  variant?: 'default' | 'salon';
  primaryColor?: string;
};

export function CookieConsentBanner({
  cookiesPath = '/cookies',
  variant = 'default',
  primaryColor = '#db2777',
}: Props) {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>('simple');
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const isSalon = variant === 'salon';

  useEffect(() => {
    if (!hasAnsweredConsent()) setVisible(true);
  }, []);

  function acceptAll() {
    saveConsentPreferences({ analytics: true, marketing: true });
    setVisible(false);
  }

  function rejectOptional() {
    saveConsentPreferences({ analytics: false, marketing: false });
    setVisible(false);
  }

  function saveCustom() {
    saveConsentPreferences({ analytics, marketing });
    setVisible(false);
  }

  if (!visible) return null;

  const actionsStyle: React.CSSProperties = isSalon
    ? { display: 'flex', flexDirection: 'column', gap: 8 }
    : { display: 'flex', gap: 8, flexWrap: 'wrap' };

  const shellStyle: React.CSSProperties = isSalon
    ? {
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 10001,
        maxWidth: 420,
        margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
      }
    : {
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 10001,
        maxWidth: 500,
        margin: '0 auto',
        background: '#18181b',
        color: '#fff',
        borderRadius: 16,
        padding: '20px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
      };

  const cardStyle: React.CSSProperties = isSalon
    ? {
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.1)',
        background: '#fff',
        padding: '18px 18px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }
    : {};

  const textStyle: React.CSSProperties = isSalon
    ? { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#52525b' }
    : { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#d4d4d8' };

  const linkStyle: React.CSSProperties = isSalon
    ? { color: primaryColor, textDecoration: 'underline' }
    : { color: '#a78bfa', textDecoration: 'underline' };

  const btnPrimary: React.CSSProperties = isSalon
    ? {
        width: '100%', padding: '12px 20px', borderRadius: 999, border: 'none',
        background: primaryColor, color: '#fff', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2,
      }
    : {
        flex: 1, minWidth: 120, padding: '10px 16px', borderRadius: 10, border: 'none',
        background: 'linear-gradient(135deg,#e11d48,#a855f7)',
        color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        fontFamily: 'inherit', lineHeight: 1.2,
      };

  const btnSecondary: React.CSSProperties = isSalon
    ? {
        width: '100%', padding: '12px 20px', borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.2)', background: 'transparent',
        color: '#52525b', fontWeight: 600, fontSize: 14, cursor: 'pointer',
        fontFamily: 'inherit', lineHeight: 1.2,
      }
    : {
        flex: 1, minWidth: 100, padding: '10px 16px', borderRadius: 10,
        border: '1px solid #3f3f46', background: 'transparent',
        color: '#a1a1aa', fontWeight: 600, fontSize: 14, cursor: 'pointer',
        fontFamily: 'inherit', lineHeight: 1.2,
      };

  const btnText: React.CSSProperties = isSalon
    ? {
        width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none', background: 'transparent',
        color: '#71717a', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'center',
      }
    : {
        padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent',
        color: '#71717a', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit',
      };

  const content = view === 'simple' ? (
    <>
      <p style={textStyle}>
        Използваме задължителни бисквитки за резервации. С ваше съгласие използваме и бисквитки за
        анализ и маркетинг.{' '}
        <Link href={cookiesPath} style={linkStyle}>
          Научи повече
        </Link>
      </p>
      <div style={actionsStyle}>
        <button type="button" onClick={acceptAll} style={btnPrimary}>Приемам всички</button>
        <button type="button" onClick={rejectOptional} style={btnSecondary}>Само задължителни</button>
        <button type="button" onClick={() => setView('details')} style={btnText}>Настройки</button>
      </div>
    </>
  ) : (
    <>
      <p style={{
        margin: 0,
        fontSize: 15,
        fontWeight: 700,
        color: isSalon ? '#18181b' : '#fff',
      }}>
        Настройки за поверителност
      </p>

      <div style={isSalon ? salonRowStyle : rowStyle}>
        <div>
          <p style={isSalon ? salonLabelStyle : labelStyle}>Задължителни</p>
          <p style={isSalon ? salonDescStyle : descStyle}>
            Необходими за резервации и запомняне на вашия избор.
          </p>
        </div>
        <span style={{ color: '#71717a', fontSize: 13, flexShrink: 0 }}>Винаги активни</span>
      </div>

      <div style={isSalon ? salonRowStyle : rowStyle}>
        <div>
          <p style={isSalon ? salonLabelStyle : labelStyle}>Аналитични</p>
          <p style={isSalon ? salonDescStyle : descStyle}>
            Google Analytics 4, Microsoft Clarity — анализ на трафика.
          </p>
        </div>
        <Toggle checked={analytics} onChange={setAnalytics} primaryColor={primaryColor} />
      </div>

      <div style={isSalon ? { ...salonRowStyle, borderBottom: 'none' } : rowStyle}>
        <div>
          <p style={isSalon ? salonLabelStyle : labelStyle}>Маркетингови</p>
          <p style={isSalon ? salonDescStyle : descStyle}>
            Meta Pixel — персонализирана реклама.
          </p>
        </div>
        <Toggle checked={marketing} onChange={setMarketing} primaryColor={primaryColor} />
      </div>

      <div style={actionsStyle}>
        <button type="button" onClick={saveCustom} style={btnPrimary}>Запази избора</button>
        <button type="button" onClick={acceptAll} style={btnSecondary}>Приемам всички</button>
      </div>
    </>
  );

  if (isSalon) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>{content}</div>
      </div>
    );
  }

  return <div style={shellStyle}>{content}</div>;
}

function Toggle({
  checked,
  onChange,
  primaryColor,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  primaryColor: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      style={{
        flexShrink: 0,
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? primaryColor : '#d4d4d8',
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

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  paddingBottom: 12, borderBottom: '1px solid #27272a',
};

const salonRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.08)',
};

const labelStyle: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: '#fff',
};

const salonLabelStyle: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: '#18181b',
};

const descStyle: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 12, color: '#71717a', lineHeight: 1.4,
};

const salonDescStyle: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 12, color: '#71717a', lineHeight: 1.4,
};
