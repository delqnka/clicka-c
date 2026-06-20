'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function blockCyrillic(e: React.KeyboardEvent<HTMLInputElement>) {
  if (/[Ѐ-ӿ]/.test(e.key)) e.preventDefault();
}

function stripCyrillic(value: string) {
  return value.replace(/[Ѐ-ӿ]/g, '');
}

const CONFETTI_COLORS = ['#e11d48', '#db2777', '#a855f7', '#f59e0b', '#22c55e', '#3b82f6'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * 360 + (i % 2 === 0 ? 8 : -8);
    const distance = 70 + (i % 5) * 18;
    const dx = Math.cos((angle * Math.PI) / 180) * distance;
    const dy = Math.sin((angle * Math.PI) / 180) * distance;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const delay = (i % 6) * 0.03;
    const duration = 0.9 + (i % 4) * 0.15;
    const isCircle = i % 3 === 0;
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: isCircle ? 8 : 6,
          height: isCircle ? 8 : 12,
          marginTop: -6,
          marginLeft: -3,
          background: color,
          borderRadius: isCircle ? '50%' : 2,
          opacity: 0,
          transform: 'translate(0, 0) rotate(0deg) scale(0.6)',
          animation: `clicka-confetti-piece ${duration}s cubic-bezier(.21,.84,.49,1) ${delay}s forwards`,
          ...({ '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${(i % 2 === 0 ? 1 : -1) * (220 + i * 11)}deg` } as React.CSSProperties),
        }}
      />
    );
  });

  return (
    <div style={{ position: 'relative', width: 1, height: 1, margin: '0 auto' }} aria-hidden="true">
      <style>{`
        @keyframes clicka-confetti-piece {
          0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(0.6); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) + 60px)) rotate(var(--rot)) scale(0.9); }
        }
        @keyframes clicka-badge-pop {
          0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.08) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
      {pieces}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const slug = params.get('slug') ?? '';
  const isReset = params.get('mode') === 'reset';

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        body: JSON.stringify({
          token,
          slug,
          password,
          confirmPassword: confirm,
          email: email.trim(),
          displayName: displayName.trim(),
        }),
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
      <div style={{ textAlign: 'center', padding: '32px 0', position: 'relative' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          {!isReset && <ConfettiBurst />}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
              boxShadow: '0 8px 24px rgba(219,39,119,0.35)',
              animation: 'clicka-badge-pop 0.55s cubic-bezier(.21,1.02,.49,1) both',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
        <p style={{ fontWeight: 800, fontSize: 20, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {isReset ? 'Паролата е сменена!' : 'Акаунтът е създаден!'}
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
          admin
        </span>
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {isReset ? 'Нова парола' : 'Задай парола'}
      </h1>
      <p style={{ margin: '0 0 28px', color: 'rgba(0,0,0,0.45)', fontSize: 14, lineHeight: 1.6 }}>
        {isReset ? 'Въведи нова парола за твоя панел.' : 'Въведи името си и избери парола за достъп до панела.'}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!isReset && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
                Име
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Вашето име"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
                Имейл
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(stripCyrillic(e.target.value))}
                onKeyDown={blockCyrillic}
                required
                autoComplete="email"
                placeholder="ime@example.com"
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
            Парола
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(stripCyrillic(e.target.value))}
              onKeyDown={blockCyrillic}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Поне 8 символа"
              style={{ ...inputStyle, paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Скрий' : 'Покажи'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', padding: 2, display: 'flex', alignItems: 'center' }}>
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#111' }}>
            Потвърди паролата
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(stripCyrillic(e.target.value))}
              onKeyDown={blockCyrillic}
              required
              autoComplete="new-password"
              placeholder="Повтори паролата"
              style={{ ...inputStyle, paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Скрий' : 'Покажи'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', padding: 2, display: 'flex', alignItems: 'center' }}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
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
          {loading ? (isReset ? 'Запазване…' : 'Създаване…') : (isReset ? 'Смени паролата →' : 'Създай акаунт →')}
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
