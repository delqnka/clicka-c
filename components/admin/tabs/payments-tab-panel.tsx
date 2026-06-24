'use client';

import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';
import { type Locale } from '@/lib/i18n';

type StripeStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export function PaymentsTabPanel({
  slug,
  btn,
  locale,
}: {
  slug: string;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => React.CSSProperties;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      const preview = text.slice(0, 80).replace(/\s+/g, ' ').trim();
      throw new Error(isEn ? `The server returned a non-JSON response (HTTP ${res.status}): ${preview || 'empty'}` : `Сървърът върна не-JSON отговор (HTTP ${res.status}): ${preview || 'празно'}`);
    }
  }

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stripe/connect/status?slug=${encodeURIComponent(slug)}`);
      const data = await safeJson(res) as Partial<StripeStatus> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? (isEn ? `Error (HTTP ${res.status})` : `Грешка (HTTP ${res.status})`));
      setStatus(data as StripeStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEn ? 'Error while loading the status' : 'Грешка при зареждане на статуса'));
    } finally {
      setLoading(false);
    }
  }

  async function startOnboarding() {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await safeJson(res) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? (isEn ? `Connection error (HTTP ${res.status})` : `Грешка при свързване (HTTP ${res.status})`));
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEn ? 'Error' : 'Грешка'));
      setConnecting(false);
    }
  }

  useEffect(() => { void loadStatus(); }, [slug]);

  const isFullyConnected = status?.connected && status.chargesEnabled;

  return (
    <AdminSection title={isEn ? 'Payments' : 'Плащания'}>
      <AdminInfoCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Stripe Connect
            <svg width="44" height="18" viewBox="0 0 468 222" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe" style={{ display: 'block', flexShrink: 0 }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M414 113.4c0-25.4-12.3-45.5-35.9-45.5-23.7 0-38 20.1-38 45.3 0 29.9 16.9 45 41.1 45 11.8 0 20.7-2.7 27.5-6.4V131c-6.8 3.4-14.6 5.5-24.5 5.5-9.7 0-18.3-3.4-19.4-15.2h48.9c0-1.3.3-6.5.3-7.9zm-49.4-9.4c0-11.3 6.9-16 13.2-16 6.1 0 12.6 4.7 12.6 16h-25.8zM301.1 67.9c-9.8 0-16.1 4.6-19.6 7.8l-1.3-6.2h-22v116.3l25-5.3.1-28.2c3.6 2.6 9 6.3 17.8 6.3 18 0 34.4-14.5 34.4-46.4-.1-29.2-16.7-44.3-34.4-44.3zm-6 68.1c-5.9 0-9.4-2.1-11.8-4.7l-.1-37.1c2.6-2.9 6.2-4.9 11.9-4.9 9.1 0 15.4 10.2 15.4 23.3 0 13.4-6.2 23.4-15.4 23.4zM223.8 61l25.1-5.4V36l-25.1 5.3zM223.8 69.5h25.1v87.5h-25.1zM196.9 76.7l-1.6-7.2h-21.6v87.5h25V97.5c5.9-7.7 15.9-6.3 19-5.2V69.5c-3.2-1.2-14.9-3.4-20.8 7.2zM146.9 47.6l-24.4 5.2-.1 80.1c0 14.8 11.1 25.7 25.9 25.7 8.2 0 14.2-1.5 17.5-3.3V135c-3.2 1.3-19 5.9-19-8.9V90.6H166V69.5h-19.1V47.6zM79.3 94.7c0-3.9 3.2-5.4 8.5-5.4 7.6 0 17.2 2.3 24.8 6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5 67.6 52 76.3 52 95.8c0 30.5 42 25.6 42 38.7 0 4.6-4 6.1-9.6 6.1-8.3 0-18.9-3.4-27.3-8v23.8c9.3 4 18.7 5.7 27.3 5.7 20.8 0 35.1-10.3 35.1-30 .1-32.9-42.2-27.1-42.2-37.4z" fill="#635BFF"/>
            </svg>
          </span>
        }
        status={isFullyConnected ? 'connected' : 'pending'}
        locale={locale}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ADMIN_T.muted, fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {isEn ? 'Checking status…' : 'Проверяваме статуса…'}
          </div>
        ) : isFullyConnected ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                {isEn ? 'Stripe is connected and ready to accept payments' : 'Stripe е свързан — можеш да приемаш плащания'}
              </span>
            </div>
            <StatusRow label={isEn ? 'Charges' : 'Плащания'} enabled={status?.chargesEnabled} locale={locale} />
            <StatusRow label={isEn ? 'Payouts' : 'Изплащания'} enabled={status?.payoutsEnabled} locale={locale} />
            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                onClick={() => void loadStatus()}
                disabled={loading}
                style={{ ...btn('sm-ghost'), display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} />
                {isEn ? 'Refresh status' : 'Обнови статуса'}
              </button>
            </div>
          </div>
        ) : status?.connected && !status.chargesEnabled ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{isEn ? 'Onboarding is not complete' : 'Онбордингът не е завършен'}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
              {isEn ? 'Your Stripe account was created, but you need to complete the details to activate payments.' : 'Stripe акаунтът е създаден, но трябва да попълниш информацията за да активираш плащанията.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void startOnboarding()} disabled={connecting}
                style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {connecting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isEn ? 'Loading…' : 'Зареждаме…'}</> : <><ExternalLink size={14} /> {isEn ? 'Continue setup' : 'Продължи регистрацията'}</>}
              </button>
              <button type="button" onClick={() => void loadStatus()}
                style={{ ...btn('sm-ghost'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} /> {isEn ? 'Refresh status' : 'Обнови статуса'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
              <BulletRow>{isEn ? 'Connect your Stripe account to accept online payments directly into your own account.' : 'Свържи своя Stripe акаунт, за да приемаш онлайн плащания директно в своята сметка'}</BulletRow>
              <BulletRow>{isEn ? 'The money goes directly to you.' : 'Парите отиват директно при теб — без комисиона'}</BulletRow>
              <BulletRow>{isEn ? 'Secure and managed by Stripe.' : 'Сигурно — управлявано от Stripe'}</BulletRow>
            </ul>
            <button type="button" onClick={() => void startOnboarding()} disabled={connecting}
              style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'start' }}>
              {connecting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isEn ? 'Loading…' : 'Зареждаме…'}</> : <><ExternalLink size={14} /> {isEn ? 'Connect Stripe account' : 'Свържи Stripe акаунт'}</>}
            </button>
          </div>
        )}
        {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
      </AdminInfoCard>
    </AdminSection>
  );
}

function BulletRow({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: '#000', flexShrink: 0 }} />
      <span>{children}</span>
    </li>
  );
}

function StatusRow({ label, enabled, locale }: { label: string; enabled?: boolean; locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ADMIN_T.muted }}>
      {enabled
        ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
        : <XCircle size={14} style={{ color: '#f59e0b' }} />}
      {label}: <span style={{ fontWeight: 600, color: enabled ? '#16a34a' : '#92400e' }}>{enabled ? (isEn ? 'Active' : 'Активно') : (isEn ? 'Inactive' : 'Неактивно')}</span>
    </div>
  );
}
