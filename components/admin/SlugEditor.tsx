'use client';

import { useState, type CSSProperties } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField } from '@/components/admin/admin-ui';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,10}[a-z0-9]$|^[a-z0-9]{2,12}$/;

function validate(val: string): string | null {
  if (!val) return 'Въведи адрес.';
  if (val.length < 2) return 'Минимум 2 символа.';
  if (val.length > 12) return 'Максимум 12 символа.';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              setError(''); setNotice('');
            }}
            placeholder="urban"
            maxLength={12}
            style={{
              ...fieldInp,
              borderRadius: '6px 0 0 6px',
              borderRight: 'none',
              flex: 1,
              minWidth: 0,
            }}
          />
          <span style={{
            padding: '7px 10px',
            fontSize: 13,
            background: '#f4f4f5',
            border: `1px solid ${ADMIN_T.border}`,
            borderRadius: '0 6px 6px 0',
            color: '#71717a',
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
            <span style={{ color: '#a1a1aa' }}>Адрес:</span>
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

      <button
        type="button"
        disabled={busy || !changed || !!validationErr}
        onClick={handleSave}
        style={{
          alignSelf: 'flex-start',
          padding: '7px 16px',
          borderRadius: 6,
          border: 'none',
          background: busy || !changed || !!validationErr ? '#e4e4e7' : ADMIN_T.text,
          color: busy || !changed || !!validationErr ? '#a1a1aa' : '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: busy || !changed || !!validationErr ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Запазване…' : 'Запази адреса'}
      </button>

      <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
        След промяна ще бъдеш пренасочена към новия адрес. Стария адрес спира да работи.
      </p>
    </div>
  );
}
