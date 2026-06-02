'use client';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function BookingSuccessPage() {
  const params = useSearchParams();
  const returnUrl = params.get('return') ?? '/';

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: 'system-ui, sans-serif',
        background: '#fafafa',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '40px 32px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        }}
      >
        <CheckCircle2 size={52} style={{ color: '#16a34a', marginBottom: 16 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
          Плащането е успешно!
        </h1>
        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6, margin: '0 0 24px' }}>
          Резервацията ти е потвърдена. Ще получиш имейл с подробностите.
        </p>
        <button
          onClick={() => window.location.href = returnUrl}
          style={{
            padding: '12px 28px',
            borderRadius: 12,
            background: '#000',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Към сайта
        </button>
      </div>
    </div>
  );
}
