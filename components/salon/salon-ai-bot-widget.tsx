'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; isBookingConfirm?: boolean };

type BookingPayload = {
  staffName: string;
  serviceName: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
};

type Props = {
  salonId: string;
  salonName: string;
  primaryColor?: string;
};

const BOOK_RE = /<<BOOK:(\{[\s\S]*?\})>>/;

export function SalonAiBotWidget({ salonId, salonName, primaryColor = '#5B21B6' }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const GRAD = `linear-gradient(135deg, ${primaryColor}, #a855f7)`;
  const PINK_GRAD = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function handleBooking(payload: BookingPayload, history: Message[]) {
    try {
      const res = await fetch('/api/salon-ai-chat/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, ...payload }),
      });
      if (res.ok) {
        const dateObj = new Date(payload.date + 'T12:00:00');
        const dateLabel = dateObj.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
        const confirmMsg = `✅ Записан си при ${payload.staffName} на ${dateLabel} в ${payload.time} за ${payload.serviceName}. Ще те очакваме!`;
        setMessages([...history, { role: 'assistant', content: confirmMsg, isBookingConfirm: true }]);
      } else if (res.status === 409) {
        setMessages([...history, { role: 'assistant', content: `За съжаление ${payload.time} при ${payload.staffName} е вече зает. Кой друг час ти подхожда?` }]);
      } else {
        setMessages([...history, { role: 'assistant', content: 'Не успях да направя резервацията. Моля, опитай пак или натисни "Запази час".' }]);
      }
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Нещо се обърка при записването. Опитай пак.' }]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/salon-ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, messages: next }),
      });
      const data = await res.json() as { message?: string };
      const raw = data.message ?? 'Нещо се обърка.';

      const bookMatch = BOOK_RE.exec(raw);
      if (bookMatch) {
        try {
          const payload = JSON.parse(bookMatch[1]!) as BookingPayload;
          // Show "booking in progress" immediately
          const interim = [...next, { role: 'assistant' as const, content: `Записвам те при ${payload.staffName}...` }];
          setMessages(interim);
          setLoading(false);
          await handleBooking(payload, next);
          return;
        } catch { /* fall through to show raw */ }
      }

      setMessages([...next, { role: 'assistant', content: raw }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Нещо се обърка. Опитай пак.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-[calc(64px+max(6px,env(safe-area-inset-bottom,0px)))] right-4 lg:bottom-5 lg:right-5 z-[9998] flex flex-col items-end gap-3">
      {open && (
        <div style={{
          width: 'min(320px, calc(100vw - 32px))', height: 430, borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ background: GRAD, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{salonName}</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 2, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 20 }}>
                <MessageCircle size={36} style={{ color: primaryColor, opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                  Здравей! Питай ме за услуги, цени или работно време.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.isBookingConfirm ? (
                  <div style={{
                    maxWidth: '92%', padding: '10px 14px', borderRadius: 16,
                    fontSize: 13, lineHeight: 1.55,
                    background: '#ecfdf5', color: '#065f46',
                    border: '1.5px solid #6ee7b7',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                    <span>{m.content}</span>
                  </div>
                ) : (
                <div style={{
                  maxWidth: '82%', padding: '9px 13px', borderRadius: 16,
                  fontSize: 13, lineHeight: 1.55,
                  background: m.role === 'user' ? GRAD : '#f3f4f6',
                  color: m.role === 'user' ? '#fff' : '#111',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
                }}>
                  {m.content}
                </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px' }}>
                  <Loader2 size={14} style={{ color: primaryColor, animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Напиши въпрос..."
              style={{
                flex: 1, padding: '9px 13px', borderRadius: 12,
                border: '1.5px solid #e5e7eb', fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                padding: '9px 13px', borderRadius: 12, border: 'none',
                background: GRAD, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !loading ? 1 : 0.4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <Send size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          backgroundImage: PINK_GRAD, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(225,29,72,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>
    </div>
  );
}
