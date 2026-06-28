'use client';

import { useCallback, useEffect, useState } from 'react';

type ApiKey = {
  id: string;
  key_prefix: string;
  label: string | null;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Props = {
  salonId: string;
  salonSlug: string;
  customDomain?: string | null;
};

const DEFAULT_ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || 'https://app.alternine.co';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '—';
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = String(parsed.getUTCFullYear());
    return `${day}.${month}.${year}`;
  }
  catch { return '—'; }
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function ApiKeysPanel({ salonId, salonSlug, customDomain }: Props) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [issued, setIssued] = useState<{ plaintext: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [error, setError] = useState('');
  const [replaceActive, setReplaceActive] = useState(true);
  const siteDomain = String(customDomain ?? '').trim() || `${salonSlug}.site`;
  const suggestedLabel = `${siteDomain} production`;
  const envSnippet = issued
    ? `NEXT_PUBLIC_BOOKING_API_KEY=${issued.plaintext}\nNEXT_PUBLIC_BOOKING_ENGINE_URL=${DEFAULT_ENGINE_URL}`
    : '';
  const sdkSnippet = issued
    ? `import { createBookingClient } from '@clicka1/booking-sdk';

const client = createBookingClient({
  engineUrl: '${DEFAULT_ENGINE_URL}',
  apiKey: '${issued.plaintext}',
  salonSlug: '${salonSlug}',
});`
    : '';
  const activeKeys = (keys ?? []).filter((key) => !key.revoked_at);
  const bookingLocked = activeKeys.length === 0;
  const hasCustomDomain = !!String(customDomain ?? '').trim();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pa/api-keys?salonId=${encodeURIComponent(salonId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await readJsonSafe(res);
      setKeys(Array.isArray(data.keys) ? (data.keys as ApiKey[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleIssue() {
    if (issuing) return;
    if (replaceActive && activeKeys.length > 0) {
      const confirmed = confirm('Новият ключ ще спре всички текущи активни ключове за този салон. Продължаваме ли?');
      if (!confirmed) return;
    }
    setIssuing(true);
    setError('');
    try {
      const res = await fetch('/api/pa/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          label: newLabel.trim() || suggestedLabel,
          scopes: ['read', 'book'],
          replaceActive,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
      setIssued({
        plaintext: typeof data.plaintext === 'string' ? data.plaintext : '',
        prefix: typeof data.prefix === 'string' ? data.prefix : '',
      });
      setNewLabel('');
      setShowNew(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(id: string) {
    if (revoking) return;
    if (!confirm('Сигурни ли сте? Действието е необратимо.')) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/pa/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setRevoking(null);
    }
  }

  async function handleRestore(id: string) {
    if (restoring) return;
    setRestoring(id);
    setError('');
    try {
      const res = await fetch('/api/pa/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'restore' }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setRestoring(null);
    }
  }

  async function handleCopy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be blocked; user can select manually */ }
  }

  async function handleCopyEnv() {
    if (!envSnippet) return;
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    } catch { /* clipboard may be blocked; user can select manually */ }
  }

  async function handleCopySdk() {
    if (!sdkSnippet) return;
    try {
      await navigator.clipboard.writeText(sdkSnippet);
      setCopiedSdk(true);
      setTimeout(() => setCopiedSdk(false), 2000);
    } catch { /* clipboard may be blocked; user can select manually */ }
  }

  return (
    <div className="pt-1 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">API ключове</p>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
              bookingLocked
                ? 'border-[#fecaca] text-[#b91c1c]'
                : 'border-[#bbf7d0] text-[#15803d]'
            }`}
          >
            {bookingLocked ? 'booking locked' : 'booking active'}
          </span>
        {!issued && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            {showNew ? 'Отказ' : '+ Издай ключ'}
          </button>
        )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/8 bg-[#f7f7f5] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
          Client wiring
        </p>
        <p className="mt-1 text-xs leading-5 text-black/58">
          Издай ключ, сложи го в `.env` на сайта и клиентският frontend ще говори с Clicka backend-а през `X-API-Key`.
        </p>
        <p className="mt-2 text-[11px] leading-5 text-black/45">
          Активни ключове: {activeKeys.length}
        </p>
      </div>

      {!hasCustomDomain && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Този салон още няма `custom_domain`. Добре е първо да го запишеш, за да не издаваш ключ с временен етикет и грешен onboarding flow.
        </div>
      )}

      {/* Plaintext warning panel — shown ONCE right after issue */}
      {issued && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-3">
          <p className="text-xs font-bold text-amber-900">
            ⚠ Запишете ключа сега — няма да се покаже отново
          </p>
          <code className="block w-full text-[11px] font-mono break-all bg-white border border-amber-200 rounded-lg p-2 select-all text-gray-900">
            {issued.plaintext}
          </code>
          <div className="rounded-lg border border-amber-200 bg-white p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/42">
              Client .env
            </p>
            <code className="block whitespace-pre-wrap break-all text-[11px] font-mono text-gray-900">
              {envSnippet}
            </code>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/42">
              SDK config
            </p>
            <code className="block whitespace-pre-wrap break-all text-[11px] font-mono text-gray-900">
              {sdkSnippet}
            </code>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-2 text-[11px] leading-5 text-black/62">
            1. Сложи ключа в клиентския `.env`.
            <br />
            2. Redeploy-ни сайта.
            <br />
            3. Ако спрат да плащат, натискаш `Revoke`.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            >
              {copied ? '✓ Копирано' : 'Копирай'}
            </button>
            <button
              onClick={handleCopyEnv}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              {copiedEnv ? '✓ .env копиран' : 'Копирай .env'}
            </button>
            <button
              onClick={handleCopySdk}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              {copiedSdk ? '✓ SDK config копиран' : 'Copy SDK config'}
            </button>
            <button
              onClick={() => setIssued(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              Затвори
            </button>
          </div>
        </div>
      )}

      {/* New-key form */}
      {showNew && !issued && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={`Етикет — напр. ${suggestedLabel}`}
            maxLength={80}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
          />
          <p className="text-[11px] leading-5 text-black/50">
            Ако оставиш празно, ще ползваме `{suggestedLabel}`.
          </p>
          <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-[#fafaf9] p-2 text-[11px] leading-5 text-black/62">
            <input
              type="checkbox"
              checked={replaceActive}
              onChange={(e) => setReplaceActive(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-[#15803d] focus:ring-[#15803d]"
            />
            <span>
              Спри старите активни ключове автоматично.
              Това е полезно, ако искаш да има само един работещ production key.
            </span>
          </label>
          <button
            onClick={handleIssue}
            disabled={issuing}
            className="w-full rounded-full border border-[#15803d] bg-[#15803d] py-2.5 text-xs font-semibold text-white transition hover:bg-[#166534] disabled:opacity-40 cursor-pointer"
          >
            {issuing ? 'Издава…' : 'Издай ключ'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Existing keys */}
      {loading && <p className="text-xs text-gray-400">Зарежда…</p>}
      {!loading && keys && keys.length === 0 && (
        <p className="text-xs text-gray-400">Няма издадени ключове.</p>
      )}
      {!loading && keys && keys.length > 0 && (
        <ul className="space-y-1.5">
          {keys.map((k) => {
            const revoked = !!k.revoked_at;
            return (
              <li
                key={k.id}
                className={`flex items-center gap-2 rounded-2xl border p-3 ${revoked ? 'border-black/8 bg-white opacity-60' : 'border-black/10 bg-white'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <code className="text-[11px] font-mono text-gray-700">{k.key_prefix}…</code>
                    {k.label && <span className="text-xs text-gray-600 truncate">{k.label}</span>}
                    {revoked && <span className="text-[10px] uppercase text-red-500 font-semibold">revoked</span>}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {k.scopes.join(', ')} · издаден {formatDate(k.created_at)}
                    {k.last_used_at ? ` · ползван ${formatDate(k.last_used_at)}` : ' · не е ползван'}
                  </p>
                </div>
                {!revoked && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={revoking === k.id}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 disabled:opacity-40 cursor-pointer"
                  >
                    {revoking === k.id ? '…' : 'Revoke'}
                  </button>
                )}
                {revoked && (
                  <button
                    onClick={() => handleRestore(k.id)}
                    disabled={restoring === k.id}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold border border-[#bbf7d0] text-[#15803d] bg-[#f0fdf4] hover:bg-[#dcfce7] disabled:opacity-40 cursor-pointer"
                  >
                    {restoring === k.id ? '…' : 'Активирай'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
