'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField } from '@/components/admin/admin-ui';

type AccountInfo = {
  displayName?: string | null;
  loginEmail: string;
  hasPassword: boolean;
  pendingEmail?: string | null;
};

type SubTab = 'profile' | 'email' | 'password';

const compactInp = (inp: CSSProperties): CSSProperties => ({
  ...inp,
  minHeight: 36,
  padding: '8px 10px',
  fontSize: 14,
});

export function AccountTabPanel({
  slug,
  inp,
  initialAccount,
  onDisplayNameChange,
}: {
  slug: string;
  inp: CSSProperties;
  initialAccount: AccountInfo;
  onDisplayNameChange?: (name: string | null) => void;
}) {
  const [info, setInfo] = useState<AccountInfo>(initialAccount);
  const [subTab, setSubTab] = useState<SubTab>('profile');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({
    displayName: initialAccount.displayName ?? '',
  });
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState<'profile' | 'email' | 'password' | 'reset' | null>(null);

  const fieldInp = compactInp(inp);

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setBusy('profile');
    try {
      const res = await fetch(`/api/admin/account?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile',
          displayName: profileForm.displayName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; displayName?: string };
      if (!res.ok) throw new Error(data.error || 'Грешка при запазване на името');
      const nextDisplayName = data.displayName ?? profileForm.displayName.trim();
      setInfo((p) => ({ ...p, displayName: nextDisplayName }));
      setProfileForm({ displayName: nextDisplayName });
      onDisplayNameChange?.(nextDisplayName || null);
      setNotice(data.message ?? 'Името е обновено.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setBusy('email');
    try {
      const res = await fetch(`/api/admin/account?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'email',
          currentEmail: info.loginEmail,
          newEmail: emailForm.newEmail,
          currentPassword: emailForm.currentPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; loginEmail?: string; pendingEmail?: string };
      if (!res.ok) throw new Error(data.error || 'Грешка при смяна на имейла');
      if (data.pendingEmail) {
        setInfo((p) => ({ ...p, pendingEmail: data.pendingEmail }));
      } else {
        const nextEmail = data.loginEmail ?? emailForm.newEmail.trim();
        setInfo((p) => ({ ...p, loginEmail: nextEmail, pendingEmail: null }));
      }
      setEmailForm({ newEmail: '', currentPassword: '' });
      setNotice(data.message ?? 'Имейлът е сменен.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setBusy('password');
    try {
      const res = await fetch(`/api/admin/account?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'password',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || 'Грешка при смяна на паролата');
      setInfo((p) => ({ ...p, hasPassword: true }));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(data.message ?? 'Паролата е сменена.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  async function sendResetLink() {
    setNotice('');
    setError('');
    setBusy('reset');
    try {
      const res = await fetch('/api/admin/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: info.loginEmail, slug }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Грешка');
      setNotice(`Линк изпратен на ${info.loginEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {info.pendingEmail ? (
        <p style={{ margin: 0, fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>
          ⏳ Очаква потвърждение: <strong>{info.pendingEmail}</strong><br />
          Проверете новия имейл и натиснете линка за потвърждение. Текущият имейл остава активен.
        </p>
      ) : null}
      {notice ? (
        <p style={{ margin: 0, fontSize: 13, color: '#065F46', background: '#ECFDF5', padding: '8px 10px', borderRadius: 8 }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: 0, fontSize: 13, color: '#991B1B', background: '#FEF2F2', padding: '8px 10px', borderRadius: 8 }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 6 }}>
        {(['profile', 'email', 'password'] as const).map((tab) => {
          const active = subTab === tab;
          const label = tab === 'profile' ? 'Име' : tab === 'email' ? 'Имейл' : 'Парола';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSubTab(tab)}
              style={{
                flex: 1,
                borderRadius: 8,
                border: active ? '1.5px solid #18181B' : `1px solid ${ADMIN_T.border}`,
                background: '#fff',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: '#18181B',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {subTab === 'profile' ? (
        <form onSubmit={(e) => void submitProfile(e)} style={{ display: 'grid', gap: 8 }}>
          <AdminField label="Име" compact>
            <input
              type="text"
              autoComplete="name"
              value={profileForm.displayName}
              onChange={(e) => setProfileForm({ displayName: e.target.value })}
              style={fieldInp}
              placeholder="Вашето име"
              minLength={2}
              maxLength={80}
              required
            />
          </AdminField>
          <button
            type="submit"
            disabled={busy === 'profile'}
            style={{
              ...ADMIN_COMPACT_SAVE_BTN,
              justifySelf: 'start',
              opacity: busy === 'profile' ? 0.7 : 1,
              cursor: busy === 'profile' ? 'wait' : 'pointer',
            }}
          >
            {busy === 'profile' ? 'Запазване…' : 'Запази името'}
          </button>
        </form>
      ) : subTab === 'email' ? (
        <form onSubmit={(e) => void submitEmail(e)} style={{ display: 'grid', gap: 8 }}>
          <AdminField label="Текущ имейл" compact>
            <input
              type="email"
              value={info.loginEmail}
              readOnly
              style={{ ...fieldInp, color: ADMIN_T.muted, cursor: 'default', background: '#FAFAFA' }}
            />
          </AdminField>
          <AdminField label="Нов имейл" compact>
            <input
              type="email"
              autoComplete="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
              style={fieldInp}
              placeholder="nov@example.com"
              required
            />
          </AdminField>
          <AdminField label="Парола за потвърждение" compact>
            <input
              type="password"
              autoComplete="current-password"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
              style={fieldInp}
              required
            />
          </AdminField>
          <button
            type="submit"
            disabled={busy === 'email'}
            style={{
              ...ADMIN_COMPACT_SAVE_BTN,
              justifySelf: 'start',
              opacity: busy === 'email' ? 0.7 : 1,
              cursor: busy === 'email' ? 'wait' : 'pointer',
            }}
          >
            {busy === 'email' ? 'Запазване…' : 'Запази имейла'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void submitPassword(e)} style={{ display: 'grid', gap: 8 }}>
          {!info.hasPassword ? (
            <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
              Няма зададена парола.{' '}
              <button
                type="button"
                onClick={() => void sendResetLink()}
                disabled={busy === 'reset'}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  color: ADMIN_T.accent,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 12,
                }}
              >
                Изпрати линк
              </button>
            </p>
          ) : null}
          {info.hasPassword ? (
            <AdminField label="Текуща парола" compact>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                style={fieldInp}
                required
              />
            </AdminField>
          ) : null}
          <AdminField label="Нова парола" compact>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              style={fieldInp}
              minLength={8}
              required
            />
          </AdminField>
          <AdminField label="Потвърди парола" compact>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              style={fieldInp}
              minLength={8}
              required
            />
          </AdminField>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={busy === 'password'}
              style={{
                ...ADMIN_COMPACT_SAVE_BTN,
                opacity: busy === 'password' ? 0.7 : 1,
                cursor: busy === 'password' ? 'wait' : 'pointer',
              }}
            >
              {busy === 'password' ? 'Запазване…' : 'Запази паролата'}
            </button>
            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={busy === 'reset'}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontSize: 12,
                color: ADMIN_T.muted,
                textDecoration: 'underline',
                cursor: busy === 'reset' ? 'wait' : 'pointer',
              }}
            >
              {busy === 'reset' ? 'Изпращаме…' : 'Забравена парола?'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
