'use client';

import { useState } from 'react';
import { getCustomDomainAdminUrl, getPlatformAdminUrl } from '@/lib/domain-routing';

type Result = {
  ok: boolean;
  salonId: string;
  slug: string;
  magicLink: string | null;
  domainStatus: string | null;
  inviteSent: boolean;
};

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Грешка при създаване');
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
        className="min-h-[52px] w-full rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/92"
      >
        + Добави нов салон
      </button>
    );
  }

  if (result) {
    const normalizedCustomDomain = customDomain.trim().toLowerCase();
    const primaryAdminUrl = normalizedCustomDomain
      ? `${getCustomDomainAdminUrl(normalizedCustomDomain)}/admin`
      : getPlatformAdminUrl(result.slug);
    const fallbackAdminUrl = getPlatformAdminUrl(result.slug);
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
      <div className="space-y-4 rounded-[28px] border border-[#bbf7d0] bg-white p-5 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-black">Салонът е създаден ✓</div>
            <div className="mt-0.5 text-xs text-black/55">slug: {result.slug}</div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer text-xs text-black/55 hover:text-black"
          >
            Затвори
          </button>
        </div>

        <div className="grid gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-black/55">DNS статус:</span>
            <span className={`px-2 py-0.5 rounded font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-black/55">Onboarding имейл:</span>
            <span className={`px-2 py-0.5 rounded font-semibold ${result.inviteSent ? 'text-emerald-700 bg-emerald-100' : 'text-black/60 bg-white border border-black/10'}`}>
              {result.inviteSent ? 'изпратен' : 'не е изпратен'}
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
            Admin checklist
          </div>
          <div className="text-xs text-black">
            Основен admin URL: <span className="font-mono">{primaryAdminUrl.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="text-xs text-black/72">
            Fallback admin URL: <span className="font-mono">{fallbackAdminUrl.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="text-[11px] leading-relaxed text-black/48">
            Ако custom домейнът още не е активен, влизай през fallback адреса. Не е нужно да активираш `admin.` поддомейн.
          </div>
        </div>

        {result.magicLink ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-black/72">
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
                className="rounded-full border border-[#15803d] bg-[#15803d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#166534]"
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
    <div className="space-y-4 rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-black">Нов салон</div>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="cursor-pointer text-xs text-black/55 hover:text-black"
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
          <span className="mt-1 block text-black/42">
            Ако е попълнен — engine ще го регистрира във Vercel + админът ще е на {customDomain || 'домейн.bg'}/admin.
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

        {error ? <div className="rounded-2xl border border-[#fecaca] px-3 py-2 text-xs text-red-700">{error}</div> : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="min-h-[52px] rounded-full border border-[#15803d] bg-[#15803d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#166534] disabled:opacity-50"
        >
          {submitting ? 'Създаване…' : 'Създай салон'}
        </button>
      </div>
    </div>
  );
}
