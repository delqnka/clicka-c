'use client';

import type { CSSProperties } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';
import {
  SMS_PACK_CREDITS,
  SMS_PACK_PRICE_EUR,
  SMS_PACK_PURCHASE_DISABLED_MESSAGE,
  SMS_PACK_PURCHASE_ENABLED,
  smsCreditsPerBooking,
  type SmsReminderMode,
} from '@/lib/sms-shared';

export function SmsTabPanel({
  site,
  smsDraftEnabled,
  setSmsDraftEnabled,
  smsDraftMode,
  setSmsDraftMode,
  smsPanelLoading,
  smsPendingReminders,
  smsTransactions,
  btn,
  busyKey,
  saveSmsSettings,
  buySmsPack,
}: {
  site: AdminSitePayload;
  smsDraftEnabled: boolean;
  setSmsDraftEnabled: (v: boolean) => void;
  smsDraftMode: SmsReminderMode;
  setSmsDraftMode: (m: SmsReminderMode) => void;
  smsPanelLoading: boolean;
  smsPendingReminders: number;
  smsTransactions: {
    id: string;
    kind: string;
    delta: number;
    balance_after: number | null;
    note: string | null;
    client_phone: string | null;
    created_at: string;
  }[];
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  busyKey: string;
  saveSmsSettings: () => void | Promise<void>;
  buySmsPack: () => void | Promise<void>;
}) {
  return (
    <AdminSection title="SMS" desc="Напомняния към клиенти преди резервация и покупка на пакети.">
      <div style={{ display: 'grid', gap: 10 }}>
        <AdminInfoCard title="SMS напомняния" status={site.smsEnabled && site.smsBalance > 0 ? 'connected' : 'pending'}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>{site.smsBalance}</span>
              <span style={{ fontSize: 14, color: ADMIN_T.muted }}>налични SMS</span>
              {smsPanelLoading ? <span style={{ fontSize: 12, color: ADMIN_T.subtle }}>Обновяваме…</span> : null}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.muted, lineHeight: 1.55 }}>
              Пакет: <strong>{SMS_PACK_CREDITS} SMS за {SMS_PACK_PRICE_EUR} €</strong>. При режим „24ч + 1ч" всяка резервация
              използва <strong>2 SMS</strong>. При „1 час" — <strong>1 SMS</strong>. При 0 баланс изпращането спира автоматично.
            </p>
            {smsPendingReminders > 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.subtle }}>Планирани напомняния: {smsPendingReminders}</p>
            ) : null}

            <div style={{ display: 'grid', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>Кога да изпращаме</p>
              {(
                [
                  { id: 'off' as const, label: 'Изключено' },
                  { id: '1h' as const, label: '1 час преди часа' },
                  { id: '24h_and_1h' as const, label: '24 часа + 1 час преди' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: ADMIN_T.text, cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="sms-mode"
                    checked={smsDraftMode === opt.id}
                    onChange={() => {
                      setSmsDraftMode(opt.id);
                      if (opt.id !== 'off') setSmsDraftEnabled(true);
                      if (opt.id === 'off') setSmsDraftEnabled(false);
                    }}
                  />
                  {opt.label}
                  {opt.id !== 'off' ? (
                    <span style={{ color: ADMIN_T.subtle }}>({smsCreditsPerBooking(opt.id)} SMS / резервация)</span>
                  ) : null}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => void saveSmsSettings()}
                style={btn('primary')}
                disabled={busyKey === 'sms-settings'}
              >
                {busyKey === 'sms-settings' ? 'Запазваме…' : 'Запази SMS настройки'}
              </button>
              {SMS_PACK_PURCHASE_ENABLED ? (
                <button type="button" onClick={() => void buySmsPack()} style={btn('ghost')} disabled={busyKey === 'sms-checkout'}>
                  {busyKey === 'sms-checkout' ? 'Пренасочваме…' : `Купи ${SMS_PACK_CREDITS} SMS (${SMS_PACK_PRICE_EUR} €)`}
                </button>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: `1px dashed ${ADMIN_T.border}`,
                    fontSize: 13,
                    fontWeight: 500,
                    color: ADMIN_T.muted,
                    lineHeight: 1.45,
                    maxWidth: 320,
                  }}
                >
                  {SMS_PACK_PURCHASE_DISABLED_MESSAGE}
                </span>
              )}
            </div>

            {smsTransactions.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: ADMIN_T.text }}>Последна активност</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                  {smsTransactions.slice(0, 8).map((tx) => (
                    <li
                      key={tx.id}
                      style={{ fontSize: 12, color: ADMIN_T.muted, borderTop: `1px solid ${ADMIN_T.border}`, paddingTop: 6 }}
                    >
                      <span style={{ color: tx.delta > 0 ? '#16a34a' : ADMIN_T.text, fontWeight: 600 }}>
                        {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                      </span>
                      {' · '}
                      {tx.note || tx.kind}
                      {tx.client_phone ? ` · ${tx.client_phone}` : ''}
                      {' · '}
                      {new Date(tx.created_at).toLocaleString('bg-BG')}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AdminInfoCard>
      </div>
    </AdminSection>
  );
}
