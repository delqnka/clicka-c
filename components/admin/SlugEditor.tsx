'use client';

import { useState, type CSSProperties } from 'react';
import { Check, Save } from 'lucide-react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField } from '@/components/admin/admin-ui';
import type { Locale } from '@/lib/i18n';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$|^[a-z0-9]{2,20}$/;

function validate(val: string, isEn: boolean): string | null {
  if (!val) return isEn ? 'Enter an address.' : 'Въведи адрес.';
  if (val.length < 2) return isEn ? 'Minimum 2 characters.' : 'Минимум 2 символа.';
  if (val.length > 20) return isEn ? 'Maximum 20 characters.' : 'Максимум 20 символа.';
  if (!SLUG_RE.test(val)) return isEn
    ? 'Only lowercase letters (a-z), digits, and hyphens. Cannot start or end with a hyphen.'
    : 'Само малки букви (a-z), цифри и тирета. Не може да започва или свършва с тире.';
  return null;
}

export function SlugEditor({
  currentSlug,
  rootDomain,
  inp,
  onSaved,
  locale = 'bg',
}: {
  currentSlug: string;
  rootDomain: string;
  inp: CSSProperties;
  onSaved: (newSlug: string) => void;
  locale?: Locale;
}) {
  const isEn = locale === 'en';
  const [value, setValue] = useState(currentSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);

  const validationErr = validate(value, isEn);
  const changed = value !== currentSlug;
  const canSave = changed && !validationErr && !busy;

  async function handleSave() {
    setError('');
    const err = validate(value, isEn);
    if (err) { setError(err); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/slug?slug=${encodeURIComponent(currentSlug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSlug: value }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (isEn ? 'Error' : 'Грешка')); return; }
      setSaved(true);
      onSaved(data.newSlug);
    } catch {
      setError(isEn ? 'Network error.' : 'Мрежова грешка.');
    } finally {
      setBusy(false);
    }
  }

  const fieldInp: CSSProperties = { ...inp, padding: '7px 10px', fontSize: 14 };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <AdminField compact label={isEn ? 'Site address' : 'Адрес на сайта'}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          border: `1.5px solid ${changed && !validationErr ? '#d1d5db' : ADMIN_T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              setError('');
              setSaved(false); // reset tick when user starts editing
            }}
            placeholder="urban"
            maxLength={20}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) void handleSave(); }}
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
            paddingLeft: 2,
            paddingRight: 10,
            fontSize: 14,
            color: '#a1a1aa',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontWeight: 500,
          }}>
            .{rootDomain}
          </span>

          {/* Save / saved icon */}
          <div style={{ paddingRight: 10, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {saved ? (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: '#dcfce7',
              }}>
                <Check size={14} strokeWidth={2.5} color="#16a34a" />
              </span>
            ) : (
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                title={isEn ? 'Save address' : 'Запази адреса'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '50%',
                  border: 'none',
                  background: canSave ? '#18181b' : 'transparent',
                  cursor: canSave ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'background 150ms',
                }}
              >
                {busy
                  ? <span style={{ fontSize: 10, color: ADMIN_T.muted }}>…</span>
                  : <Save size={13} strokeWidth={2} color={canSave ? '#fff' : '#d4d4d8'} />
                }
              </button>
            )}
          </div>
        </div>
      </AdminField>

      {/* Live preview / validation */}
      <div style={{ fontSize: 13, color: validationErr && value ? '#ef4444' : '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
        {validationErr && value ? (
          <>⚠ {validationErr}</>
        ) : (
          <>
            <span style={{ color: '#a1a1aa' }}>{isEn ? 'Site address:' : 'Адрес на сайта:'}</span>
            <span style={{ fontWeight: 600, color: ADMIN_T.text }}>{value || currentSlug}.{rootDomain}</span>
          </>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}

      <details style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.6 }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none', color: '#c4c4c8', fontSize: 11 }}>
          {isEn ? 'What happens if I change the address?' : 'Какво става ако сменя адреса?'}
        </summary>
        <div style={{ marginTop: 4, display: 'grid', gap: 1, paddingLeft: 4 }}>
          <p style={{ margin: 0 }}>{isEn ? '· Shared links will stop working' : '· Споделените линкове спират да работят'}</p>
          <p style={{ margin: 0 }}>{isEn ? '· QR codes need to be regenerated' : '· QR кодовете трябва да се генерират наново'}</p>
          <p style={{ margin: 0 }}>{isEn ? '· Google will need to re-discover your site' : '· Google ще трябва да намери отново сайта ти'}</p>
        </div>
      </details>
    </div>
  );
}
