'use client';

import { useTransition } from 'react';
import type { Locale } from '@/lib/i18n';
import { ADMIN_LOCALE_COOKIE } from '@/lib/admin-locale-shared';

type Props = { current: Locale };

export function LangToggle({ current }: Props) {
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current || pending) return;
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      window.location.reload();
    });
  }

  const wrap: React.CSSProperties = {
    position: 'absolute',
    top: 18,
    right: 18,
    display: 'inline-flex',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
    background: '#fff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
  };

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    border: 'none',
    background: active ? '#111' : 'transparent',
    color: active ? '#fff' : 'rgba(0,0,0,0.55)',
    cursor: pending ? 'wait' : 'pointer',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={wrap} role="group" aria-label="Language">
      <button type="button" onClick={() => setLocale('bg')} style={btn(current === 'bg')} aria-pressed={current === 'bg'}>
        BG
      </button>
      <button type="button" onClick={() => setLocale('en')} style={btn(current === 'en')} aria-pressed={current === 'en'}>
        EN
      </button>
    </div>
  );
}
