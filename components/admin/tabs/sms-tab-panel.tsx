'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminInfoCard, AdminSection } from '@/components/admin/admin-ui';
import type { AdminSitePayload } from '@/lib/admin-site';
import {
  SMS_PACK_CREDITS,
  SMS_PACK_PRICE_EUR,
  SMS_PACK_PURCHASE_ENABLED,
  SMS_PACK_PURCHASE_DISABLED_MESSAGE,
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
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <AdminSection title="SMS напомняния" desc="Изпращай автоматични SMS напомняния преди резервации.">
      <div style={{ display: 'grid', gap: 10 }}>
        <AdminInfoCard title="SMS напомняния" status={site.smsEnabled && site.smsBalance > 0 ? 'connected' : 'pending'}>
          <div style={{ display: 'grid', gap: 18 }}>

            {/* Purchase disabled banner */}
            {!SMS_PACK_PURCHASE_ENABLED && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔵</span>
                <p style={{ margin: 0, fontSize: 12, color: '#007AFF', lineHeight: 1.4 }}>
                  Онлайн покупката на SMS пакети е временно недостъпна — очаквай скоро.
                </p>
              </div>
            )}

            {/* Balance */}
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: ADMIN_T.muted }}>
                {smsPanelLoading ? 'Зареждаме…' : 'Налични SMS'}
              </p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: ADMIN_T.text }}>
                {site.smsBalance}
              </p>
            </div>

            {/* Mode selector */}
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: ADMIN_T.text }}>Кога да изпращаме</p>
              {(
                [
                  { id: 'off' as const,         label: 'Изключено' },
                  { id: '1h' as const,           label: '1 час преди' },
                  { id: '24h_and_1h' as const,   label: '24 часа + 1 час преди' },
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
                      setSmsDraftEnabled(opt.id !== 'off');
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Dynamic hint */}
            {smsDraftMode !== 'off' && (
              <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted }}>
                {smsDraftMode === '1h'
                  ? '1 напомняне използва 1 SMS.'
                  : '24ч + 1ч използва 2 SMS на резервация.'}
              </p>
            )}

            {/* Save */}
            <div>
              <button
                type="button"
                onClick={() => void saveSmsSettings()}
                style={btn('primary')}
                disabled={busyKey === 'sms-settings'}
              >
                {busyKey === 'sms-settings' ? 'Запазваме…' : 'Запази'}
              </button>
            </div>

            {/* Expandable secondary info */}
            <div>
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 12,
                  color: ADMIN_T.muted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>ℹ️</span>
                <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                  {infoOpen ? 'Скрий детайли' : 'Как работят SMS напомнянията?'}
                </span>
              </button>

              {infoOpen && (
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 12, color: ADMIN_T.muted, lineHeight: 1.6 }}>
                    Пакет: <strong>{SMS_PACK_CREDITS} SMS за {SMS_PACK_PRICE_EUR} €</strong>.
                    При 0 баланс изпращането спира автоматично.
                    {smsPendingReminders > 0 && ` Планирани напомняния: ${smsPendingReminders}.`}
                  </p>

                  {/* Purchase button */}
                  {SMS_PACK_PURCHASE_ENABLED && (
                    <button
                      type="button"
                      onClick={() => void buySmsPack()}
                      style={btn('ghost')}
                      disabled={busyKey === 'sms-checkout'}
                    >
                      {busyKey === 'sms-checkout' ? 'Пренасочваме…' : `Купи ${SMS_PACK_CREDITS} SMS (${SMS_PACK_PRICE_EUR} €)`}
                    </button>
                  )}

                  {/* Transaction history */}
                  {smsTransactions.length > 0 && (
                    <div>
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
                  )}
                </div>
              )}
            </div>

          </div>
        </AdminInfoCard>
      </div>
    </AdminSection>
  );
}
