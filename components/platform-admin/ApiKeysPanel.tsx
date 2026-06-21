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
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('bg-BG', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

export function ApiKeysPanel({ salonId }: Props) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [issued, setIssued] = useState<{ plaintext: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pa/api-keys?salonId=${encodeURIComponent(salonId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleIssue() {
    if (issuing) return;
    setIssuing(true);
    setError('');
    try {
      const res = await fetch('/api/pa/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, label: newLabel.trim() || undefined, scopes: ['read', 'book'] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setIssued({ plaintext: data.plaintext, prefix: data.prefix });
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

  async function handleCopy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be blocked; user can select manually */ }
  }

  return (
    <div className="pt-1 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">API ключове</p>
        {!issued && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            {showNew ? 'Отказ' : '+ Издай ключ'}
          </button>
        )}
      </div>

      {/* Plaintext warning panel — shown ONCE right after issue */}
      {issued && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-900">
            ⚠ Запишете ключа сега — няма да се покаже отново
          </p>
          <code className="block w-full text-[11px] font-mono break-all bg-white border border-amber-200 rounded-lg p-2 select-all text-gray-900">
            {issued.plaintext}
          </code>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            >
              {copied ? '✓ Копирано' : 'Копирай'}
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
            placeholder="Етикет (по избор) — напр. „paradise.bg prod"
            maxLength={80}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={handleIssue}
            disabled={issuing}
            className="w-full rounded-full border border-[#15803d] bg-[#15803d] py-2.5 text-xs font-semibold text-white transition hover:bg-[#166534] disabled:opacity-40 cursor-pointer"
          >
            {issuing ? 'Издава…' : 'Издай нов ключ'}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
