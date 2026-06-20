'use client';

import { useState } from 'react';

type Result = {
  ok: boolean;
  salonId: string;
  slug: string;
  magicLink: string | null;
  domainStatus: string | null;
  inviteSent: boolean;
};

export function NewSalonForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [autoSendInvite, setAutoSendInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setOwnerName('');
    setCustomDomain('');
    setAutoSendInvite(true);
    setError('');
    setResult(null);
    setCopied(false);
  }

  async function submit() {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Името и имейлът са задължителни.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/pa/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          ownerName: ownerName.trim() || undefined,
          customDomain: customDomain.trim() || undefined,
          autoSendInvite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Грешка при създаване');
        return;
      }
      setResult(data as Result);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!result?.magicLink) return;
    navigator.clipboard.writeText(result.magicLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-white
                   bg-gradient-to-r from-indigo-600 to-pink-500 hover:opacity-90 cursor-pointer min-h-[44px]"
      >
        + Добави нов салон
      </button>
    );
  }

  if (result) {
    const statusLabel =
      result.domainStatus === 'active' ? 'активен'
      : result.domainStatus === 'pending_verification' ? 'чака верификация'
      : result.domainStatus === 'pending_dns' ? 'чака DNS'
      : result.domainStatus === 'requested' ? 'заявен'
      : result.domainStatus ?? 'без домейн';
    const statusColor =
      result.domainStatus === 'active' ? 'text-emerald-700 bg-emerald-50'
      : 'text-amber-700 bg-amber-50';

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-emerald-900">Салонът е създаден ✓</div>
            <div className="text-xs text-emerald-800 mt-0.5">slug: {result.slug}</div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-emerald-700 hover:underline cursor-pointer"
          >
            Затвори
          </button>
        </div>

        <div className="grid gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-800">DNS статус:</span>
            <span className={`px-2 py-0.5 rounded font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-800">Onboarding имейл:</span>
            <span className={`px-2 py-0.5 rounded font-semibold ${result.inviteSent ? 'text-emerald-700 bg-emerald-100' : 'text-zinc-600 bg-zinc-100'}`}>
              {result.inviteSent ? 'изпратен' : 'не е изпратен'}
            </span>
          </div>
        </div>

        {result.magicLink ? (
          <div className="space-y-1.5">
            <div className="text-xs text-emerald-800 font-medium">
              Magic link (валиден 72ч){result.inviteSent ? ' — fallback ако имейлът не пристигне' : ''}:
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.magicLink}
                className="flex-1 px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              >
                {copied ? '✓ Копирано' : 'Копирай'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Нов салон</div>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          Отказ
        </button>
      </div>

      <div className="grid gap-2.5">
        <label className="block text-xs text-zinc-600">
          <span className="block mb-1 font-medium">Име на салона *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paradise Studio"
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            maxLength={64}
          />
        </label>

        <label className="block text-xs text-zinc-600">
          <span className="block mb-1 font-medium">Имейл на собственичката *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
        </label>

        <label className="block text-xs text-zinc-600">
          <span className="block mb-1 font-medium">Име на собственичката (опционално)</span>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Мария"
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            maxLength={64}
          />
        </label>

        <label className="block text-xs text-zinc-600">
          <span className="block mb-1 font-medium">
            Custom домейн (препоръчително)
          </span>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
            placeholder="paradise-studio.bg"
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            maxLength={64}
          />
          <span className="block mt-1 text-zinc-400">
            Ако е попълнен — engine ще го регистрира във Vercel + ще генерира admin.{customDomain || 'домейн.bg'} линк.
            Иначе админът ще е на platform subdomain.
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={autoSendInvite}
            onChange={(e) => setAutoSendInvite(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Изпрати автоматично onboarding имейл с magic link</span>
        </label>

        {error ? <div className="text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">{error}</div> : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                     bg-gradient-to-r from-indigo-600 to-pink-500 hover:opacity-90 cursor-pointer
                     disabled:opacity-50 min-h-[44px]"
        >
          {submitting ? 'Създаване…' : 'Създай салон'}
        </button>
      </div>
    </div>
  );
}
