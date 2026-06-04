'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle2, User } from 'lucide-react';
import { CLICKA_MARKETING_GRADIENT } from '@/lib/clicka-marketing-site';

type AiMessage = { role: 'user' | 'assistant'; content: string; isBookingConfirm?: boolean; bookingLink?: string };
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
  onOpenBooking?: (serviceName?: string) => void;
};

const BOOK_RE = /<<BOOK:(\{[\s\S]*?\})>>/;
const BOOK_LINK_RE = /<<BOOK_LINK:([^>]+)>>/;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function SalonAiBotWidget({ salonId, salonName, hasTelegram = false, onOpenBooking }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('ai');

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [liveSending, setLiveSending] = useState(false);
  const [clientName, setClientName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vvTop, setVvTop] = useState(0);
  const [vvHeight, setVvHeight] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMobile = useIsMobile();
  const GRAD = CLICKA_MARKETING_GRADIENT;

  // Body scroll lock on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open, isMobile]);

  // Keyboard height tracking via visualViewport
  useEffect(() => {
    if (!open || !isMobile) return;
    const vv = window.visualViewport;
    function onResize() {
      setVvTop(vv?.offsetTop ?? 0);
      setVvHeight(vv?.height ?? window.innerHeight);
    }
    if (vv) {
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
    }
    onResize();
    return () => {
      if (vv) {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      }
      setVvTop(0);
      setVvHeight(null);
    };
  }, [open, isMobile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, liveMessages, nameEntered]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [vvHeight]);

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

      const bookLinkMatch = BOOK_LINK_RE.exec(raw);
      if (bookLinkMatch) {
        const serviceName = bookLinkMatch[1]!.trim();
        const cleanContent = raw.replace(BOOK_LINK_RE, '').trim();
        setAiMessages([...next, { role: 'assistant', content: cleanContent, bookingLink: serviceName }]);
        return;
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
    setAiMessages((prev) => [...prev, {
      role: 'assistant',
      content: '👤 Свързвам те с екипа на салона. Ще ти отговорят скоро.',
    }]);
  }

  if (isMobile === null) return null;

  // ── Mobile fullscreen ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {open && (
          <div style={{
            position: 'fixed', top: vvTop, left: 0, right: 0,
            height: vvHeight ?? window.innerHeight,
            zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#fff',
          }}>
            {/* Header */}
            <div style={{
              background: GRAD,
              paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
              paddingBottom: 14, paddingLeft: 16, paddingRight: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{salonName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                    {mode === 'ai' ? 'AI асистент • 24/7' : '🟢 Жив чат с екипа'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* AI mode body */}
            {mode === 'ai' && (
              <>
                <div style={{
                  flex: 1, overflowY: 'auto', padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
                  background: '#fff',
                }}>
                  {aiMessages.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: 32 }}>
                      <MessageCircle size={40} style={{ color: '#e11d48', opacity: 0.3, margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 15, color: '#555', lineHeight: 1.5 }}>
                        Здравей! Питай ме за услуги, цени или работно време.
                      </p>
                    </div>
                  )}
                  <AiMessagesList messages={aiMessages} GRAD={GRAD} aiLoading={aiLoading} onOpenBooking={onOpenBooking} />
                  <div ref={bottomRef} />
                </div>

                {hasTelegram && (
                  <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
                    <button
                      onClick={switchToLive}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e5e7eb',
                        background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
                      }}
                    >
                      <User size={15} /> Говори с нас
                    </button>
                  </div>
                )}

                <div style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                  borderTop: '1px solid #efefef', background: '#fff',
                }}>
                  <input
                    ref={inputRef}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendAi()}
                    placeholder="Напиши въпрос..."
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 22,
                      border: '1.5px solid #e5e7eb', fontSize: 16,
                      outline: 'none', fontFamily: 'inherit', background: '#f9f9f9',
                    }}
                  />
                  <button
                    onClick={sendAi}
                    disabled={!aiInput.trim() || aiLoading}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                      backgroundImage: aiInput.trim() ? GRAD : undefined,
                      background: aiInput.trim() ? undefined : '#e5e7eb',
                      cursor: aiInput.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {aiLoading
                      ? <Loader2 size={18} color={aiInput.trim() ? '#fff' : '#aaa'} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={18} color={aiInput.trim() ? '#fff' : '#aaa'} />
                    }
                  </button>
                </div>
              </>
            )}

            {/* Live mode body */}
            {mode === 'live' && (
              <>
                {!nameEntered ? (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '32px 24px', gap: 14, background: '#fff',
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
                      👋 Как се казваш?
                    </p>
                    <input
                      ref={nameInputRef}
                      placeholder="Твоето име"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && clientName.trim() && setNameEntered(true)}
                      style={{
                        width: '100%', padding: '14px 16px', borderRadius: 14,
                        border: '1.5px solid #e5e7eb', fontSize: 16, outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={() => clientName.trim() && setNameEntered(true)}
                      disabled={!clientName.trim()}
                      style={{
                        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                        background: GRAD, color: '#fff', fontWeight: 700, fontSize: 16,
                        cursor: clientName.trim() ? 'pointer' : 'not-allowed',
                        opacity: clientName.trim() ? 1 : 0.45, fontFamily: 'inherit',
                      }}
                    >
                      Продължи →
                    </button>
                    <button
                      onClick={() => setMode('ai')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#999', fontFamily: 'inherit' }}
                    >
                      ← Обратно към AI асистента
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      flex: 1, overflowY: 'auto', padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
                      background: '#fff',
                    }}>
                      {liveMessages.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: 24 }}>
                          <p style={{ fontSize: 14, color: '#999', lineHeight: 1.5 }}>
                            Здравей, <strong style={{ color: '#555' }}>{clientName}</strong>!<br />
                            Напиши съобщение и ще ти отговорим скоро.
                          </p>
                        </div>
                      )}
                      <LiveMessagesList messages={liveMessages} GRAD={GRAD} sending={liveSending} onOpenBooking={onOpenBooking} />
                      <div ref={bottomRef} />
                    </div>
                    <div style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px',
                      paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                      borderTop: '1px solid #efefef', background: '#fff',
                    }}>
                      <input
                        ref={inputRef}
                        value={liveInput}
                        onChange={(e) => setLiveInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendLive()}
                        placeholder="Съобщение..."
                        style={{
                          flex: 1, padding: '11px 14px', borderRadius: 22,
                          border: '1.5px solid #e5e7eb', fontSize: 16,
                          outline: 'none', fontFamily: 'inherit', background: '#f9f9f9',
                        }}
                      />
                      <button
                        onClick={sendLive}
                        disabled={!liveInput.trim() || liveSending}
                        style={{
                          width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                          backgroundImage: liveInput.trim() ? GRAD : undefined,
                          background: liveInput.trim() ? undefined : '#e5e7eb',
                          cursor: liveInput.trim() ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {liveSending
                          ? <Loader2 size={18} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                          : <Send size={18} color={liveInput.trim() ? '#fff' : '#aaa'} />
                        }
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Bubble */}
        {!open && (
          <div className="fixed bottom-[76px] right-4 z-[9999] lg:bottom-5 lg:right-5">
            <button
              onClick={() => setOpen(true)}
              aria-label="Отвори чат"
              style={{
                width: 56, height: 56, borderRadius: '50%', border: 'none',
                backgroundImage: GRAD, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MessageCircle size={24} color="#fff" />
            </button>
          </div>
        )}
      </>
    );
  }

  // ── Desktop ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-[76px] right-4 lg:bottom-5 lg:right-5 z-[9998] flex flex-col items-end gap-3">
      {open && (
        <div style={{
          width: 'min(360px, calc(100vw - 32px))',
          height: 500,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          border: '1px solid rgba(0,0,0,0.07)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            background: GRAD, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={16} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{salonName}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                  {mode === 'ai' ? 'AI асистент • 24/7' : '🟢 Жив чат с екипа'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* AI mode */}
          {mode === 'ai' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMessages.length === 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 20 }}>
                    <MessageCircle size={36} style={{ color: '#e11d48', opacity: 0.3, margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                      Здравей! Питай ме за услуги, цени или работно време.
                    </p>
                  </div>
                )}
                <AiMessagesList messages={aiMessages} GRAD={GRAD} aiLoading={aiLoading} onOpenBooking={onOpenBooking} />
                <div ref={bottomRef} />
              </div>

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
                    <User size={13} /> Говори с нас
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
                    width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                    backgroundImage: aiInput.trim() && !aiLoading ? GRAD : undefined,
                    background: aiInput.trim() && !aiLoading ? undefined : '#e5e7eb',
                    cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {aiLoading
                    ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={15} color={aiInput.trim() ? '#fff' : '#aaa'} />
                  }
                </button>
              </div>
            </>
          )}

          {/* Live mode */}
          {mode === 'live' && (
            <>
              {!nameEntered ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '24px 20px', gap: 12,
                }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
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
                    <LiveMessagesList messages={liveMessages} GRAD={GRAD} sending={liveSending} onOpenBooking={onOpenBooking} />
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
                        width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                        backgroundImage: liveInput.trim() && !liveSending ? GRAD : undefined,
                        background: liveInput.trim() && !liveSending ? undefined : '#e5e7eb',
                        cursor: liveInput.trim() && !liveSending ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {liveSending
                        ? <Loader2 size={15} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                        : <Send size={15} color={liveInput.trim() ? '#fff' : '#aaa'} />
                      }
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Затвори чат' : 'Отвори чат'}
        style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          backgroundImage: GRAD, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
      >
        {open ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
      </button>
    </div>
  );
}

// ─── AI messages list ──────────────────────────────────────────────────────────

function AiMessagesList({ messages, GRAD, aiLoading, onOpenBooking }: {
  messages: AiMessage[];
  GRAD: string;
  aiLoading: boolean;
  onOpenBooking?: (serviceName?: string) => void;
}) {
  return (
    <>
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
          ) : m.bookingLink ? (
            <div style={{
              maxWidth: '82%', padding: '10px 13px', borderRadius: '16px 16px 16px 4px',
              fontSize: 13, lineHeight: 1.55,
              background: '#f3f4f6', color: '#111',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {m.content && <span>{m.content}</span>}
              <button
                onClick={() => onOpenBooking?.(m.bookingLink)}
                style={{
                  padding: '9px 14px', borderRadius: 10, border: 'none',
                  background: GRAD, color: '#fff', fontWeight: 700,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                }}
              >
                📅 Запази час за {m.bookingLink}
              </button>
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
          <div style={{ background: '#f3f4f6', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.2s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.4s infinite' }} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Live messages list ────────────────────────────────────────────────────────

function LiveMessagesList({ messages, GRAD, sending, onOpenBooking }: {
  messages: LiveMessage[];
  GRAD: string;
  sending: boolean;
  onOpenBooking?: (serviceName?: string) => void;
}) {
  return (
    <>
      {messages.map((m, i) => {
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
      {sending && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ background: '#f3f4f6', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.2s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.4s infinite' }} />
          </div>
        </div>
      )}
    </>
  );
}
