'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

type Message = { role: 'client' | 'salon'; content: string; createdAt: string };

type Props = {
  salonId: string;
  salonName: string;
  primaryColor?: string;
  onOpenBooking?: () => void;
};

export function SalonChatWidget({ salonId, salonName, primaryColor = '#e11d48', onOpenBooking }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const poll = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/salon-chat/${sid}?after=${encodeURIComponent(lastAtRef.current)}`);
      const data = await res.json() as { messages: { id: string; role: string; content: string; created_at: string }[] };
      if (data.messages.length > 0) {
        const newMsgs: Message[] = data.messages
          .filter((m) => m.role === 'salon' && !seenIdsRef.current.has(m.id))
          .map((m) => {
            seenIdsRef.current.add(m.id);
            return { role: 'salon' as const, content: m.content, createdAt: String(m.created_at) };
          });
        if (newMsgs.length > 0) {
          lastAtRef.current = newMsgs[newMsgs.length - 1]!.createdAt;
          setMessages((prev) => [...prev, ...newMsgs]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!sessionId || !open) return;
    pollRef.current = setInterval(() => poll(sessionId), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, open, poll]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;

    setSending(true);
    const optimistic: Message = { role: 'client', content: msg, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      const res = await fetch('/api/salon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, sessionId, clientName, message: msg }),
      });
      const data = await res.json() as { sessionId?: string };
      const sid = data.sessionId ?? sessionId;
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      // Immediately poll for auto-reply instead of waiting for next interval
      if (sid) setTimeout(() => poll(sid), 300);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  const GRAD = `linear-gradient(135deg, ${primaryColor}, #a855f7)`;

  const PINK_GRAD = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

  return (
    <div className="fixed bottom-[calc(64px+max(6px,env(safe-area-inset-bottom,0px)))] right-4 lg:bottom-5 lg:right-5 z-[9999] flex flex-col items-end gap-3">
      {open && (
        <div style={{
          width: 'min(320px, calc(100vw - 32px))', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          height: 420,
        }}>
          {/* Header */}
          <div style={{ background: GRAD, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{salonName}</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Name input */}
          {!nameEntered ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
              <MessageCircle size={40} style={{ color: primaryColor, opacity: 0.7 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111', textAlign: 'center' }}>Как да те наречем?</p>
              <input
                autoFocus
                placeholder="Твоето име"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && clientName.trim() && setNameEntered(true)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => clientName.trim() && setNameEntered(true)}
                disabled={!clientName.trim()}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
                  background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: clientName.trim() ? 'pointer' : 'not-allowed',
                  opacity: clientName.trim() ? 1 : 0.5, fontFamily: 'inherit',
                }}
              >
                Започни чата
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginTop: 16 }}>
                    Здравей, {clientName}! Напиши съобщението си и ще ти отговорим скоро.
                  </p>
                )}
                {messages.map((m, i) => {
                  // Detect booking auto-reply: salon message containing #rezerviraj URL
                  const bookingMatch = m.role === 'salon' && m.content.match(/https?:\/\/\S+#rezerviraj/);
                  if (bookingMatch) {
                    const bookingUrl = bookingMatch[0];
                    const textBefore = m.content.slice(0, m.content.indexOf(bookingUrl)).trim();
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                          maxWidth: '85%', padding: '10px 14px', borderRadius: 14,
                          fontSize: 13, lineHeight: 1.5,
                          background: '#f3f4f6', color: '#111',
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                          {textBefore && <span>{textBefore}</span>}
                          <a
                            href={bookingUrl}
                            onClick={(e) => {
                              e.preventDefault();
                              if (onOpenBooking) {
                                onOpenBooking();
                              } else {
                                window.history.replaceState(null, '', window.location.pathname);
                                window.location.hash = 'rezerviraj';
                              }
                            }}
                            style={{
                              display: 'block', padding: '10px 16px', borderRadius: 12,
                              background: GRAD, color: '#fff', fontWeight: 700,
                              fontSize: 13, textAlign: 'center', textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            📅 Виж свободни часове
                          </a>
                        </div>
                      </div>
                    );
                  }
                  return (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'client' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '8px 12px', borderRadius: 14,
                      fontSize: 13, lineHeight: 1.5,
                      background: m.role === 'client' ? GRAD : '#f3f4f6',
                      color: m.role === 'client' ? '#fff' : '#111',
                    }}>
                      {m.content.split(/\n/).map((line, j) => (
                        <span key={j}>{line}{j < m.content.split(/\n/).length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                  );
                })}
                {sending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Loader2 size={14} style={{ color: primaryColor, animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Напиши съобщение..."
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', fontSize: 13,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  style={{
                    padding: '8px 12px', borderRadius: 12, border: 'none',
                    background: GRAD, cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.4,
                  }}
                >
                  <Send size={14} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          backgroundImage: PINK_GRAD, cursor: 'pointer', boxShadow: '0 4px 20px rgba(225,29,72,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>
    </div>
  );
}
