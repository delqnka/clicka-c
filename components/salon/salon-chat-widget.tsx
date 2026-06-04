'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { CLICKA_MARKETING_GRADIENT } from '@/lib/clicka-marketing-site';

type Message = { role: 'client' | 'salon'; content: string; createdAt: string };

type Props = {
  salonId: string;
  salonName: string;
  primaryColor?: string;
  onOpenBooking?: () => void;
};

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

export function SalonChatWidget({ salonId, salonName, primaryColor = '#e11d48', onOpenBooking }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);

  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Body scroll lock on mobile — save/restore scroll position to prevent page jump
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
    if (!vv) return;

    function onResize() {
      const offset = Math.max(0, window.innerHeight - (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0));
      setKbOffset(offset);
    }

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      setKbOffset(0);
    };
  }, [open, isMobile]);

  // Smooth scroll on new messages / nameEntered
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, nameEntered]);

  // Instant scroll when keyboard opens/closes so input stays in view without jank
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [kbOffset]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (!nameEntered) {
        nameInputRef.current?.focus();
      } else {
        msgInputRef.current?.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, nameEntered]);

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

  function confirmName() {
    if (!clientName.trim()) return;
    setNameEntered(true);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'client', content: msg, createdAt: new Date().toISOString() }]);
    setInput('');
    try {
      const res = await fetch('/api/salon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, sessionId, clientName, message: msg }),
      });
      const data = await res.json() as { sessionId?: string };
      const sid = data.sessionId ?? sessionId;
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      if (sid) setTimeout(() => poll(sid), 300);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  const GRAD = CLICKA_MARKETING_GRADIENT;

  // Don't render until we know viewport
  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <>
        {open && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: kbOffset,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
            }}
          >
            {/* Header */}
            <div style={{
              background: GRAD,
              paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
              paddingBottom: 14,
              paddingLeft: 16,
              paddingRight: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
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
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>онлайн чат</div>
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

            {/* Body */}
            {!nameEntered ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                gap: 14,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${primaryColor}22, #a855f722)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={30} style={{ color: primaryColor }} />
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
                  👋 Здравей!
                </p>
                <p style={{ fontSize: 15, color: '#666', textAlign: 'center', margin: 0 }}>
                  Как се казваш?
                </p>
                <input
                  ref={nameInputRef}
                  placeholder="Твоето име"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14,
                    border: '1.5px solid #e5e7eb', fontSize: 16, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={confirmName}
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
              </div>
            ) : (
              <>
                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: 'auto', padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                      <p style={{ fontSize: 14, color: '#999', lineHeight: 1.5 }}>
                        Здравей, <strong style={{ color: '#555' }}>{clientName}</strong>!<br />
                        Напиши съобщение и ще ти отговорим скоро.
                      </p>
                    </div>
                  )}
                  <MessagesList messages={messages} GRAD={GRAD} sending={sending} onOpenBooking={onOpenBooking} />
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                  borderTop: '1px solid #efefef',
                  background: '#fff',
                }}>
                  <input
                    ref={msgInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    placeholder="Съобщение..."
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 22,
                      border: '1.5px solid #e5e7eb', fontSize: 16,
                      outline: 'none', fontFamily: 'inherit',
                      background: '#f9f9f9',
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || sending}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                      backgroundImage: input.trim() ? GRAD : undefined,
                      background: input.trim() ? undefined : '#e5e7eb',
                      cursor: input.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {sending
                      ? <Loader2 size={18} color={input.trim() ? '#fff' : '#aaa'} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={18} color={input.trim() ? '#fff' : '#aaa'} />
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bubble — hidden when open (fullscreen takes over) */}
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
    <div className="fixed bottom-[76px] right-4 z-[9999] lg:bottom-5 lg:right-5 flex flex-col items-end gap-3">
      {open && (
        <div style={{
          width: 380, height: 520, borderRadius: 20,
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          border: '1px solid rgba(0,0,0,0.07)',
          background: '#fff',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>онлайн чат</div>
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

          {/* Body */}
          {!nameEntered ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg, ${primaryColor}22, #a855f722)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={26} style={{ color: primaryColor }} />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
                👋 Здравей!
              </p>
              <p style={{ fontSize: 13, color: '#666', textAlign: 'center', margin: 0 }}>
                Как се казваш?
              </p>
              <input
                ref={nameInputRef}
                autoFocus
                placeholder="Твоето име"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={confirmName}
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
            </div>
          ) : (
            <>
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <p style={{ fontSize: 13, color: '#999', lineHeight: 1.5 }}>
                      Здравей, <strong style={{ color: '#555' }}>{clientName}</strong>!<br />
                      Напиши съобщение и ще ти отговорим скоро.
                    </p>
                  </div>
                )}
                <MessagesList messages={messages} GRAD={GRAD} sending={sending} onOpenBooking={onOpenBooking} />
                <div ref={bottomRef} />
              </div>

              <div style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                borderTop: '1px solid #efefef',
                background: '#fff',
              }}>
                <input
                  ref={msgInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Съобщение..."
                  style={{
                    flex: 1, padding: '9px 13px', borderRadius: 22,
                    border: '1.5px solid #e5e7eb', fontSize: 14,
                    outline: 'none', fontFamily: 'inherit',
                    background: '#f9f9f9',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                    backgroundImage: input.trim() ? GRAD : undefined,
                    background: input.trim() ? undefined : '#e5e7eb',
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {sending
                    ? <Loader2 size={16} color={input.trim() ? '#fff' : '#aaa'} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={16} color={input.trim() ? '#fff' : '#aaa'} />
                  }
                </button>
              </div>
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

// ─── Shared messages list ──────────────────────────────────────────────────────

function MessagesList({ messages, GRAD, sending, onOpenBooking }: {
  messages: Message[];
  GRAD: string;
  sending: boolean;
  onOpenBooking?: () => void;
}) {
  return (
    <>
      {messages.map((m, i) => {
        const bookingMatch = m.role === 'salon' && m.content.match(/https?:\/\/\S+#rezerviraj/);
        if (bookingMatch) {
          const bookingUrl = bookingMatch[0];
          const textBefore = m.content.slice(0, m.content.indexOf(bookingUrl)).trim();
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                maxWidth: '82%', padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
                fontSize: 14, lineHeight: 1.5, background: '#f0f0f0', color: '#111',
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
                  }}
                >
                  📅 Виж свободни часове
                </a>
              </div>
            </div>
          );
        }
        const isClient = m.role === 'client';
        return (
          <div key={i} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '9px 13px',
              borderRadius: isClient ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              fontSize: 14, lineHeight: 1.5,
              background: isClient ? undefined : '#f0f0f0',
              backgroundImage: isClient ? GRAD : undefined,
              color: isClient ? '#fff' : '#111',
              wordBreak: 'break-word',
            }}>
              {m.content.split(/\n/).map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        );
      })}
      {sending && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 4 }}>
          <div style={{
            background: '#f0f0f0', borderRadius: '18px 18px 18px 4px',
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.2s infinite' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', display: 'inline-block', animation: 'pulse 1s 0.4s infinite' }} />
          </div>
        </div>
      )}
    </>
  );
}
