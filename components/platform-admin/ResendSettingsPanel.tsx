'use client';

import { useCallback, useEffect, useState } from 'react';

type Settings = {
  salon_id: string;
  salon_name: string | null;
  email_from: string | null;
  email_from_name: string | null;
  resend_domain: string | null;
  resend_verified_at: string | null;
  uses_own_key: boolean;
  has_global_key: boolean;
};

type Props = {
  salonId: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('bg-BG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function ResendSettingsPanel({ salonId }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [emailFrom, setEmailFrom] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [resendDomain, setResendDomain] = useState('');
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pa/resend-settings?salonId=${encodeURIComponent(salonId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Settings;
      setSettings(data);
      setEmailFrom(data.email_from ?? '');
      setEmailFromName(data.email_from_name ?? '');
      setResendDomain(data.resend_domain ?? '');
      setUseOwnKey(Boolean(data.uses_own_key));
      setApiKey('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/pa/resend-settings?salonId=${encodeURIComponent(salonId)}`, {
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
      if (!res.ok) throw new Error(data.error || 'Грешка при запис');
      setSettings(data.settings);
      setApiKey('');
      setNotice('Запазено и проверено в Resend.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm('Изключи имейл подателя за този салон?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/pa/resend-settings?salonId=${encodeURIComponent(salonId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Грешка при изключване');
      await refresh();
      setNotice('Имейл подателят е изключен.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setSaving(false);
    }
  }

  const isConfigured = Boolean(settings?.email_from);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Имейл подател (Resend)</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {isConfigured
              ? `Активен: ${settings?.email_from_name ? `${settings.email_from_name} <${settings.email_from}>` : settings?.email_from}`
              : 'Не е настроен — имейлите тръгват от платформения подател.'}
          </div>
          {settings?.uses_own_key ? (
            <div className="text-xs text-amber-700 mt-1 font-medium">
              Използва се собствен Resend ключ на салона
            </div>
          ) : null}
          {settings?.resend_verified_at ? (
            <div className="text-xs text-zinc-400 mt-0.5">
              Проверено: {formatDate(settings.resend_verified_at)}
            </div>
          ) : null}
        </div>
        {isConfigured ? (
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40"
          >
            Изключи
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="text-xs text-zinc-400">Зареждане…</div>
      ) : (
        <div className="space-y-2.5">
          {!settings?.has_global_key && !useOwnKey ? (
            <div className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
              Липсва централен Resend API ключ в engine-а — включи „собствен ключ".
            </div>
          ) : null}

          <label className="block text-xs text-zinc-600">
            <span className="block mb-1 font-medium">Подател (имейл от verified домейн)</span>
            <input
              type="email"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              placeholder="noreply@vashsalon.bg"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </label>

          <label className="block text-xs text-zinc-600">
            <span className="block mb-1 font-medium">Показано име (опционално)</span>
            <input
              type="text"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              placeholder="Името на салона"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </label>

          <label className="block text-xs text-zinc-600">
            <span className="block mb-1 font-medium">Verified domain</span>
            <input
              type="text"
              value={resendDomain}
              onChange={(e) => setResendDomain(e.target.value)}
              placeholder="vashsalon.bg"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={useOwnKey}
              onChange={(e) => setUseOwnKey(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Клиентката има собствен Resend акаунт (използвай нейния API ключ)</span>
          </label>

          {useOwnKey ? (
            <label className="block text-xs text-zinc-600">
              <span className="block mb-1 font-medium">Resend API ключ на клиентката</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.uses_own_key ? '••• (вече запазен — въведи нов за смяна)' : 're_xxxxxxxxxxxxxxxxxxxxxxxx'}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                autoComplete="off"
              />
              <span className="block mt-1 text-zinc-400">
                Записва се encrypted. Verification се прави срещу нейния акаунт.
              </span>
            </label>
          ) : null}

          {error ? <div className="text-xs text-red-700">{error}</div> : null}
          {notice ? <div className="text-xs text-emerald-700">{notice}</div> : null}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || (useOwnKey && !apiKey.trim() && !settings?.uses_own_key)}
            className="rounded-full border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/92 disabled:opacity-40"
          >
            {saving ? 'Проверка…' : 'Провери и запази'}
          </button>
        </div>
      )}
    </div>
  );
}
