'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const slug = params.get('slug') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontWeight: 700, fontSize: 16 }}>Невалиден линк.</p>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14, marginTop: 8 }}>
          Поискайте нов от страницата за вход.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Паролите не съвпадат.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slug, password, confirmPassword: confirm, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка');
      setDone(true);
      setTimeout(() => { window.location.href = '/admin'; }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(0,0,0,0.12)',
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'var(--font-client-manrope, system-ui, sans-serif)',
    background: '#fff',
    color: '#111',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.08)',
  };

  const gradientBtn: React.CSSProperties = {
    width: '100%',
    padding: '11px 16px',
    borderRadius: 999,
    border: 'none',
    background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 16,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.75 : 1,
    letterSpacing: '-0.01em',
    transition: 'opacity 0.15s',
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <p style={{ fontWeight: 800, fontSize: 20, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Акаунтът е създаден!
        </p>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
          Влизаш в панела…
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Logo / brand */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          clicka.bg
        </span>
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        Създай акаунт
      </h1>
      <p style={{ margin: '0 0 28px', color: 'rgba(0,0,0,0.45)', fontSize: 14, lineHeight: 1.6 }}>
        Въведи имейл и парола за достъп до твоя панел.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
            Имейл
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="ime@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
            Парола
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Поне 8 символа"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
            Потвърди паролата
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Повтори паролата"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '11px 14px',
            color: '#dc2626',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={gradientBtn}>
          {loading ? 'Създаване…' : 'Създай акаунт →'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(0,0,0,0.35)', lineHeight: 1.6, textAlign: 'center' }}>
        Вече имаш акаунт?{' '}
        <a href="/admin/sign-in" style={{ color: '#db2777', fontWeight: 600, textDecoration: 'none' }}>
          Влез
        </a>
      </p>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 36px',
      fontFamily: 'var(--font-client-manrope, system-ui, -apple-system, sans-serif)',
      background: '#fff',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Suspense fallback={<p style={{ textAlign: 'center', color: 'rgba(0,0,0,0.4)' }}>Зареждане…</p>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
