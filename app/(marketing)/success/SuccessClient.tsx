'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ClickaLogo } from '@/components/brand/clicka-logo';

export default function SuccessClient({
  slug,
  email,
}: {
  slug: string;
  email: string;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [redirectTo, setRedirectTo] = useState('');
  const sentRef = useRef(false);

  useEffect(() => {
    if (!slug || !email || sentRef.current) return;
    sentRef.current = true;
    sendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, email]);

  async function sendOtp() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/claim-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не успяхме да изпратим код.');
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/claim-confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешен код.');
      setConfirmed(true);
      setRedirectTo(data.redirectTo || '/admin');
      setTimeout(() => {
        window.location.href = data.redirectTo || '/admin';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : '';

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes popIn    { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes drawCheck{ 0%{opacity:0;stroke-dasharray:30;stroke-dashoffset:30} 100%{opacity:1;stroke-dasharray:30;stroke-dashoffset:0} }
        @keyframes fadeUp   { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes float1   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,15px)} }
        @keyframes float2   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-22px)} }
        @keyframes spin     { to { transform:rotate(360deg); } }
        .orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .check-circle { animation:popIn .5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .check-svg    { animation:drawCheck .4s ease .3s forwards; opacity:0; }
        .fade-1 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .1s forwards; opacity:0; }
        .fade-2 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .22s forwards; opacity:0; }
        .fade-3 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .34s forwards; opacity:0; }
        .fade-4 { animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .46s forwards; opacity:0; }
        .sc-spinner {
          width:18px; height:18px; border-radius:50%;
          border:2.5px solid rgba(255,255,255,.3);
          border-top-color:#fff;
          animation:spin .75s linear infinite; display:inline-block;
        }
      `}</style>

      <div className="orb" style={{ width: 600, height: 600, background: 'rgba(124,58,237,.1)', top: '-200px', left: '-150px', animation: 'float1 12s ease-in-out infinite' }} />
      <div className="orb" style={{ width: 400, height: 400, background: 'rgba(212,168,83,.07)', bottom: '-100px', right: '-100px', animation: 'float2 10s ease-in-out infinite' }} />

      <nav style={{ position: 'relative', zIndex: 10, height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,.06)', background: 'rgba(250,250,248,.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <ClickaLogo size="compact" />
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* Check icon */}
        <div className="check-circle" style={{ width: 88, height: 88, borderRadius: '50%', background: confirmed ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#7C3AED,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: confirmed ? '0 16px 48px rgba(34,197,94,.38)' : '0 16px 48px rgba(124,58,237,.38)', transition: 'background .5s, box-shadow .5s' }}>
          <svg className="check-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {confirmed ? (
          <>
            <h1 className="fade-1" style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1, color: '#0D0D12' }}>
              Добре дошъл в панела!
            </h1>
            <p className="fade-2" style={{ fontSize: 18, color: '#667085', maxWidth: 480, lineHeight: 1.65, margin: '0 0 40px' }}>
              Пренасочваме те към dashboard-а...
            </p>
            {redirectTo && (
              <a href={redirectTo} className="fade-3" style={{ display: 'inline-block', padding: '14px 32px', background: 'linear-gradient(135deg,#22C55E,#16A34A)', color: '#fff', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 28px rgba(34,197,94,.38)' }}>
                Отвори панела →
              </a>
            )}
          </>
        ) : (
          <>
            <h1 className="fade-1" style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1, color: '#0D0D12' }}>
              Плащането мина успешно!
            </h1>
            <p className="fade-2" style={{ fontSize: 18, color: '#667085', maxWidth: 480, lineHeight: 1.65, margin: '0 0 40px' }}>
              {otpSent
                ? <>Изпратихме 6-цифрен код на <strong>{maskedEmail}</strong>. Въведи го, за да влезеш в панела.</>
                : loading
                  ? 'Изпращаме код за достъп...'
                  : 'Подготвяме достъпа до панела...'}
            </p>

            {/* OTP form */}
            <div className="fade-3" style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,.1)', borderRadius: 24, padding: '28px 32px', marginBottom: 32, maxWidth: 400, width: '100%', boxShadow: '0 18px 40px rgba(0,0,0,.08)' }}>
              {notice && (
                <div style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', padding: '10px 14px', background: '#F9FAFB', color: '#374151', fontSize: 14, marginBottom: 16 }}>
                  {notice}
                </div>
              )}

              {error && (
                <div style={{ borderRadius: 12, border: '1px solid #FECACA', padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', fontSize: 14, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={confirmOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 700, color: '#0D0D12', textAlign: 'left' }}>
                    6-цифрен код
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '16px 15px',
                      borderRadius: 16,
                      border: '1.5px solid rgba(0,0,0,.12)',
                      fontSize: 32,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      color: '#0D0D12',
                      background: '#FAFAF8',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  style={{
                    border: 'none',
                    borderRadius: 100,
                    background: 'linear-gradient(135deg,#7C3AED,#6D28D9)',
                    color: '#fff',
                    padding: '16px 16px',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: loading || code.length < 4 ? 'not-allowed' : 'pointer',
                    opacity: loading || code.length < 4 ? 0.6 : 1,
                    boxShadow: '0 8px 28px rgba(124,58,237,.38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity .2s, transform .2s',
                  }}
                >
                  {loading ? <><span className="sc-spinner" /> Потвърждаваме...</> : 'Влез в панела →'}
                </button>
              </form>

              {otpSent && (
                <button
                  type="button"
                  onClick={() => { sentRef.current = false; sendOtp(); }}
                  disabled={loading}
                  style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#7C3AED', padding: 0, fontFamily: 'inherit' }}
                >
                  Изпрати нов код
                </button>
              )}
            </div>

            {/* Feature checklist */}
            <div className="fade-4" style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.12)', borderRadius: 20, padding: '24px 32px', marginBottom: 32, maxWidth: 420, width: '100%' }}>
              {[
                '✓  Резервационната система е активна',
                '✓  Имейл напомняния са включени',
                '✓  Сайтът ти е достъпен 24/7',
              ].map(line => (
                <p key={line} style={{ fontSize: 15, margin: '8px 0', color: '#4B5563', textAlign: 'left', fontWeight: 500 }}>{line}</p>
              ))}
            </div>
          </>
        )}

        <div className="fade-4" style={{ marginTop: 8 }}>
          <Link href="/" style={{ color: '#667085', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            ← Към началната страница
          </Link>
        </div>
      </div>
    </div>
  );
}
