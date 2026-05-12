'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ClaimPageClient({
  slug,
  submitPayload,
  signInHref,
  siteHref,
}: {
  slug: string;
  submitPayload?: { slug?: string };
  signInHref: string;
  siteHref: string;
}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/claim-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...(submitPayload ?? {}), slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не успяхме да изпратим код.');
      setStep('code');
      if (typeof data.debugCode === 'string' && data.debugCode.length === 4) {
        setDebugCode(data.debugCode);
        setCode(data.debugCode);
        setNotice(`Тестов код за вход: ${data.debugCode}`);
      } else {
        setDebugCode('');
        setNotice('Изпратихме 4-цифрен код на този имейл.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/claim-confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, ...(submitPayload ?? {}), slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не успяхме да потвърдим кода.');
      window.location.href = data.redirectTo || signInHref;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 470,
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 26,
          padding: 28,
          boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000' }}>
          Claim Your Site
        </p>
        <h1 style={{ margin: '10px 0 0', fontSize: 30, lineHeight: 1.06, letterSpacing: '-0.04em', color: '#000' }}>
          Активирай dashboard-а за своя сайт
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.65, color: '#121212' }}>
          За <strong>{slug}</strong> изпращаме код само до имейла, с който е създаден сайтът. След потвърждение влизаш директно в админ панела.
        </p>

        {notice ? (
          <div
            style={{
              marginTop: 18,
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.10)',
              padding: '12px 14px',
              background: '#fff',
              color: '#000',
            }}
          >
            {notice}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 18,
              borderRadius: 16,
              border: '1px solid #ef4444',
              padding: '12px 14px',
              background: '#fff',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        ) : null}

        {step === 'email' ? (
          <form onSubmit={sendCode} style={{ marginTop: 22, display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 700, color: '#000' }}>
                Имейл
              </label>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="owner@example.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 15px',
                  borderRadius: 16,
                  border: '1px solid rgba(0,0,0,0.16)',
                  boxShadow: '0 10px 22px rgba(0,0,0,0.08)',
                  fontSize: 16,
                  color: '#000',
                  background: '#fff',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                border: '1px solid #000',
                borderRadius: 999,
                background: '#000',
                color: '#fff',
                padding: '14px 16px',
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
              }}
            >
              {loading ? 'Изпращане…' : 'Изпрати код'}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmCode} style={{ marginTop: 22, display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 700, color: '#000' }}>
                4-цифрен код
              </label>
              {debugCode ? (
                <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: '#000' }}>
                  Тестов код: <strong style={{ letterSpacing: '0.16em' }}>{debugCode}</strong>
                </p>
              ) : null}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D+/g, '').slice(0, 4))}
                placeholder="0000"
                required
                style={{
                  width: '100%',
                  padding: '14px 15px',
                  borderRadius: 16,
                  border: '1px solid rgba(0,0,0,0.16)',
                  boxShadow: '0 10px 22px rgba(0,0,0,0.08)',
                  fontSize: 28,
                  letterSpacing: '0.26em',
                  textAlign: 'center',
                  color: '#000',
                  background: '#fff',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                border: '1px solid #000',
                borderRadius: 999,
                background: '#000',
                color: '#fff',
                padding: '14px 16px',
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
              }}
            >
              {loading ? 'Потвърждаваме…' : 'Влез в dashboard-а'}
            </button>

            <button
              type="button"
              onClick={() => {
                setCode('');
                setDebugCode('');
                setError('');
                setNotice('');
                setStep('email');
              }}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 999,
                background: '#fff',
                color: '#000',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Смени имейла
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={signInHref} style={{ color: '#000', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Имаш акаунт и искаш magic link
          </Link>
          <Link href={siteHref} style={{ color: '#000', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Виж сайта
          </Link>
        </div>
      </div>
    </div>
  );
}
