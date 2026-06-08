'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setVisible(true);
  }, []);

  function respond(yes: boolean) {
    localStorage.setItem('cookie-consent', yes ? 'yes' : 'no');
    window.dispatchEvent(new Event('cookie-consent-updated'));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9998,
      maxWidth: 480, margin: '0 auto',
      background: '#18181b', color: '#fff',
      borderRadius: 16, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 12,
      fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
    }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#d4d4d8' }}>
        Използваме бисквитки за анализ и подобряване на сайта.{' '}
        <Link href="/cookies" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
          Научи повече
        </Link>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => respond(true)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#e11d48,#a855f7)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Приемам
        </button>
        <button
          onClick={() => respond(false)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            border: '1px solid #3f3f46', background: 'transparent',
            color: '#a1a1aa', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Отказвам
        </button>
      </div>
    </div>
  );
}
