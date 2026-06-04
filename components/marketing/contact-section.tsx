'use client';

import { useState } from 'react';

export function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1.5px solid #f0e6f6',
    fontSize: 15,
    outline: 'none',
    background: '#fff',
    color: '#111',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <section
      id="contact"
      style={{
        background: '#fff',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
        borderTop: '1px solid #f3e8ff',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          Контакт
        </p>
        <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 12, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Имаш въпрос?
        </h2>
        <p style={{ fontSize: 16, color: '#555', marginBottom: 6, lineHeight: 1.6 }}>
          Пиши ни и ще ти помогнем.{' '}
          <a href="mailto:support@clicka.bg" style={{ color: '#db2777', fontWeight: 600, textDecoration: 'none' }}>
            support@clicka.bg
          </a>
        </p>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 36 }}>
          Обикновено отговаряме до 24 часа. Или разгледай{' '}
          <a href="#faq" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>
            често задаваните въпроси
          </a>{' '}
          по-горе.
        </p>

        {status === 'sent' ? (
          <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)', border: '1.5px solid #f0e6f6', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#111', marginBottom: 6 }}>Получихме съобщението ти!</p>
            <p style={{ color: '#666', fontSize: 15 }}>Ще се свържем с теб до 24 часа.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <input
                required
                placeholder="Твоето име"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
              <input
                required
                type="email"
                placeholder="Имейл адрес"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <textarea
              required
              rows={4}
              placeholder="С какво можем да помогнем?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
            />
            {status === 'error' && (
              <p style={{ color: '#e11d48', fontSize: 14 }}>Нещо се обърка. Опитай пак или пиши на support@clicka.bg</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                alignSelf: 'flex-start',
                padding: '12px 28px',
                borderRadius: 999,
                border: 'none',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg,#e11d48,#a855f7)',
                opacity: status === 'loading' ? 0.7 : 1,
                transition: 'opacity 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {status === 'loading' ? 'Изпращане...' : 'Изпрати съобщение'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
