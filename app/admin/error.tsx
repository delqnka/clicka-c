'use client';

import { useEffect, useState } from 'react';
import { ADMIN_LOCALE_COOKIE } from '@/lib/admin-locale-shared';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isEn, setIsEn] = useState(false);

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${ADMIN_LOCALE_COOKIE}=`));
    setIsEn(cookie?.split('=')[1] === 'en');
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: '#fafafa',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#18181b' }}>
          {isEn ? 'Something went wrong' : 'Нещо се обърка'}
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
          {error.message || (isEn ? 'Error while loading the admin panel.' : 'Грешка при зареждане на админ панела.')}
        </p>
        <button
          type="button"
          onClick={() => reset()}
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
          {isEn ? 'Try again' : 'Опитай отново'}
        </button>
      </div>
    </div>
  );
}
