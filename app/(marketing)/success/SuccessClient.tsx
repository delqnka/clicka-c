'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ClickaLogo } from '@/components/brand/clicka-logo';

const GRAD = 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)';
const GRAD_SHADOW = '0 8px 28px rgba(219,39,119,.32)';
const GRAD_GREEN = 'linear-gradient(135deg,#22C55E,#16A34A)';
const FONT = "var(--font-client-manrope,'Manrope',system-ui,sans-serif)";

export default function SuccessClient({
  slug,
  email,
  ownerName = '',
  purchaseValue = 0,
  provisionError = false,
  sessionRef = '',
}: {
  slug: string;
  email: string;
  ownerName?: string;
  purchaseValue?: number;
  provisionError?: boolean;
  sessionRef?: string;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [redirectTo, setRedirectTo] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!slug || typeof window === 'undefined') return;
    const PIXEL_ID = '2880139309045289';

    async function sha256hex(str: string): Promise<string> {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function trackPurchase() {
      const fbq = (window as any).fbq;
      if (!fbq) return;

      // Build advanced matching user data
      const userData: Record<string, string> = {};

      if (email) {
        try { userData.em = await sha256hex(email.toLowerCase().trim()); } catch { /* noop */ }
      }

      // Parse first/last name from ownerName
      if (ownerName) {
        const parts = ownerName.trim().split(/\s+/);
        try {
          if (parts[0]) userData.fn = await sha256hex(parts[0].toLowerCase());
          if (parts.length > 1) userData.ln = await sha256hex(parts[parts.length - 1].toLowerCase());
        } catch { /* noop */ }
      }

      // Country — all clients are in Bulgaria
      try { userData.country = await sha256hex('bg'); } catch { /* noop */ }

      // External ID — stable identifier
      if (slug) userData.external_id = slug;

      // Re-init pixel with full user data
      fbq('init', PIXEL_ID, userData);
      fbq('track', 'Purchase', { value: purchaseValue, currency: 'EUR' });
    }

    trackPurchase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setIsNewUser(!!data.isNewUser);
      if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'CompleteRegistration');
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
    <div className="sc-root" style={{ background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes popIn    { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes drawCheck{ 0%{opacity:0;stroke-dasharray:30;stroke-dashoffset:30} 100%{opacity:1;stroke-dasharray:30;stroke-dashoffset:0} }
        @keyframes fadeUp   { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to { transform:rotate(360deg); } }
        .check-circle { animation:popIn .5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .check-svg    { animation:drawCheck .4s ease .3s forwards; opacity:0; }
        .fade-1 { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .1s forwards; opacity:0; }
        .fade-2 { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .2s forwards; opacity:0; }
        .fade-3 { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .3s forwards; opacity:0; }
        .fade-4 { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) .4s forwards; opacity:0; }
        .sc-spinner {
          width:18px; height:18px; border-radius:50%; flex-shrink:0;
          border:2.5px solid rgba(255,255,255,.3);
          border-top-color:#fff;
          animation:spin .75s linear infinite; display:inline-block;
        }
        .otp-input::placeholder { letter-spacing:0.25em; color:rgba(0,0,0,0.2); }
        .sc-root {
          min-height: 100vh;
          min-height: 100dvh;
          min-height: -webkit-fill-available;
        }
      `}</style>

      <nav style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(0,0,0,.07)', background: '#fff' }}>
        <ClickaLogo size="compact" />
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 20px 40px', paddingTop: 'max(32px, 8vh)', textAlign: 'center', position: 'relative', zIndex: 1, boxSizing: 'border-box', width: '100%' }}>

        {/* Check circle */}
        <div className="check-circle" style={{ width: 80, height: 80, borderRadius: '50%', background: confirmed && !isNewUser ? GRAD_GREEN : GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: confirmed && !isNewUser ? '0 16px 40px rgba(34,197,94,.3)' : GRAD_SHADOW, transition: 'background .5s, box-shadow .5s' }}>
          <svg className="check-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {provisionError ? (
          <>
            <h1 className="fade-1" style={{ fontSize: 'clamp(24px,6vw,38px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0D0D12' }}>
              Плащането мина успешно!
            </h1>
            <p className="fade-2" style={{ fontSize: 15, color: '#667085', maxWidth: 360, lineHeight: 1.65, margin: '0 0 24px' }}>
              Възникна техническа грешка при настройването на твоя салон. Не се притеснявай — плащането е минало и ще оправим всичко ръчно. Пиши ни на <strong style={{ color: '#0D0D12' }}>support@clicka.bg</strong>{sessionRef ? <> с референция <strong style={{ color: '#0D0D12' }}>{sessionRef}</strong></> : null}.
            </p>
            <a href="mailto:support@clicka.bg" className="fade-3" style={{ display: 'inline-block', padding: '13px 28px', background: GRAD, color: '#fff', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: GRAD_SHADOW, fontFamily: FONT }}>
              Свържи се с поддръжка →
            </a>
          </>
        ) : confirmed ? (
          <>
            <h1 className="fade-1" style={{ fontSize: 'clamp(26px,6vw,40px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0D0D12' }}>
              {isNewUser ? 'Последна стъпка!' : 'Добре дошъл в панела!'}
            </h1>
            <p className="fade-2" style={{ fontSize: 16, color: '#667085', maxWidth: 340, lineHeight: 1.65, margin: '0 0 32px' }}>
              {isNewUser ? 'Пренасочваме те към регистрацията...' : 'Пренасочваме те към dashboard-а...'}
            </p>
            {redirectTo && (
              <a href={redirectTo} className="fade-3" style={{ display: 'inline-block', padding: '13px 28px', background: isNewUser ? GRAD : GRAD_GREEN, color: '#fff', borderRadius: 100, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: isNewUser ? GRAD_SHADOW : '0 8px 28px rgba(34,197,94,.35)', fontFamily: FONT }}>
                {isNewUser ? 'Създай акаунт →' : 'Отвори панела →'}
              </a>
            )}
          </>
        ) : (
          <>
            <h1 className="fade-1" style={{ fontSize: 'clamp(24px,6vw,38px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0D0D12' }}>
              Плащането мина успешно!
            </h1>
            <p className="fade-2" style={{ fontSize: 15, color: '#667085', maxWidth: 320, lineHeight: 1.65, margin: '0 0 28px' }}>
              {otpSent
                ? <><span>Изпратихме 6-цифрен код на </span><strong style={{ color: '#0D0D12' }}>{maskedEmail}</strong><span>. Въведи го, за да влезеш в панела.</span></>
                : loading
                  ? 'Изпращаме код за достъп...'
                  : 'Подготвяме достъпа до панела...'}
            </p>

            {/* OTP form */}
            <div className="fade-3" style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,.09)', borderRadius: 20, padding: '24px 20px', marginBottom: 20, maxWidth: 360, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.07)', boxSizing: 'border-box' }}>
              {notice && (
                <div style={{ borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', padding: '9px 13px', color: '#374151', fontSize: 13, marginBottom: 14 }}>
                  {notice}
                </div>
              )}
              {error && (
                <div style={{ borderRadius: 10, border: '1px solid #FECACA', padding: '9px 13px', background: '#FEF2F2', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <form onSubmit={confirmOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'left' }}>
                    6-цифрен код от имейла
                  </label>
                  <input
                    className="otp-input"
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
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,.12)',
                      fontSize: 28,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      color: '#0D0D12',
                      background: '#fff',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                      fontFamily: FONT,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  style={{
                    border: 'none',
                    borderRadius: 100,
                    background: GRAD,
                    color: '#fff',
                    padding: '13px 16px',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: loading || code.length < 4 ? 'not-allowed' : 'pointer',
                    opacity: loading || code.length < 4 ? 0.65 : 1,
                    boxShadow: GRAD_SHADOW,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity .2s',
                    fontFamily: FONT,
                    width: '100%',
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
                  style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#db2777', padding: 0, fontFamily: FONT }}
                >
                  Изпрати нов код
                </button>
              )}
            </div>

          </>
        )}

      </div>
    </div>
  );
}
