'use client';

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ADMIN_COMPACT_SAVE_BTN, ADMIN_T } from '@/components/admin/admin-theme';
import { AdminField } from '@/components/admin/admin-ui';
import { type Locale } from '@/lib/i18n';

type AccountInfo = {
  displayName?: string | null;
  loginEmail: string;
  hasPassword: boolean;
  pendingEmail?: string | null;
};

type BusinessInfo = {
  companyName: string;
  eik: string;
  managerName: string;
  address: string;
  contactEmail: string;
};

type SubTab = 'profile' | 'business' | 'email' | 'password';

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
  locale,
}: {
  slug: string;
  inp: CSSProperties;
  initialAccount: AccountInfo;
  onDisplayNameChange?: (name: string | null) => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [info, setInfo] = useState<AccountInfo>(initialAccount);
  const [subTab, setSubTab] = useState<SubTab>('profile');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [businessLoaded, setBusinessLoaded] = useState(false);

  const [profileForm, setProfileForm] = useState({
    displayName: initialAccount.displayName ?? '',
  });
  const [businessForm, setBusinessForm] = useState<BusinessInfo>({
    companyName: '',
    eik: '',
    managerName: '',
    address: '',
    contactEmail: '',
  });
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState<'profile' | 'business' | 'email' | 'password' | 'reset' | null>(null);

  const fieldInp = compactInp(inp);

  useEffect(() => {
    if (subTab !== 'business' || businessLoaded) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/legal?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as { legalInfo?: Partial<BusinessInfo> };
        if (!res.ok || cancelled) return;
        const legal = data.legalInfo ?? {};
        setBusinessForm({
          companyName: typeof legal.companyName === 'string' ? legal.companyName : '',
          eik: typeof legal.eik === 'string' ? legal.eik : '',
          managerName: typeof legal.managerName === 'string' ? legal.managerName : '',
          address: typeof legal.address === 'string' ? legal.address : '',
          contactEmail: typeof legal.contactEmail === 'string' ? legal.contactEmail : '',
        });
        setBusinessLoaded(true);
      } catch {
        // Ignore and allow manual input
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [businessLoaded, slug, subTab]);

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setBusy('business');
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
      if (!res.ok) throw new Error(data.error || (isEn ? 'Error while saving the name' : 'Грешка при запазване на името'));
      const nextDisplayName = data.displayName ?? profileForm.displayName.trim();
      setInfo((p) => ({ ...p, displayName: nextDisplayName }));
      setProfileForm({ displayName: nextDisplayName });
      onDisplayNameChange?.(nextDisplayName || null);
      setNotice(data.message ?? (isEn ? 'Name updated.' : 'Името е обновено.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Error' : 'Грешка'));
    } finally {
      setBusy(null);
    }
  }

  async function submitBusiness(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setBusy('profile');
    try {
      const res = await fetch(`/api/admin/legal?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          companyName: businessForm.companyName,
          eik: businessForm.eik,
          managerName: businessForm.managerName,
          address: businessForm.address,
          contactEmail: businessForm.contactEmail,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || (isEn ? 'Error while saving business details' : 'Грешка при запазване на фирмените данни'));
      setBusinessLoaded(true);
      setNotice(isEn ? 'Business details updated.' : 'Фирмените данни са обновени.');
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Error' : 'Грешка'));
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
      if (!res.ok) throw new Error(data.error || (isEn ? 'Error while changing the email' : 'Грешка при смяна на имейла'));
      if (data.pendingEmail) {
        setInfo((p) => ({ ...p, pendingEmail: data.pendingEmail }));
      } else {
        const nextEmail = data.loginEmail ?? emailForm.newEmail.trim();
        setInfo((p) => ({ ...p, loginEmail: nextEmail, pendingEmail: null }));
      }
      setEmailForm({ newEmail: '', currentPassword: '' });
      setNotice(data.message ?? (isEn ? 'Email updated.' : 'Имейлът е сменен.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Error' : 'Грешка'));
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
      if (!res.ok) throw new Error(data.error || (isEn ? 'Error while changing the password' : 'Грешка при смяна на паролата'));
      setInfo((p) => ({ ...p, hasPassword: true }));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(data.message ?? (isEn ? 'Password updated.' : 'Паролата е сменена.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Error' : 'Грешка'));
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
      if (!res.ok) throw new Error(data.error || (isEn ? 'Error' : 'Грешка'));
      setNotice(isEn ? `Link sent to ${info.loginEmail}.` : `Линк изпратен на ${info.loginEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEn ? 'Error' : 'Грешка'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {info.pendingEmail ? (
        <p style={{ margin: 0, fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>
          {isEn ? '⏳ Pending confirmation:' : '⏳ Очаква потвърждение:'} <strong>{info.pendingEmail}</strong><br />
          {isEn
            ? 'Check the new email and use the confirmation link. The current email stays active.'
            : 'Проверете новия имейл и натиснете линка за потвърждение. Текущият имейл остава активен.'}
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
        {(['profile', 'business', 'email', 'password'] as const).map((tab) => {
          const active = subTab === tab;
          const label =
            tab === 'profile'
              ? (isEn ? 'Name' : 'Име')
              : tab === 'business'
                ? (isEn ? 'Business' : 'Фирма')
                : tab === 'email'
                  ? (isEn ? 'Email' : 'Имейл')
                  : (isEn ? 'Password' : 'Парола');
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
          <AdminField label={isEn ? 'Name' : 'Име'} compact>
            <input
              type="text"
              autoComplete="name"
              value={profileForm.displayName}
              onChange={(e) => setProfileForm({ displayName: e.target.value })}
              style={fieldInp}
              placeholder={isEn ? 'Your name' : 'Вашето име'}
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
            {busy === 'profile' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save name' : 'Запази името')}
          </button>
        </form>
      ) : subTab === 'business' ? (
        <form onSubmit={(e) => void submitBusiness(e)} style={{ display: 'grid', gap: 8 }}>
          <AdminField label={isEn ? 'Official company name' : 'Официално име на фирмата'} compact>
            <input
              type="text"
              value={businessForm.companyName}
              onChange={(e) => setBusinessForm((p) => ({ ...p, companyName: e.target.value }))}
              style={fieldInp}
              placeholder={isEn ? 'Example Ltd.' : 'Пример ООД'}
              required
            />
          </AdminField>
          <AdminField label={isEn ? 'Company ID / VAT' : 'ЕИК / ДДС'} compact>
            <input
              type="text"
              value={businessForm.eik}
              onChange={(e) => setBusinessForm((p) => ({ ...p, eik: e.target.value }))}
              style={fieldInp}
              placeholder={isEn ? '123456789' : '123456789'}
            />
          </AdminField>
          <AdminField label={isEn ? 'Manager / responsible person' : 'Управител / отговорно лице'} compact>
            <input
              type="text"
              value={businessForm.managerName}
              onChange={(e) => setBusinessForm((p) => ({ ...p, managerName: e.target.value }))}
              style={fieldInp}
              placeholder={isEn ? 'Jane Smith' : 'Деляна Иванова'}
            />
          </AdminField>
          <AdminField label={isEn ? 'Registered address' : 'Адрес на фирмата'} compact>
            <input
              type="text"
              value={businessForm.address}
              onChange={(e) => setBusinessForm((p) => ({ ...p, address: e.target.value }))}
              style={fieldInp}
              placeholder={isEn ? '1 Main St, Sofia' : 'гр. София, ул. Пример 1'}
            />
          </AdminField>
          <AdminField label={isEn ? 'Legal contact email' : 'Имейл за правни документи'} compact>
            <input
              type="email"
              value={businessForm.contactEmail}
              onChange={(e) => setBusinessForm((p) => ({ ...p, contactEmail: e.target.value }))}
              style={fieldInp}
              placeholder="info@example.com"
            />
          </AdminField>
          <button
            type="submit"
            disabled={busy === 'business'}
            style={{
              ...ADMIN_COMPACT_SAVE_BTN,
              justifySelf: 'start',
              opacity: busy === 'business' ? 0.7 : 1,
              cursor: busy === 'business' ? 'wait' : 'pointer',
            }}
          >
            {busy === 'business' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save business details' : 'Запази фирмените данни')}
          </button>
        </form>
      ) : subTab === 'email' ? (
        <form onSubmit={(e) => void submitEmail(e)} style={{ display: 'grid', gap: 8 }}>
          <AdminField label={isEn ? 'Current email' : 'Текущ имейл'} compact>
            <input
              type="email"
              value={info.loginEmail}
              readOnly
              style={{ ...fieldInp, color: ADMIN_T.muted, cursor: 'default', background: '#FAFAFA' }}
            />
          </AdminField>
          <AdminField label={isEn ? 'New email' : 'Нов имейл'} compact>
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
          <AdminField label={isEn ? 'Password for confirmation' : 'Парола за потвърждение'} compact>
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
            {busy === 'email' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save email' : 'Запази имейла')}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void submitPassword(e)} style={{ display: 'grid', gap: 8 }}>
          {!info.hasPassword ? (
            <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
              {isEn ? 'No password is set.' : 'Няма зададена парола.'}{' '}
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
                {isEn ? 'Send link' : 'Изпрати линк'}
              </button>
            </p>
          ) : null}
          {info.hasPassword ? (
          <AdminField label={isEn ? 'Current password' : 'Текуща парола'} compact>
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
          <AdminField label={isEn ? 'New password' : 'Нова парола'} compact>
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
          <AdminField label={isEn ? 'Confirm password' : 'Потвърди парола'} compact>
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
              {busy === 'password' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save password' : 'Запази паролата')}
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
              {busy === 'reset' ? (isEn ? 'Sending…' : 'Изпращаме…') : (isEn ? 'Forgot password?' : 'Забравена парола?')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
