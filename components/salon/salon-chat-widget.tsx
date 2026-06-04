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
  const [kbHeight, setKbHeight] = useState(0);

  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track visual viewport to reposition above keyboard
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const kb = Math.max(0, window.innerHeight - (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0));
      setKbHeight(kb);
    }

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setKbHeight(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, nameEntered]);

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

  const GRAD = `linear-gradient(135deg, ${primaryColor}, #a855f7)`;
  const PINK_GRAD = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

  // Panel dimensions
  // Mobile: fullscreen, shifted up by keyboard height
  // Desktop: floating 380px wide, 520px tall
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    overflow: 'hidden',
  };

  return (
    <>
      {open && (
        <>
          {/* Mobile: fullscreen */}
          <div
            className="sm:hidden"
            style={{
              ...panelStyle,
              inset: 0,
              bottom: kbHeight,
              borderRadius: 0,
            }}
          >
            <ChatInner
              salonName={salonName}
              primaryColor={primaryColor}
              GRAD={GRAD}
              messages={messages}
              input={input}
              setInput={setInput}
              clientName={clientName}
              setClientName={setClientName}
              nameEntered={nameEntered}
              setNameEntered={setNameEntered}
              sending={sending}
              send={send}
              onClose={() => setOpen(false)}
              onOpenBooking={onOpenBooking}
              bottomRef={bottomRef}
              inputRef={inputRef}
              kbHeight={kbHeight}
              mobile
            />
          </div>

          {/* Desktop: floating panel */}
          <div
            className="hidden sm:flex"
            style={{
              ...panelStyle,
              bottom: 84,
              right: 20,
              width: 380,
              height: 520,
              borderRadius: 20,
              boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            <ChatInner
              salonName={salonName}
              primaryColor={primaryColor}
              GRAD={GRAD}
              messages={messages}
              input={input}
              setInput={setInput}
              clientName={clientName}
              setClientName={setClientName}
              nameEntered={nameEntered}
              setNameEntered={setNameEntered}
              sending={sending}
              send={send}
              onClose={() => setOpen(false)}
              onOpenBooking={onOpenBooking}
              bottomRef={bottomRef}
              inputRef={inputRef}
              kbHeight={0}
              mobile={false}
            />
          </div>
        </>
      )}

      {/* Bubble toggle */}
      <div className="fixed bottom-[76px] right-4 z-[9999] lg:bottom-5 lg:right-5">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Затвори чат' : 'Отвори чат'}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            backgroundImage: PINK_GRAD, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
          onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {open ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
        </button>
      </div>
    </>
  );
}

// ─── Inner panel (shared between mobile/desktop) ───────────────────────────

type InnerProps = {
  salonName: string;
  primaryColor: string;
  GRAD: string;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  clientName: string;
  setClientName: (v: string) => void;
  nameEntered: boolean;
  setNameEntered: (v: boolean) => void;
  sending: boolean;
  send: () => void;
  onClose: () => void;
  onOpenBooking?: () => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  kbHeight: number;
  mobile: boolean;
};

function ChatInner({
  salonName, primaryColor, GRAD, messages, input, setInput,
  clientName, setClientName, nameEntered, setNameEntered,
  sending, send, onClose, onOpenBooking,
  bottomRef, inputRef, mobile,
}: InnerProps) {
  const SAFE_BOTTOM = mobile
    ? 'max(12px, env(safe-area-inset-bottom, 12px))'
    : '12px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          background: GRAD,
          padding: mobile ? '14px 16px' : '12px 16px',
          paddingTop: mobile ? 'max(14px, calc(env(safe-area-inset-top, 0px) + 14px))' : '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
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
          onClick={onClose}
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
        // Onboarding screen
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px',
          paddingBottom: `max(24px, env(safe-area-inset-bottom, 24px))`,
          gap: 12,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${primaryColor}22, #a855f722)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
            <MessageCircle size={30} style={{ color: primaryColor }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111', textAlign: 'center', margin: 0 }}>
            👋 Здравей!
          </p>
          <p style={{ fontSize: 14, color: '#666', textAlign: 'center', margin: 0 }}>
            Как се казваш?
          </p>
          <input
            ref={inputRef}
            autoFocus
            placeholder="Твоето име"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && clientName.trim() && setNameEntered(true)}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14,
              border: '1.5px solid #e5e7eb', fontSize: 16, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
              marginTop: 4,
            }}
          />
          <button
            onClick={() => clientName.trim() && setNameEntered(true)}
            disabled={!clientName.trim()}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
              background: GRAD, color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: clientName.trim() ? 'pointer' : 'not-allowed',
              opacity: clientName.trim() ? 1 : 0.45, fontFamily: 'inherit',
            }}
          >
            Продължи →
          </button>
        </div>
      ) : (
        <>
          {/* Messages list */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
            WebkitOverflowScrolling: 'touch',
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <p style={{ fontSize: 13, color: '#999', lineHeight: 1.5 }}>
                  Здравей, <strong style={{ color: '#555' }}>{clientName}</strong>!<br />
                  Напиши съобщение и ще ти отговорим скоро.
                </p>
              </div>
            )}
            {messages.map((m, i) => {
              const bookingMatch = m.role === 'salon' && m.content.match(/https?:\/\/\S+#rezerviraj/);
              if (bookingMatch) {
                const bookingUrl = bookingMatch[0];
                const textBefore = m.content.slice(0, m.content.indexOf(bookingUrl)).trim();
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%', padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
                      fontSize: 14, lineHeight: 1.5,
                      background: '#f0f0f0', color: '#111',
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
            <div ref={bottomRef} />
          </div>

          {/* Input bar — sticky at bottom, above keyboard */}
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            paddingBottom: SAFE_BOTTOM,
            borderTop: '1px solid #efefef',
            background: '#fff',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Съобщение..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 22,
                border: '1.5px solid #e5e7eb', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
                background: '#f9f9f9',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
                backgroundImage: input.trim() ? GRAD : undefined,
                background: input.trim() ? undefined : '#e5e7eb',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
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
  );
}
