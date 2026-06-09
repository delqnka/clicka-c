'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  hasAnsweredConsent,
  saveConsentPreferences,
} from '@/lib/cookie-consent';

type View = 'simple' | 'details';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

type Props = {
  cookiesPath?: string;
  /** Light card styled for public salon sites; default is dark marketing style. */
  variant?: 'default' | 'salon';
  primaryColor?: string;
  description?: string;
};

export function CookieConsentBanner({
  cookiesPath = '/cookies',
  variant = 'default',
  primaryColor = '#db2777',
  description,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>('simple');
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const isSalon = variant === 'salon';
  const compact = useIsMobile();

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

  const isBar = !compact;

  const actionsStyle: React.CSSProperties = isBar
    ? {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 };

  const shellStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
    ...(isBar
      ? { bottom: 0, left: 0, right: 0 }
      : { bottom: 10, left: 12, right: 12 }),
  };

  const innerStyle: React.CSSProperties = isSalon
    ? isBar
      ? {
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 24px',
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          ...(view === 'details' ? { maxHeight: 'min(50vh, 420px)', overflowY: 'auto' } : {}),
        }
      : {
          borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.1)',
          background: '#fff',
          padding: '12px 14px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxHeight: '28dvh',
          overflowY: 'auto',
        }
    : isBar
      ? {
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 24px',
          background: '#18181b',
          color: '#fff',
          borderTop: '1px solid #27272a',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          ...(view === 'details' ? { maxHeight: 'min(50vh, 420px)', overflowY: 'auto' } : {}),
        }
      : {
          background: '#18181b',
          color: '#fff',
          borderRadius: 12,
          padding: '8px 10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        };

  const barRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    width: '100%',
  };

  const btnBar: React.CSSProperties = isBar
    ? {
        width: 'auto',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minHeight: 40,
        padding: '10px 18px',
      }
    : {};

  const textStyle: React.CSSProperties = isSalon
    ? {
        margin: 0,
        fontSize: compact ? 13 : 14,
        lineHeight: compact ? 1.45 : 1.6,
        color: '#52525b',
      }
    : {
        margin: 0,
        fontSize: compact ? 11 : 14,
        lineHeight: compact ? 1.4 : 1.6,
        color: '#d4d4d8',
      };

  const btnBase: React.CSSProperties = compact
    ? {
        minHeight: 28,
        padding: '5px 6px',
        fontSize: 11,
        lineHeight: 1.1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    : {
        lineHeight: 1.2,
      };

  const linkStyle: React.CSSProperties = isSalon
    ? { color: primaryColor, textDecoration: 'underline' }
    : { color: '#a78bfa', textDecoration: 'underline' };

  const btnPrimary: React.CSSProperties = isSalon
    ? {
        ...btnBase,
        ...btnBar,
        width: isBar ? 'auto' : '100%',
        padding: compact ? btnBase.padding : isBar ? btnBar.padding : '12px 20px',
        borderRadius: 999,
        border: 'none',
        background: primaryColor,
        color: '#fff',
        fontWeight: 600,
        fontSize: compact ? 13 : 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }
    : {
        ...btnBase,
        ...btnBar,
        width: isBar ? 'auto' : '100%',
        padding: compact ? btnBase.padding : isBar ? btnBar.padding : '10px 16px',
        borderRadius: 10,
        border: 'none',
        background: 'linear-gradient(135deg,#e11d48,#a855f7)',
        color: '#fff',
        fontWeight: 700,
        fontSize: compact ? 13 : 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
      };

  const btnSecondary: React.CSSProperties = isSalon
    ? {
        ...btnBase,
        ...btnBar,
        width: isBar ? 'auto' : '100%',
        padding: compact ? btnBase.padding : isBar ? btnBar.padding : '12px 20px',
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.2)',
        background: 'transparent',
        color: '#52525b',
        fontWeight: 600,
        fontSize: compact ? 13 : 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }
    : {
        ...btnBase,
        ...btnBar,
        width: isBar ? 'auto' : '100%',
        padding: compact ? btnBase.padding : isBar ? btnBar.padding : '10px 16px',
        borderRadius: 10,
        border: '1px solid #52525b',
        background: 'transparent',
        color: '#e4e4e7',
        fontWeight: 600,
        fontSize: compact ? 12 : 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
      };

  const btnText: React.CSSProperties = isSalon
    ? {
        width: isBar ? 'auto' : '100%',
        minHeight: compact ? 32 : undefined,
        padding: isBar ? '10px 12px' : compact ? '4px 8px' : '8px 12px',
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: '#71717a',
        fontWeight: 600,
        fontSize: compact ? 12 : 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: isBar ? 'left' : 'center',
        ...(compact ? { gridColumn: '1 / -1' } : {}),
      }
    : {
        width: isBar ? 'auto' : '100%',
        minHeight: compact ? 32 : undefined,
        padding: isBar ? '10px 12px' : compact ? '4px 8px' : '10px 12px',
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: compact ? '#fff' : '#71717a',
        fontWeight: 500,
        fontSize: compact ? 11 : 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: isBar ? 'left' : compact ? 'center' : undefined,
        ...(compact && !isBar ? { gridColumn: '1 / -1', minHeight: 'unset', padding: '2px 8px' } : {}),
      };

  const simpleBody = (
    <>
      <p style={{ ...textStyle, ...(isBar ? { flex: 1, minWidth: 0 } : {}) }}>
        {description ?? 'Използваме задължителни бисквитки за резервации. С ваше съгласие използваме и бисквитки за анализ и маркетинг.'}{' '}
        <Link href={cookiesPath} style={linkStyle}>
          Научи повече
        </Link>
      </p>
      <div style={actionsStyle}>
        <button type="button" onClick={rejectOptional} style={btnSecondary}>Само задължителни</button>
        <button type="button" onClick={acceptAll} style={btnPrimary}>Приемам всички</button>
        <button type="button" onClick={() => setView('details')} style={btnText}>Настройки</button>
      </div>
    </>
  );

  const content = view === 'simple' ? (
    isBar ? <div style={barRowStyle}>{simpleBody}</div> : simpleBody
  ) : (
    <>
      <p style={{
        margin: 0,
        fontSize: compact ? 14 : 15,
        fontWeight: 700,
        color: isSalon ? '#18181b' : '#fff',
      }}>
        Настройки за поверителност
      </p>

      <div style={isSalon ? { ...salonRowStyle, ...(compact ? compactRowStyle : {}) } : { ...rowStyle, ...(compact ? compactRowStyle : {}) }}>
        <div>
          <p style={isSalon ? salonLabelStyle : labelStyle}>Задължителни</p>
          <p style={isSalon ? salonDescStyle : descStyle}>
            Необходими за резервации и запомняне на вашия избор.
          </p>
        </div>
        <span style={{ color: '#a1a1aa', fontSize: 13, flexShrink: 0 }}>Винаги активни</span>
      </div>

      <div style={isSalon ? { ...salonRowStyle, ...(compact ? compactRowStyle : {}) } : { ...rowStyle, ...(compact ? compactRowStyle : {}) }}>
        <div>
          <p style={isSalon ? salonLabelStyle : labelStyle}>Аналитични</p>
          <p style={isSalon ? salonDescStyle : descStyle}>
            Google Analytics 4, Microsoft Clarity — анализ на трафика.
          </p>
        </div>
        <Toggle checked={analytics} onChange={setAnalytics} primaryColor={primaryColor} />
      </div>

      <div style={isSalon ? { ...salonRowStyle, ...(compact ? compactRowStyle : {}), borderBottom: 'none' } : { ...rowStyle, ...(compact ? compactRowStyle : {}), borderBottom: 'none' }}>
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

  return (
    <div style={shellStyle}>
      <div style={innerStyle}>{content}</div>
    </div>
  );
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

const compactRowStyle: React.CSSProperties = {
  gap: 8,
  paddingBottom: 8,
};

const labelStyle: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: '#fff',
};

const salonLabelStyle: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: '#18181b',
};

const descStyle: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 12, color: '#a1a1aa', lineHeight: 1.4,
};

const salonDescStyle: React.CSSProperties = {
  margin: '2px 0 0', fontSize: 12, color: '#71717a', lineHeight: 1.4,
};
