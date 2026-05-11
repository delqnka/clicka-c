import Link from 'next/link';
import Image from 'next/image';

export default function SuccessPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#fff', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 24px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <Link href="/">
          <Image src="/logo.png" alt="Clicka.bg" width={120} height={40} style={{ height: 34, width: 'auto' }} />
        </Link>
      </nav>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', textAlign: 'center',
      }}>
        {/* Animated checkmark */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: '#000', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 32,
          animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: 'drawCheck 0.4s ease 0.3s forwards', opacity: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700,
          margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1,
        }}>
          Сайтът ти се подготвя!
        </h1>

        <p style={{
          fontSize: 18, color: 'rgba(0,0,0,0.5)', maxWidth: 480,
          lineHeight: 1.6, margin: '0 0 40px',
        }}>
          Ще получиш имейл до 15 минути с линк към твоя нов сайт.
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.03)', borderRadius: 16,
          padding: '20px 28px', marginBottom: 40, maxWidth: 420,
        }}>
          {[
            '✓  Резервационната система е активна',
            '✓  Имейл напомняния са включени',
            '✓  Сайтът ти е достъпен 24/7',
          ].map(line => (
            <p key={line} style={{ fontSize: 15, margin: '8px 0', color: 'rgba(0,0,0,0.65)', textAlign: 'left' }}>
              {line}
            </p>
          ))}
        </div>

        <Link href="/" style={{
          display: 'inline-block', padding: '14px 32px',
          background: '#000', color: '#fff', borderRadius: 12,
          textDecoration: 'none', fontSize: 15, fontWeight: 600,
        }}>
          Към началната страница
        </Link>
      </div>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0%   { opacity: 0; stroke-dasharray: 30; stroke-dashoffset: 30; }
          100% { opacity: 1; stroke-dasharray: 30; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
