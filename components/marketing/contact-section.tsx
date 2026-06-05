'use client';

import { useState } from 'react';
import { MessageCircle, Mail, Send, ChevronDown } from 'lucide-react';

export function ContactSection() {
  const [formOpen, setFormOpen] = useState(false);
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

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #fdf2f8 0%, #f5f3ff 100%)',
        padding: 'clamp(64px,10vw,112px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* label */}
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12, textAlign: 'center' }}>
          Контакт
        </p>

        {/* heading */}
        <h2 style={{
          fontSize: 'clamp(28px,5vw,44px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 8,
          textAlign: 'center',
          backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Имаш въпрос?
        </h2>
        <p style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 1.6 }}>
          Отговаряме до 24 часа.
        </p>

        {/* glass card */}
        <div style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,255,255,0.9)',
          borderRadius: 24,
          padding: 'clamp(24px,4vw,40px)',
          boxShadow: '0 8px 40px rgba(219,39,119,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        }}>

          {/* primary CTA — chat */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('clicka:open-chat'))}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '16px 24px',
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg,#e11d48,#a855f7)',
              boxShadow: '0 4px 20px rgba(225,29,72,0.28)',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >
            <MessageCircle size={20} />
            Пиши ни в чата
          </button>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>или</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* email */}
          <a
            href="mailto:support@clicka.bg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px 24px',
              borderRadius: 14,
              border: '1.5px solid rgba(168,85,247,0.25)',
              background: 'rgba(168,85,247,0.06)',
              fontSize: 15,
              fontWeight: 600,
              color: '#7c3aed',
              textDecoration: 'none',
              transition: 'background 0.15s',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(168,85,247,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(168,85,247,0.06)'; }}
          >
            <Mail size={17} />
            support@clicka.bg
          </a>

          {/* toggle form */}
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              color: '#999',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#999'; }}
          >
            <span>Изпрати запитване</span>
            <ChevronDown
              size={16}
              style={{ transition: 'transform 0.25s', transform: formOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* collapsible form */}
          <div style={{
            overflow: 'hidden',
            maxHeight: formOpen ? 600 : 0,
            transition: 'max-height 0.35s ease',
          }}>
            <div style={{ paddingTop: 16 }}>
              {status === 'sent' ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
                  <p style={{ fontWeight: 700, fontSize: 17, color: '#111', marginBottom: 4 }}>Получихме съобщението ти!</p>
                  <p style={{ color: '#666', fontSize: 14 }}>Ще се свържем с теб до 24 часа.</p>
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input
                      required
                      placeholder="Твоето име"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{
                        padding: '13px 16px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontSize: 15,
                        outline: 'none',
                        background: 'rgba(255,255,255,0.8)',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        width: '100%',
                      }}
                    />
                    <input
                      required
                      type="email"
                      placeholder="Имейл адрес"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      style={{
                        padding: '13px 16px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontSize: 15,
                        outline: 'none',
                        background: 'rgba(255,255,255,0.8)',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        width: '100%',
                      }}
                    />
                  </div>
                  <textarea
                    required
                    rows={4}
                    placeholder="Как можем да помогнем?"
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{
                      padding: '13px 16px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontSize: 15,
                      outline: 'none',
                      background: 'rgba(255,255,255,0.8)',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: 100,
                      boxSizing: 'border-box',
                      width: '100%',
                    }}
                  />
                  {status === 'error' && (
                    <p style={{ color: '#e11d48', fontSize: 13 }}>Нещо се обърка. Опитай пак или пиши на support@clicka.bg</p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px 28px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      background: 'linear-gradient(135deg,#e11d48,#a855f7)',
                      opacity: status === 'loading' ? 0.7 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Send size={15} />
                    {status === 'loading' ? 'Изпращане...' : 'Изпрати'}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
