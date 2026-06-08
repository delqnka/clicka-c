'use client';

export function AdminLoadError({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: '#fff',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#18181b' }}>
          Админ панелът не се зареди
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
          {message || 'Възникна грешка при зареждане на данните.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: 'none',
            borderRadius: 999,
            background: '#18181b',
            color: '#fff',
            padding: '12px 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Презареди
        </button>
      </div>
    </div>
  );
}
