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
// Shown in upgrade modal — only the difference
const UPGRADE_PRICES: Record<Period, number> = { '12m': 200, '6m': 110 };

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
            prices={UPGRADE_PRICES}
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
              <svg width="44" height="18" viewBox="0 0 468 222" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe" style={{ display: 'block', flexShrink: 0 }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M414 113.4c0-25.4-12.3-45.5-35.9-45.5-23.7 0-38 20.1-38 45.3 0 29.9 16.9 45 41.1 45 11.8 0 20.7-2.7 27.5-6.4V131c-6.8 3.4-14.6 5.5-24.5 5.5-9.7 0-18.3-3.4-19.4-15.2h48.9c0-1.3.3-6.5.3-7.9zm-49.4-9.4c0-11.3 6.9-16 13.2-16 6.1 0 12.6 4.7 12.6 16h-25.8zM301.1 67.9c-9.8 0-16.1 4.6-19.6 7.8l-1.3-6.2h-22v116.3l25-5.3.1-28.2c3.6 2.6 9 6.3 17.8 6.3 18 0 34.4-14.5 34.4-46.4-.1-29.2-16.7-44.3-34.4-44.3zm-6 68.1c-5.9 0-9.4-2.1-11.8-4.7l-.1-37.1c2.6-2.9 6.2-4.9 11.9-4.9 9.1 0 15.4 10.2 15.4 23.3 0 13.4-6.2 23.4-15.4 23.4zM223.8 61l25.1-5.4V36l-25.1 5.3zM223.8 69.5h25.1v87.5h-25.1zM196.9 76.7l-1.6-7.2h-21.6v87.5h25V97.5c5.9-7.7 15.9-6.3 19-5.2V69.5c-3.2-1.2-14.9-3.4-20.8 7.2zM146.9 47.6l-24.4 5.2-.1 80.1c0 14.8 11.1 25.7 25.9 25.7 8.2 0 14.2-1.5 17.5-3.3V135c-3.2 1.3-19 5.9-19-8.9V90.6H166V69.5h-19.1V47.6zM79.3 94.7c0-3.9 3.2-5.4 8.5-5.4 7.6 0 17.2 2.3 24.8 6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5 67.6 52 76.3 52 95.8c0 30.5 42 25.6 42 38.7 0 4.6-4 6.1-9.6 6.1-8.3 0-18.9-3.4-27.3-8v23.8c9.3 4 18.7 5.7 27.3 5.7 20.8 0 35.1-10.3 35.1-30 .1-32.9-42.2-27.1-42.2-37.4z" fill="#635BFF"/>
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
              backgroundOrigin: selectedPeriod === p ? 'border-box' : 'padding-box',
              backgroundClip: selectedPeriod === p ? 'padding-box, border-box' : 'border-box',
              backgroundColor: selectedPeriod === p ? 'transparent' : '#fafafa',
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
