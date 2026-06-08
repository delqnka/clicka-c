'use client';

import { useState, type CSSProperties } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField } from '@/components/admin/admin-ui';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$|^[a-z0-9]{2,20}$/;

function validate(val: string): string | null {
  if (!val) return 'Въведи адрес.';
  if (val.length < 2) return 'Минимум 2 символа.';
  if (val.length > 20) return 'Максимум 20 символа.';
  if (!SLUG_RE.test(val)) return 'Само малки букви (a-z), цифри и тирета. Не може да започва или свършва с тире.';
  return null;
}

export function SlugEditor({
  currentSlug,
  rootDomain,
  inp,
  onSaved,
}: {
  currentSlug: string;
  rootDomain: string;
  inp: CSSProperties;
  onSaved: (newSlug: string) => void;
}) {
  const [value, setValue] = useState(currentSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const validationErr = validate(value);
  const changed = value !== currentSlug;

  async function handleSave() {
    setError(''); setNotice('');
    const err = validate(value);
    if (err) { setError(err); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/slug?slug=${encodeURIComponent(currentSlug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSlug: value }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Грешка'); return; }
      onSaved(data.newSlug);
    } catch {
      setError('Мрежова грешка.');
    } finally {
      setBusy(false);
    }
  }

  const fieldInp: CSSProperties = { ...inp, padding: '7px 10px', fontSize: 14 };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AdminField compact label="Адрес на сайта">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          border: `1.5px solid ${ADMIN_T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              setError(''); setNotice('');
            }}
            placeholder="urban"
            maxLength={20}
            style={{
              ...fieldInp,
              border: 'none',
              boxShadow: 'none',
              borderRadius: 0,
              flex: 1,
              minWidth: 0,
              background: 'transparent',
            }}
          />
          <span style={{
            paddingRight: 14,
            fontSize: 14,
            color: '#a1a1aa',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontWeight: 500,
          }}>
            .{rootDomain}
          </span>
        </div>
      </AdminField>

      {/* Live preview */}
      <div style={{
        fontSize: 13,
        color: validationErr && value ? '#ef4444' : '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {validationErr && value ? (
          <>⚠ {validationErr}</>
        ) : (
          <>
            <span style={{ color: '#a1a1aa' }}>Адрес на сайта:</span>
            <span style={{ fontWeight: 600, color: ADMIN_T.text }}>
              {value || currentSlug}.{rootDomain}
            </span>
          </>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
      )}
      {notice && (
        <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>{notice}</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        type="button"
        disabled={busy || !changed || !!validationErr}
        onClick={handleSave}
        style={{
          padding: '8px 24px',
          borderRadius: 999,
          border: 'none',
          background: busy || !changed || !!validationErr
            ? '#e4e4e7'
            : 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
          color: busy || !changed || !!validationErr ? '#a1a1aa' : '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: busy || !changed || !!validationErr ? 'default' : 'pointer',
          boxShadow: busy || !changed || !!validationErr ? 'none' : '0 4px 14px rgba(219,39,119,0.28)',
        }}
      >
        {busy ? 'Запазване…' : 'Запази адреса'}
      </button>
      </div>

      <details style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.7, textAlign: 'center' }}>
        <summary style={{
          cursor: 'pointer',
          listStyle: 'none',
          fontWeight: 600,
          color: '#6b7280',
          textAlign: 'center',
        }}>
          Какво става ако сменя адреса?
        </summary>
        <div style={{ marginTop: 6, textAlign: 'left', display: 'inline-block' }}>
          <p style={{ margin: '0 0 2px' }}>· Линкът, който сте споделяли, спира да работи</p>
          <p style={{ margin: '0 0 2px' }}>· QR кодовете трябва да се генерират наново</p>
          <p style={{ margin: 0 }}>· Google ще трябва да намери отново сайта ти</p>
        </div>
      </details>
    </div>
  );
}
