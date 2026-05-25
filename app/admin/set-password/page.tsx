'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const slug = params.get('slug') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError('Паролите не съвпадат');
      return;
    }
    if (password.length < 8) {
      setError('Паролата трябва да е поне 8 символа');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slug, password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка');
      window.location.href = '/admin';
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
  };

  return (
    <>
      <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>
        Задай парола
      </h1>
      <p style={{ margin: '0 0 24px', color: 'rgba(0,0,0,0.45)', fontSize: 14, lineHeight: 1.5 }}>
        Избери парола за достъп до твоя панел.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Нова парола
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
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
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
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '11px 14px', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
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
          }}
        >
          {loading ? 'Запазване…' : 'Запази паролата'}
        </button>
      </form>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Suspense fallback={<p style={{ textAlign: 'center', color: 'rgba(0,0,0,0.4)' }}>Зареждане…</p>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
