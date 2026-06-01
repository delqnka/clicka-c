'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField, AdminSection } from '@/components/admin/admin-ui';

type AccountInfo = {
  loginEmail: string;
  hasPassword: boolean;
};

export function AccountTabPanel({
  slug,
  inp,
}: {
  slug: string;
  inp: CSSProperties;
}) {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState<'email' | 'password' | 'reset' | null>(null);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/account?slug=${encodeURIComponent(slug)}`);
      const data = (await res.json().catch(() => ({}))) as AccountInfo & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Неуспешно зареждане');
      setInfo({ loginEmail: data.loginEmail, hasPassword: data.hasPassword });
      setEmailForm((p) => ({ ...p, newEmail: '' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

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
          newEmail: emailForm.newEmail,
          currentPassword: emailForm.currentPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; loginEmail?: string };
      if (!res.ok) throw new Error(data.error || 'Грешка при смяна на имейла');
      if (data.loginEmail) setInfo((p) => (p ? { ...p, loginEmail: data.loginEmail! } : p));
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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(data.message ?? 'Паролата е сменена.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  async function sendResetLink() {
    if (!info?.loginEmail) return;
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
      setNotice(`Изпратихме линк за нова парола на ${info.loginEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusy(null);
    }
  }

  const saveBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    background: '#16A34A',
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  if (loading) {
    return <p style={{ margin: 0, fontSize: 14, color: ADMIN_T.muted }}>Зареждаме…</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {notice ? (
        <p style={{ margin: 0, fontSize: 14, color: '#065F46', background: '#ECFDF5', padding: '10px 12px', borderRadius: 10 }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: 0, fontSize: 14, color: '#991B1B', background: '#FEF2F2', padding: '10px 12px', borderRadius: 10 }}>
          {error}
        </p>
      ) : null}

      <AdminSection title="Вход в панела" desc="Това са данните за вход в админ панела — различни от имейла на салона в секция „Сайт“.">
        <AdminField label="Текущ имейл за вход">
          <input value={info?.loginEmail ?? ''} readOnly style={{ ...inp, color: ADMIN_T.muted, cursor: 'default' }} />
        </AdminField>
        {!info?.hasPassword ? (
          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
            Паролата още не е зададена.{' '}
            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={busy === 'reset'}
              style={{ border: 'none', background: 'none', padding: 0, color: ADMIN_T.accent, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Изпрати линк за задаване
            </button>
          </p>
        ) : null}
      </AdminSection>

      <AdminSection title="Смени имейла за вход">
        <form onSubmit={(e) => void submitEmail(e)} style={{ display: 'grid', gap: 12 }}>
          <AdminField label="Нов имейл">
            <input
              type="email"
              autoComplete="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
              style={inp}
              placeholder="nov@example.com"
              required
            />
          </AdminField>
          <AdminField label="Текуща парола">
            <input
              type="password"
              autoComplete="current-password"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
              style={inp}
              required
            />
          </AdminField>
          <div>
            <button
              type="submit"
              disabled={busy === 'email'}
              style={{ ...saveBtn, opacity: busy === 'email' ? 0.7 : 1, cursor: busy === 'email' ? 'wait' : 'pointer' }}
            >
              {busy === 'email' ? 'Запазваме…' : 'Запази имейла'}
            </button>
          </div>
        </form>
      </AdminSection>

      <AdminSection title="Смени паролата">
        <form onSubmit={(e) => void submitPassword(e)} style={{ display: 'grid', gap: 12 }}>
          <AdminField label="Текуща парола">
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              style={inp}
              required
            />
          </AdminField>
          <AdminField label="Нова парола">
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              style={inp}
              minLength={8}
              required
            />
          </AdminField>
          <AdminField label="Потвърди новата парола">
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              style={inp}
              minLength={8}
              required
            />
          </AdminField>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={busy === 'password'}
              style={{ ...saveBtn, opacity: busy === 'password' ? 0.7 : 1, cursor: busy === 'password' ? 'wait' : 'pointer' }}
            >
              {busy === 'password' ? 'Запазваме…' : 'Запази паролата'}
            </button>
            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={busy === 'reset' || !info?.loginEmail}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontSize: 13,
                color: ADMIN_T.muted,
                textDecoration: 'underline',
                cursor: busy === 'reset' ? 'wait' : 'pointer',
              }}
            >
              {busy === 'reset' ? 'Изпращаме…' : 'Забравена парола? Изпрати линк'}
            </button>
          </div>
        </form>
      </AdminSection>

      <p style={{ margin: 0, fontSize: 13, color: ADMIN_T.subtle, lineHeight: 1.5 }}>
        Имейлът в секция „Сайт“ е за контакт на публичната страница. За изход от панела използвай бутона „Изход“ в горния ред.
      </p>
    </div>
  );
}
