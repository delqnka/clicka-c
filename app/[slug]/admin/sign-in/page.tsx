'use client';

import { useState } from 'react';

export default function AdminSignInForSlugPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка');
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', background: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 420, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 18, padding: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Вход за админ</h1>
        <p style={{ margin: '10px 0 0', color: 'rgba(0,0,0,0.5)', lineHeight: 1.6 }}>
          Салон: <strong>{slug}</strong>. Въведете имейла на салона, за да получите линк за вход.
        </p>
        <p style={{ margin: '10px 0 0', color: '#000', lineHeight: 1.6, fontSize: 14 }}>
          Ако сайтът още не е claim-нат, първо отвори <a href={`/${slug}/claim`} style={{ color: '#000', fontWeight: 700 }}>claim page</a>.
        </p>

        {sent ? (
          <div style={{ marginTop: 18, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 14px', color: '#047857' }}>
            Линкът е изпратен. Проверете пощата си.
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Имейл</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="mimi@example.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.14)', fontSize: 16 }}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: '#000', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Изпращане…' : 'Изпрати линк за вход'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

