'use client';

import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';

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
}: {
  slug: string;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
}) {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stripe/connect/status?slug=${encodeURIComponent(slug)}`);
      const data = await res.json() as StripeStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Грешка');
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане на статуса');
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
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Грешка при свързване');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
      setConnecting(false);
    }
  }

  useEffect(() => { void loadStatus(); }, [slug]);

  const isFullyConnected = status?.connected && status.chargesEnabled;

  return (
    <AdminSection
      title="Плащания"
      desc="Свържи Stripe акаунт, за да приемаш онлайн плащания от клиенти."
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <AdminInfoCard
          title="Stripe Connect"
          status={isFullyConnected ? 'connected' : 'pending'}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ADMIN_T.muted, fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Проверяваме статуса…
            </div>
          ) : isFullyConnected ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                  Stripe е свързан — можеш да приемаш плащания
                </span>
              </div>
              <StatusRow label="Плащания" enabled={status?.chargesEnabled} />
              <StatusRow label="Изплащания" enabled={status?.payoutsEnabled} />
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => void loadStatus()}
                  disabled={loading}
                  style={{ ...btn('sm-ghost'), display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} />
                  Обнови статуса
                </button>
              </div>
            </div>
          ) : status?.connected && !status.chargesEnabled ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  Онбордингът не е завършен
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                Stripe акаунтът е създаден, но трябва да попълниш информацията за да активираш плащанията.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void startOnboarding()}
                  disabled={connecting}
                  style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {connecting
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Зареждаме…</>
                    : <><ExternalLink size={14} /> Продължи регистрацията</>}
                </button>
                <button
                  type="button"
                  onClick={() => void loadStatus()}
                  style={{ ...btn('sm-ghost'), display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} />
                  Обнови статуса
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                Свържи своя Stripe акаунт (или създай нов), за да можеш да приемаш онлайн плащания от клиенти директно в своята сметка.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.8 }}>
                <li>Парите отиват директно при теб</li>
                <li>Clicka не взима комисиона</li>
                <li>Сигурно — управлявано от Stripe</li>
              </ul>
              <button
                type="button"
                onClick={() => void startOnboarding()}
                disabled={connecting}
                style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'start' }}
              >
                {connecting
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Зареждаме…</>
                  : <><ExternalLink size={14} /> Свържи Stripe акаунт</>}
              </button>
            </div>
          )}

          {error && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>
          )}
        </AdminInfoCard>
      </div>
    </AdminSection>
  );
}

function StatusRow({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ADMIN_T.muted }}>
      {enabled
        ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
        : <XCircle size={14} style={{ color: '#f59e0b' }} />}
      {label}: <span style={{ fontWeight: 600, color: enabled ? '#16a34a' : '#92400e' }}>{enabled ? 'Активно' : 'Неактивно'}</span>
    </div>
  );
}
