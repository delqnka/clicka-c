'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, User } from 'lucide-react';

type AiMessage = { role: 'user' | 'assistant'; content: string; isBookingConfirm?: boolean };
type LiveMessage = { role: 'client' | 'salon'; content: string; createdAt: string };
type Mode = 'ai' | 'live';

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
  hasTelegram?: boolean;
  onOpenBooking?: () => void;
};

const BOOK_RE = /<<BOOK:(\{[\s\S]*?\})>>/;

export function SalonAiBotWidget({ salonId, salonName, primaryColor = '#5B21B6', hasTelegram = false, onOpenBooking }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('ai');

  // AI mode state
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Live mode state
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveSending, setLiveSending] = useState(false);
  const [clientName, setClientName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GRAD = `linear-gradient(135deg, ${primaryColor}, #a855f7)`;
  const PINK_GRAD = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, liveMessages, nameEntered]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (mode === 'live' && !nameEntered) {
          nameInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 150);
    }
  }, [open, mode, nameEntered]);

  // Live chat polling
  const pollLive = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/salon-chat/${sid}?after=${encodeURIComponent(lastAtRef.current)}`);
      const data = await res.json() as { messages: { id: string; role: string; content: string; created_at: string }[] };
      if (data.messages.length > 0) {
        const newMsgs: LiveMessage[] = data.messages
          .filter((m) => m.role === 'salon' && !seenIdsRef.current.has(m.id))
          .map((m) => {
            seenIdsRef.current.add(m.id);
            return { role: 'salon' as const, content: m.content, createdAt: String(m.created_at) };
          });
        if (newMsgs.length > 0) {
          lastAtRef.current = newMsgs[newMsgs.length - 1]!.createdAt;
          setLiveMessages((prev) => [...prev, ...newMsgs]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!sessionId || !open || mode !== 'live') return;
    pollRef.current = setInterval(() => pollLive(sessionId), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, open, mode, pollLive]);

  // AI booking
  async function handleBooking(payload: BookingPayload, history: AiMessage[]) {
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
        setAiMessages([...history, { role: 'assistant', content: confirmMsg, isBookingConfirm: true }]);
      } else if (res.status === 409) {
        setAiMessages([...history, { role: 'assistant', content: `За съжаление ${payload.time} при ${payload.staffName} е вече зает. Кой друг час ти подхожда?` }]);
      } else {
        setAiMessages([...history, { role: 'assistant', content: 'Не успях да направя резервацията. Моля, опитай пак или натисни "Запази час".' }]);
      }
    } catch {
      setAiMessages([...history, { role: 'assistant', content: 'Нещо се обърка при записването. Опитай пак.' }]);
    }
  }

  async function sendAi() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const next: AiMessage[] = [...aiMessages, { role: 'user', content: text }];
    setAiMessages(next);
    setAiInput('');
    setAiLoading(true);

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
          const interim = [...next, { role: 'assistant' as const, content: `Записвам те при ${payload.staffName}...` }];
          setAiMessages(interim);
          setAiLoading(false);
          await handleBooking(payload, next);
          return;
        } catch { /* fall through */ }
      }

      setAiMessages([...next, { role: 'assistant', content: raw }]);
    } catch {
      setAiMessages([...next, { role: 'assistant', content: 'Нещо се обърка. Опитай пак.' }]);
    } finally {
      setAiLoading(false);
    }
  }

  async function sendLive() {
    const msg = liveInput.trim();
    if (!msg || liveSending) return;
    setLiveSending(true);
    setLiveMessages((prev) => [...prev, { role: 'client', content: msg, createdAt: new Date().toISOString() }]);
    setLiveInput('');
    try {
      const res = await fetch('/api/salon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, sessionId, clientName, message: msg }),
      });
      const data = await res.json() as { sessionId?: string };
      const sid = data.sessionId ?? sessionId;
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      if (sid) setTimeout(() => pollLive(sid), 300);
    } catch { /* ignore */ }
    finally { setLiveSending(false); }
  }

  function switchToLive() {
    setMode('live');
    // Add a transition message in the AI chat history
    setAiMessages((prev) => [...prev, {
      role: 'assistant',
      content: '👤 Свързвам те с екипа на салона. Ще ти отговорят скоро.',
    }]);
  }

  const headerSubtitle = mode === 'ai' ? 'AI асистент • онлайн 24/7' : '🟢 Жив чат с екипа';

  return (
    <div className="fixed bottom-[76px] right-4 lg:bottom-5 lg:right-5 z-[9998] flex flex-col items-end gap-3">
      {open && (
        <div style={{
          width: 'min(340px, calc(100vw - 32px))',
          height: 460,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ background: GRAD, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', animation: 'pulse 2s infinite' }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{salonName}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{headerSubtitle}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 2, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* ── AI MODE ── */}
          {mode === 'ai' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMessages.length === 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 20 }}>
                    <MessageCircle size={36} style={{ color: primaryColor, opacity: 0.4, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                      Здравей! Питай ме за услуги, цени или работно време.
                    </p>
                  </div>
                )}
                {aiMessages.map((m, i) => (
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
                {aiLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: '#f3f4f6', borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px' }}>
                      <Loader2 size={14} style={{ color: primaryColor, animation: 'spin 1s linear infinite' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* "Talk to human" button — only if Telegram connected */}
              {hasTelegram && (
                <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
                  <button
                    onClick={switchToLive}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                      background: '#fff', cursor: 'pointer', fontSize: 12, color: '#555',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontFamily: 'inherit', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <User size={13} />
                    Говори с нас
                  </button>
                </div>
              )}

              <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAi()}
                  placeholder="Напиши въпрос..."
                  style={{
                    flex: 1, padding: '9px 13px', borderRadius: 12,
                    border: '1.5px solid #e5e7eb', fontSize: 13,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={sendAi}
                  disabled={!aiInput.trim() || aiLoading}
                  style={{
                    padding: '9px 13px', borderRadius: 12, border: 'none',
                    background: GRAD, cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'not-allowed',
                    opacity: aiInput.trim() && !aiLoading ? 1 : 0.4,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Send size={14} color="#fff" />
                </button>
              </div>
            </>
          )}

          {/* ── LIVE MODE ── */}
          {mode === 'live' && (
            <>
              {!nameEntered ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '24px 20px', gap: 12,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${primaryColor}22, #a855f722)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User size={24} style={{ color: primaryColor }} />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
                    👋 Как се казваш?
                  </p>
                  <input
                    ref={nameInputRef}
                    autoFocus
                    placeholder="Твоето име"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && clientName.trim() && setNameEntered(true)}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 12,
                      border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => clientName.trim() && setNameEntered(true)}
                    disabled={!clientName.trim()}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                      background: GRAD, color: '#fff', fontWeight: 700, fontSize: 14,
                      cursor: clientName.trim() ? 'pointer' : 'not-allowed',
                      opacity: clientName.trim() ? 1 : 0.45, fontFamily: 'inherit',
                    }}
                  >
                    Продължи →
                  </button>
                  <button
                    onClick={() => setMode('ai')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#999', fontFamily: 'inherit' }}
                  >
                    ← Обратно към AI асистента
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {liveMessages.length === 0 && (
                      <div style={{ textAlign: 'center', paddingTop: 16 }}>
                        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.5 }}>
                          Здравей, <strong style={{ color: '#555' }}>{clientName}</strong>!<br />
                          Напиши съобщение и ще ти отговорим скоро.
                        </p>
                      </div>
                    )}
                    {liveMessages.map((m, i) => {
                      const isClient = m.role === 'client';
                      const bookingMatch = !isClient && m.content.match(/https?:\/\/\S+#rezerviraj/);
                      if (bookingMatch) {
                        const bookingUrl = bookingMatch[0];
                        const textBefore = m.content.slice(0, m.content.indexOf(bookingUrl)).trim();
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                              maxWidth: '82%', padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                              fontSize: 13, lineHeight: 1.5, background: '#f3f4f6', color: '#111',
                              display: 'flex', flexDirection: 'column', gap: 8,
                            }}>
                              {textBefore && <span>{textBefore}</span>}
                              <a
                                href={bookingUrl}
                                onClick={(e) => { e.preventDefault(); if (onOpenBooking) onOpenBooking(); }}
                                style={{
                                  display: 'block', padding: '8px 14px', borderRadius: 10,
                                  background: GRAD, color: '#fff', fontWeight: 700,
                                  fontSize: 12, textAlign: 'center', textDecoration: 'none',
                                }}
                              >
                                📅 Виж свободни часове
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '82%', padding: '9px 13px', borderRadius: 16,
                            fontSize: 13, lineHeight: 1.55,
                            background: isClient ? GRAD : '#f3f4f6',
                            color: isClient ? '#fff' : '#111',
                            borderBottomRightRadius: isClient ? 4 : 16,
                            borderBottomLeftRadius: !isClient ? 4 : 16,
                          }}>
                            {m.content}
                          </div>
                        </div>
                      );
                    })}
                    {liveSending && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ background: '#f3f4f6', borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px' }}>
                          <Loader2 size={14} style={{ color: primaryColor, animation: 'spin 1s linear infinite' }} />
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
                    <input
                      ref={inputRef}
                      value={liveInput}
                      onChange={(e) => setLiveInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendLive()}
                      placeholder="Съобщение..."
                      style={{
                        flex: 1, padding: '9px 13px', borderRadius: 12,
                        border: '1.5px solid #e5e7eb', fontSize: 13,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={sendLive}
                      disabled={!liveInput.trim() || liveSending}
                      style={{
                        padding: '9px 13px', borderRadius: 12, border: 'none',
                        background: GRAD, cursor: liveInput.trim() && !liveSending ? 'pointer' : 'not-allowed',
                        opacity: liveInput.trim() && !liveSending ? 1 : 0.4,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Send size={14} color="#fff" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
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
