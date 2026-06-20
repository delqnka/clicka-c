'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { AdminInfoCard } from '@/components/admin/admin-ui';
import { ADMIN_T } from '@/components/admin/admin-theme';

type Settings = {
  email_from: string | null;
  email_from_name: string | null;
  resend_domain: string | null;
  resend_verified_at: string | null;
  uses_own_key: boolean;
  has_global_key: boolean;
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
  const [emailFrom, setEmailFrom] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [resendDomain, setResendDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/resend-settings?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: Settings) => {
        if (cancelled) return;
        setSettings(data);
        setEmailFrom(data.email_from ?? '');
        setEmailFromName(data.email_from_name ?? '');
        setResendDomain(data.resend_domain ?? '');
        setUseOwnKey(Boolean(data.uses_own_key));
        if (data.uses_own_key) setShowAdvanced(true);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const isConnected = Boolean(settings?.email_from && settings?.resend_domain);

  async function save() {
    if (!emailFrom.trim()) {
      setNotice('Попълнете подателя.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/resend-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailFrom: emailFrom.trim(),
          emailFromName: emailFromName.trim(),
          resendDomain: resendDomain.trim(),
          apiKey: useOwnKey ? apiKey.trim() : null,
        }),
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
        setSettings({
          email_from: null,
          email_from_name: null,
          resend_domain: null,
          resend_verified_at: null,
          uses_own_key: false,
          has_global_key: settings?.has_global_key ?? false,
        });
        setEmailFrom('');
        setEmailFromName('');
        setResendDomain('');
        setUseOwnKey(false);
        setApiKey('');
        setShowAdvanced(false);
        setNotice('Имейл подателят е изключен. Връщаме се към стандартния подател.');
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
          Използваме един централен Resend акаунт и verified домейните на клиентите. За да
          изпращате от собствен домейн (например <code>noreply@vashsalon.bg</code>), добавете
          домейна в централния Resend акаунт и го посочете тук.
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: ADMIN_T.subtle }}>
          Не е нужен отделен Resend акаунт за този салон. Нужен е само verified домейн в{' '}
          <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: ADMIN_T.text }}>
            resend.com
          </a>{' '}
          и подател от този домейн.
        </p>

        {loading ? (
          <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>Зареждане…</p>
        ) : isConnected ? (
          <div style={{ fontSize: 13 }}>
            <div>
              <strong>Активен подател:</strong>{' '}
              {settings?.email_from_name ? `${settings.email_from_name} <${settings.email_from}>` : settings?.email_from}
            </div>
            {settings?.resend_domain ? (
              <div style={{ color: ADMIN_T.subtle, marginTop: 4 }}>
                Verified domain: {settings.resend_domain}
              </div>
            ) : null}
            {settings?.resend_verified_at ? (
              <div style={{ color: ADMIN_T.subtle, marginTop: 4 }}>
                Проверено: {new Date(settings.resend_verified_at).toLocaleString('bg-BG')}
              </div>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>
            Все още не е зададен собствен имейл подател за този салон.
          </p>
        )}

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Подател (имейл) — от verified домейн в Resend</span>
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

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Verified domain в Resend</span>
          <input
            type="text"
            value={resendDomain}
            onChange={(e) => setResendDomain(e.target.value)}
            placeholder="vashsalon.bg"
            style={inp}
          />
        </label>

        {!settings?.has_global_key && !useOwnKey ? (
          <p style={{ margin: 0, fontSize: 12, color: '#B91C1C' }}>
            Липсва централен Resend API ключ в engine-а — включи „Имам собствен Resend акаунт" по-долу.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: ADMIN_T.subtle,
            fontSize: 12,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {showAdvanced ? 'Скрий разширени настройки' : 'Имам собствен Resend акаунт →'}
        </button>

        {showAdvanced ? (
          <div style={{ display: 'grid', gap: 8, padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={useOwnKey}
                onChange={(e) => setUseOwnKey(e.target.checked)}
              />
              <span>Използвай моя собствен Resend API ключ за този салон</span>
            </label>
            {useOwnKey ? (
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <span>Resend API ключ</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.uses_own_key ? '••• (вече запазен — въведи нов за смяна)' : 're_xxxxxxxxxxxxxxxxxxxxxxxx'}
                  autoComplete="off"
                  style={{ ...inp, fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: 11, color: ADMIN_T.subtle }}>
                  Записва се encrypted. Verification се прави срещу твоя акаунт.
                </span>
              </label>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>
                По подразбиране ползваме централния engine акаунт — твоят домейн трябва да е добавен там.
                Включи отметката ако искаш да изпращаш през собствения си Resend акаунт.
              </p>
            )}
          </div>
        ) : null}

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
