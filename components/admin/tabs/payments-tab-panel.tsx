'use client';

import { CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCw, XCircle, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';

const GRAD = 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)';

type StripeStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

type PlanInfoSite = {
  plan?: string | null;
  billingPeriod?: string | null;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  planPaidAmount?: number | null;
  planPaidCurrency?: string | null;
  pendingPlan?: string | null;
  pendingBillingPeriod?: string | null;
};

type Period = '6m' | '12m';

const TEAM_PRICES: Record<Period, number> = { '12m': 499, '6m': 279 };
const SOLO_PRICES: Record<Period, number> = { '12m': 299, '6m': 169 };

function formatMoney(eur: number) {
  return `€${eur.toFixed(0)}`;
}

export function PaymentsTabPanel({
  slug,
  btn,
  site,
  onPlanChanged,
}: {
  slug: string;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  site?: PlanInfoSite;
  onPlanChanged?: () => void;
}) {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // Plan action state
  const [planAction, setPlanAction] = useState<'idle' | 'renew' | 'upgrade' | 'downgrade' | 'cancel_downgrade'>('idle');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('12m');
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planNotice, setPlanNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan_renew') === 'success') setPlanNotice('Абонаментът е подновен успешно.');
    if (params.get('plan_upgrade') === 'success') setPlanNotice('Планът е ъпгрейднат към Team успешно.');
  }, []);

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

  async function submitPlanAction(endpoint: string, body: Record<string, unknown>) {
    setPlanBusy(true);
    setPlanError('');
    try {
      const res = await fetch(`${endpoint}?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string; success?: boolean };
      if (!res.ok) throw new Error(data.error ?? 'Грешка');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setPlanAction('idle');
      setPlanNotice(
        endpoint.includes('downgrade') && !body.cancel
          ? 'Насрочен преход към Solo при следващото подновяване.'
          : body.cancel
          ? 'Насроченият преход към Solo е отменен.'
          : 'Готово.',
      );
      onPlanChanged?.();
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setPlanBusy(false);
    }
  }

  useEffect(() => { void loadStatus(); }, [slug]);

  const isFullyConnected = status?.connected && status.chargesEnabled;
  const currentPlan = site?.plan ?? 'solo';
  const isTeam = currentPlan === 'team';
  const pendingDowngrade = site?.pendingPlan === 'solo';
  const billingPeriod = (site?.billingPeriod ?? '12m') as Period;

  const expiresAt = site?.planExpiresAt ? new Date(site.planExpiresAt) : null;
  const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;

  return (
    <AdminSection title="Плащания">
      <div style={{ display: 'grid', gap: 12 }}>

        {/* ── Notices ── */}
        {planNotice && (
          <div style={{ padding: '11px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#047857', fontWeight: 500 }}>
            {planNotice}
          </div>
        )}

        {/* ── Current plan card ── */}
        {expiresAt && !isNaN(expiresAt.getTime()) && (() => {
          const planLabel = isTeam ? 'TEAM' : 'SOLO';
          const periodLabel = billingPeriod === '6m' ? '6 месеца' : '12 месеца';
          const expiresLabel = expiresAt.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
          const startedAt = site?.planStartedAt ? new Date(site.planStartedAt) : null;
          const startedLabel = startedAt && !isNaN(startedAt.getTime())
            ? startedAt.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })
            : null;
          const priceLabel = site?.planPaidAmount != null
            ? `${(site.planPaidAmount / 100).toFixed(2)} ${site.planPaidCurrency ?? 'EUR'}`
            : null;

          return (
            <div style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: expired ? '1.5px solid #fca5a5' : '1.5px solid rgba(0,0,0,0.08)',
              background: expired ? '#fff5f5' : '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CreditCard size={15} style={{ color: expired ? '#ef4444' : '#007AFF', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: expired ? '#b91c1c' : '#111' }}>
                  План <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{planLabel}</span>
                  {' '}· {periodLabel}
                </span>
                {pendingDowngrade && (
                  <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                    → Solo при подновяване
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                {startedLabel ? <>Платен на <strong>{startedLabel}</strong>{priceLabel ? ` за ${priceLabel}` : ''} · </> : null}
                {expired
                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>Изтекъл на {expiresLabel}</span>
                  : <>Активен до <strong>{expiresLabel}</strong></>
                }
              </p>
            </div>
          );
        })()}

        {/* ── Plan actions ── */}
        {planAction === 'idle' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Renew */}
            <button
              type="button"
              onClick={() => setPlanAction('renew')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
            >
              <RotateCcw size={13} />
              {expired ? 'Активирай отново' : 'Поднови'}
            </button>

            {/* Upgrade (only for Solo) */}
            {!isTeam && (
              <button
                type="button"
                onClick={() => setPlanAction('upgrade')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: 'none', background: GRAD, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(219,39,119,0.22)' }}
              >
                <ArrowUpCircle size={13} />
                Ъпгрейд към Team
              </button>
            )}

            {/* Downgrade (only for Team without pending) */}
            {isTeam && !pendingDowngrade && (
              <button
                type="button"
                onClick={() => setPlanAction('downgrade')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#6b7280' }}
              >
                <ArrowDownCircle size={13} />
                Премини към Solo
              </button>
            )}

            {/* Cancel pending downgrade */}
            {isTeam && pendingDowngrade && (
              <button
                type="button"
                onClick={() => void submitPlanAction('/api/admin/plan-downgrade', { cancel: true })}
                disabled={planBusy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #fcd34d', background: '#fffbeb', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#92400e' }}
              >
                Отмени прехода към Solo
              </button>
            )}
          </div>
        ) : planAction === 'renew' ? (
          <PlanActionCard
            title="Поднови абонамента"
            desc={
              pendingDowngrade
                ? 'Имате насрочен преход към Solo. Подновяването ще активира Solo план.'
                : `Подновяване на ${isTeam ? 'Team' : 'Solo'} план. Времето се добавя към оставащото.`
            }
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            prices={isTeam && !pendingDowngrade ? TEAM_PRICES : SOLO_PRICES}
            busy={planBusy}
            error={planError}
            confirmLabel="Поднови →"
            onConfirm={() => void submitPlanAction('/api/admin/plan-renew', { billingPeriod: selectedPeriod })}
            onCancel={() => { setPlanAction('idle'); setPlanError(''); }}
          />
        ) : planAction === 'upgrade' ? (
          <PlanActionCard
            title="Ъпгрейд към Team"
            desc="Team планът включва до 3 специалисти, отделни профили и персонализирани услуги за всеки. Новият период започва от днес."
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            prices={TEAM_PRICES}
            busy={planBusy}
            error={planError}
            confirmLabel="Плати и ъпгрейдни →"
            gradientBtn
            onConfirm={() => void submitPlanAction('/api/admin/plan-upgrade', { billingPeriod: selectedPeriod })}
            onCancel={() => { setPlanAction('idle'); setPlanError(''); }}
          />
        ) : planAction === 'downgrade' ? (
          <div style={{ padding: '16px', borderRadius: 14, border: '1.5px solid #fcd34d', background: '#fffbeb' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#92400e' }}>Преход към Solo при следващо подновяване</p>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Team функциите остават активни до <strong>{expiresAt?.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' }) ?? 'изтичане'}</strong>.
              При следващото подновяване ще минете на Solo план.
              Специалистите не се изтриват автоматично — ще трябва да ги управлявате ръчно преди подновяването.
            </p>
            {planError && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#dc2626' }}>{planError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={planBusy}
                onClick={() => void submitPlanAction('/api/admin/plan-downgrade', {})}
                style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: planBusy ? 'not-allowed' : 'pointer', opacity: planBusy ? 0.6 : 1 }}
              >
                {planBusy ? 'Записваме…' : 'Потвърди преход към Solo'}
              </button>
              <button
                type="button"
                onClick={() => { setPlanAction('idle'); setPlanError(''); }}
                style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                Отказ
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Stripe Connect ── */}
        <AdminInfoCard
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Stripe Connect
              <svg width="48" height="20" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe" style={{ display: 'block', flexShrink: 0 }}>
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13zM28.24.4 32.37 0v3.36l-4.13.87zM23.62 6.79l.26 1.22c1-1.78 2.99-1.6 3.55-1.4v3.79c-.55-.18-2.36-.43-3.43.96v8.65h-4.12V5.57h3.55l.19 1.22zM15.3 1.91v3.66h2.87v3.39h-2.87v6.18c0 1.43.62 1.78 1.84 1.78.45 0 .94-.08 1.4-.21v3.46c-.78.4-2.06.66-3.36.66-2.84 0-4-1.5-4-3.91l.02-7.96-1.91-.4V5.57h1.9V2.65zM6.36 9.92c0 .73.6 1.07 2.27 1.6 2.46.78 5.6 1.81 5.6 5.5 0 3.05-2.42 5.07-6.4 5.07-1.6 0-3.34-.32-5.07-1.05v-4.42c1.55.85 3.5 1.48 5.07 1.48 1.06 0 1.83-.28 1.83-1.13 0-.84-.96-1.18-2.78-1.78C4.3 14.42.93 13.2.93 9.16.93 6.05 3.36 4 7.18 4c1.53 0 3.06.23 4.59.86V9.2c-1.4-.74-3.18-1.13-4.6-1.13-1 0-1.62.28-1.62.95l.01-.1z" fill="#635BFF"/>
              </svg>
            </span>
          }
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
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Онбордингът не е завършен</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                Stripe акаунтът е създаден, но трябва да попълниш информацията за да активираш плащанията.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => void startOnboarding()} disabled={connecting}
                  style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {connecting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Зареждаме…</> : <><ExternalLink size={14} /> Продължи регистрацията</>}
                </button>
                <button type="button" onClick={() => void loadStatus()}
                  style={{ ...btn('sm-ghost'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={13} /> Обнови статуса
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                <BulletRow>Свържи своя Stripe акаунт, за да приемаш онлайн плащания директно в своята сметка</BulletRow>
                <BulletRow>Парите отиват директно при теб — Clicka не взима комисиона</BulletRow>
                <BulletRow>Сигурно — управлявано от Stripe</BulletRow>
              </ul>
              <button type="button" onClick={() => void startOnboarding()} disabled={connecting}
                style={{ ...btn('primary'), display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'start' }}>
                {connecting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Зареждаме…</> : <><ExternalLink size={14} /> Свържи Stripe акаунт</>}
              </button>
            </div>
          )}
          {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
        </AdminInfoCard>
      </div>
    </AdminSection>
  );
}

function PlanActionCard({
  title, desc, selectedPeriod, setSelectedPeriod, prices, busy, error,
  confirmLabel, gradientBtn = false, onConfirm, onCancel,
}: {
  title: string;
  desc: string;
  selectedPeriod: Period;
  setSelectedPeriod: (p: Period) => void;
  prices: Record<Period, number>;
  busy: boolean;
  error: string;
  confirmLabel: string;
  gradientBtn?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ padding: '16px', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#111' }}>{title}</p>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['12m', '6m'] as Period[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setSelectedPeriod(p)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
              border: selectedPeriod === p ? '2px solid transparent' : '1.5px solid rgba(0,0,0,0.12)',
              backgroundImage: selectedPeriod === p ? `linear-gradient(#fff,#fff), ${GRAD}` : 'none',
              backgroundOrigin: selectedPeriod === p ? 'border-box' : undefined,
              backgroundClip: selectedPeriod === p ? 'padding-box, border-box' : undefined,
              background: selectedPeriod === p ? undefined : '#fafafa',
              boxShadow: selectedPeriod === p ? '0 4px 12px rgba(219,39,119,0.15)' : 'none',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>
              {p === '12m' ? '12 месеца' : '6 месеца'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
              {formatMoney(prices[p])} {p === '12m' ? '· Най-изгодно' : ''}
            </p>
          </button>
        ))}
      </div>

      {error && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#dc2626' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          style={{
            padding: '9px 18px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            background: gradientBtn ? GRAD : '#18181b', color: '#fff',
            boxShadow: gradientBtn ? '0 4px 14px rgba(219,39,119,0.25)' : 'none',
          }}
        >
          {busy ? 'Зареждаме…' : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          Отказ
        </button>
      </div>
    </div>
  );
}

function BulletRow({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
      <span>{children}</span>
    </li>
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
