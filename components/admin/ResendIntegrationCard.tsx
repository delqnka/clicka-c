'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { AdminInfoCard } from '@/components/admin/admin-ui';
import { ADMIN_T } from '@/components/admin/admin-theme';

type Settings = {
  email_from: string | null;
  email_from_name: string | null;
  resend_verified_at: string | null;
  has_key: boolean;
};

export function ResendIntegrationCard({
  slug,
  inp,
  btn,
  setNotice,
}: {
  slug: string;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  setNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/resend-settings?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: Settings) => {
        if (cancelled) return;
        setSettings(data);
        setEmailFrom(data.email_from ?? '');
        setEmailFromName(data.email_from_name ?? '');
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const isConnected = settings?.has_key && settings?.email_from;

  async function save() {
    if (!apiKey.trim() || !emailFrom.trim()) {
      setNotice('Попълнете API ключ и подател.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/resend-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), emailFrom: emailFrom.trim(), emailFromName: emailFromName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? 'Грешка при запис');
      } else {
        setSettings(data.settings);
        setApiKey('');
        setNotice('Resend настройките са запазени и проверени.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm('Сигурни ли сте? Имейлите ще се изпращат от платформения подател.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/resend-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSettings({ email_from: null, email_from_name: null, resend_verified_at: null, has_key: false });
        setEmailFrom('');
        setEmailFromName('');
        setNotice('Resend изключен. Връщаме се на платформения подател.');
      } else {
        setNotice('Грешка при изключване');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminInfoCard title="Resend (имейл подател)" status={isConnected ? 'connected' : 'pending'}>
      <div style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: ADMIN_T.subtle }}>
          По подразбиране всички имейли (резервации, потвърждения, отзиви, покани за служители) се
          изпращат от платформения подател. За да изпращате от собствен домейн (напр.{' '}
          <code>noreply@vashsalon.bg</code>), свържете акаунт в{' '}
          <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: ADMIN_T.text }}>
            resend.com
          </a>{' '}
          и въведете API ключа тук.
        </p>

        {loading ? (
          <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>Зареждане…</p>
        ) : isConnected ? (
          <div style={{ fontSize: 13 }}>
            <div>
              <strong>Активен подател:</strong>{' '}
              {settings?.email_from_name ? `${settings.email_from_name} <${settings.email_from}>` : settings?.email_from}
            </div>
            {settings?.resend_verified_at ? (
              <div style={{ color: ADMIN_T.subtle, marginTop: 4 }}>
                Проверено: {new Date(settings.resend_verified_at).toLocaleString('bg-BG')}
              </div>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>
            Все още не е свързан собствен Resend акаунт.
          </p>
        )}

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Resend API ключ {settings?.has_key ? '(оставете празно за да запазите текущия)' : ''}</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="re_xxxxxxxxxxxx"
            autoComplete="off"
            style={inp}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Подател (имейл) — домейнът трябва да е верифициран в Resend</span>
          <input
            type="email"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder="noreply@vashsalon.bg"
            style={inp}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Показано име на подателя (опционално)</span>
          <input
            type="text"
            value={emailFromName}
            onChange={(e) => setEmailFromName(e.target.value)}
            placeholder="Името на салона"
            style={inp}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={save} disabled={saving} style={btn('primary')}>
            {saving ? 'Запис…' : 'Провери и запази'}
          </button>
          {isConnected ? (
            <button type="button" onClick={disconnect} disabled={saving} style={btn('danger')}>
              Изключи
            </button>
          ) : null}
        </div>
      </div>
    </AdminInfoCard>
  );
}
