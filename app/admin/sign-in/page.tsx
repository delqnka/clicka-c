'use client';

import { useState } from 'react';

export default function AdminSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка при вход');
      window.location.href = '/admin';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка');
      setForgotSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.14)',
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 999,
    border: 'none',
    background: '#000',
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {!showForgot ? (
          <>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>Вход</h1>
            <p style={{ margin: '0 0 24px', color: 'rgba(0,0,0,0.45)', fontSize: 14, lineHeight: 1.5 }}>
              Въведете имейл и парола за достъп до панела.
            </p>

            <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Имейл</label>
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Парола</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '11px 14px', color: '#dc2626', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Влизане…' : 'Влез'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setShowForgot(true); setError(''); }}
              style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(0,0,0,0.45)', fontSize: 14, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Забравена парола?
            </button>
          </>
        ) : forgotSent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>Провери пощата си</p>
            <p style={{ color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, fontSize: 14 }}>
              Изпратихме линк за задаване на нова парола.
            </p>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotSent(false); }}
              style={{ marginTop: 20, background: 'none', border: 'none', color: '#000', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Назад към вход
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, textDecoration: 'underline' }}
            >
              ← Назад
            </button>

            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>Забравена парола</h1>
            <p style={{ margin: '0 0 24px', color: 'rgba(0,0,0,0.45)', fontSize: 14, lineHeight: 1.5 }}>
              Въведете имейла на акаунта. Ще изпратим линк за задаване на нова парола.
            </p>

            <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Имейл</label>
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

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '11px 14px', color: '#dc2626', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Изпращане…' : 'Изпрати линк'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
