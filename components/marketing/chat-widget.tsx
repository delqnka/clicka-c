'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant' | 'human-support'; content: string };

const WELCOME: Message = {
  role: 'assistant',
  content: 'Здравей! 👋 Аз съм асистентът на Clicka. Как мога да помогна?',
};

const GRAD = 'linear-gradient(135deg, #e11d48, #a855f7)';

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

export function ChatWidget({ mobileBottomOffset = 0, hideBubble = false }: { mobileBottomOffset?: number; hideBubble?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const [humanMode, setHumanMode] = useState(false);
  const [askingName, setAskingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const sendingRef = useRef(false);
  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('clicka:open-chat', handler);
    return () => window.removeEventListener('clicka:open-chat', handler);
  }, []);

  // Body scroll lock — saves and restores scroll position
  useEffect(() => {
    if (!isMobile || !open) return;
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
  }, [open, isMobile]);

  // Keyboard height tracking
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

  // Smooth scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Instant scroll when keyboard opens/closes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [kbOffset]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Poll for owner replies when in human mode
  useEffect(() => {
    if (!humanMode || !sessionId || !open) return;
    async function poll() {
      try {
        const res = await fetch(`/api/support-chat/${sessionId}?after=${encodeURIComponent(lastAtRef.current)}`);
        const data = await res.json() as { messages: { id: string; role: string; content: string; created_at: string }[] };
        const newMsgs = data.messages.filter((m) => m.role === 'salon' && !seenIdsRef.current.has(m.id));
        if (newMsgs.length > 0) {
          lastAtRef.current = newMsgs[newMsgs.length - 1]!.created_at;
          setMessages((prev) => [
            ...prev,
            ...newMsgs.map((m) => {
              seenIdsRef.current.add(m.id);
              return { role: 'assistant' as const, content: m.content };
            }),
          ]);
        }
      } catch { /* ignore */ }
    }
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [humanMode, sessionId, open]);

  function switchToHuman() {
    setAskingName(true);
  }

  function confirmName() {
    const name = nameInput.trim();
    const phone = phoneInput.trim();
    if (!name || !phone) return;
    setClientName(`${name} (${phone})`);
    setAskingName(false);
    setHumanMode(true);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `👤 Здравей, ${name}! Свързвам те с екипа на Clicka. Ще ти отговорим скоро.`,
      },
    ]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || sendingRef.current) return;
    sendingRef.current = true;
    setInput('');
    const isFirstMessage = messages.filter((m) => m.role === 'user').length === 0;
    if (isFirstMessage && typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'Lead');

    if (humanMode) {
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      try {
        const res = await fetch('/api/support-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, clientName: clientName || 'Посетител', message: text }),
        });
        const data = await res.json() as { sessionId?: string };
        if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      } catch { /* ignore */ }
      finally { sendingRef.current = false; }
      return;
    }

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      // Detect from AI response that it can't help → offer human
      const aiMsg: string = data.message || 'Нещо се обърка.';
      const cantHelp = aiMsg.includes('support@clicka.bg') || aiMsg.includes('Не откривам');
      const finalMessages: Message[] = [...next, { role: 'assistant', content: aiMsg }];
      setMessages(finalMessages);
      if (cantHelp) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: '💡 Искаш ли да говориш директно с екипа ни?' },
          ]);
        }, 600);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Нещо се обърка. Опитай пак.' }]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  if (isMobile === null) return null;

  // ── Mobile — fullscreen Telegram-style ──────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {open && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: kbOffset,
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            background: '#111',
          }}>
            {/* Header */}
            <div style={{
              background: GRAD, flexShrink: 0,
              paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
              paddingBottom: 14, paddingLeft: 16, paddingRight: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                🤖
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                  Clicka Асистент
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  онлайн
                </div>
              </div>
              {!humanMode && (
                <button
                  onClick={switchToHuman}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#fff', fontSize: 13, fontFamily: 'inherit',
                    textDecoration: 'underline', flexShrink: 0, padding: 0,
                    opacity: 0.85,
                  }}
                >
                  Свържи се с екипа
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            {/* Ask name screen */}
            {askingName && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', gap: 14, background: '#111',
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', margin: 0 }}>👋 Свържи се с нас</p>
                <p style={{ fontSize: 14, color: '#888', textAlign: 'center', margin: 0 }}>Остави името и телефона си</p>
                <input
                  autoFocus
                  placeholder="Твоето име"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14, boxSizing: 'border-box',
                    border: '1.5px solid #333', fontSize: 16, outline: 'none',
                    fontFamily: 'inherit', background: '#1a1a1a', color: '#fff',
                  }}
                />
                <input
                  placeholder="Телефон"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                  type="tel"
                  inputMode="tel"
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14, boxSizing: 'border-box',
                    border: '1.5px solid #333', fontSize: 16, outline: 'none',
                    fontFamily: 'inherit', background: '#1a1a1a', color: '#fff',
                  }}
                />
                <button
                  onClick={confirmName}
                  disabled={!nameInput.trim() || !phoneInput.trim()}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    backgroundImage: (nameInput.trim() && phoneInput.trim()) ? GRAD : undefined,
                    background: (nameInput.trim() && phoneInput.trim()) ? undefined : '#2a2a2a',
                    color: '#fff', fontWeight: 700, fontSize: 16,
                    cursor: (nameInput.trim() && phoneInput.trim()) ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  Продължи →
                </button>
              </div>
            )}

            {/* Messages */}
            {!askingName && <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 12px',
              display: 'flex', flexDirection: 'column', gap: 4,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}>
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '78%',
                      padding: '9px 13px',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: 15, lineHeight: 1.5,
                      background: isUser ? '#a855f7' : '#2a2a2a',
                      color: '#fff',
                      border: isUser ? 'none' : '1px solid #333',
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background: '#222', border: '1px solid #333',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#a855f7',
                        display: 'inline-block',
                        animation: `pulse 1s ${delay}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>}

            {/* Input bar — hidden while asking name */}
            {!askingName && <div style={{
              flexShrink: 0, background: '#1a1a1a',
              borderTop: '1px solid #2a2a2a',
              paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            }}>
              <div style={{ padding: '6px 14px', fontSize: 11, lineHeight: 1.4, color: '#000', background: '#fff' }}>
                Изпращайки съобщение, се съгласяваш данните ти да бъдат обработени с цел отговор на запитването. Виж <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'underline' }}>политиката за поверителност</a>.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Съобщение..."
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: 24,
                    border: '1.5px solid #333', fontSize: 16,
                    outline: 'none', fontFamily: 'inherit',
                    background: '#111', color: '#fff',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
                    backgroundImage: input.trim() ? GRAD : undefined,
                    background: input.trim() ? undefined : '#2a2a2a',
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  {loading
                    ? <Loader2 size={18} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={18} color={input.trim() ? '#fff' : '#555'} />
                  }
                </button>
              </div>
            </div>}
          </div>
        )}

        {!open && !hideBubble && (
          <button
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed', bottom: `calc(max(12px, env(safe-area-inset-bottom, 12px)) + ${mobileBottomOffset}px)`, right: 16, zIndex: 9999,
              width: 50, height: 50, borderRadius: '50%', border: 'none',
              backgroundImage: GRAD, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}
          >
            💬
          </button>
        )}
      </>
    );
  }

  // ── Desktop — Telegram-style floating window ─────────────────────────────────
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
      {open && (
        <div style={{
          width: 360, height: 520,
          borderRadius: 16,
          background: '#111',
          boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
          border: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            backgroundImage: GRAD, flexShrink: 0,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                Clicka Асистент
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                онлайн
              </div>
            </div>
            {!humanMode && (
              <button
                onClick={switchToHuman}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#fff', fontSize: 12, fontFamily: 'inherit',
                  textDecoration: 'underline', flexShrink: 0, padding: 0,
                  opacity: 0.85,
                }}
              >
                Свържи се с екипа
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} color="#fff" />
            </button>
          </div>

          {/* Ask name screen — desktop */}
          {askingName && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px', gap: 12, background: '#111',
            }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', textAlign: 'center', margin: 0 }}>👋 Свържи се с нас</p>
              <p style={{ fontSize: 13, color: '#888', textAlign: 'center', margin: 0 }}>Остави името и телефона си</p>
              <input
                autoFocus
                placeholder="Твоето име"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12, boxSizing: 'border-box',
                  border: '1.5px solid #333', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', background: '#1a1a1a', color: '#fff',
                }}
              />
              <input
                placeholder="Телефон"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                type="tel"
                inputMode="tel"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12, boxSizing: 'border-box',
                  border: '1.5px solid #333', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', background: '#1a1a1a', color: '#fff',
                }}
              />
              <button
                onClick={confirmName}
                disabled={!nameInput.trim() || !phoneInput.trim()}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                  backgroundImage: (nameInput.trim() && phoneInput.trim()) ? GRAD : undefined,
                  background: (nameInput.trim() && phoneInput.trim()) ? undefined : '#2a2a2a',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: (nameInput.trim() && phoneInput.trim()) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                Продължи →
              </button>
            </div>
          )}

          {/* Messages */}
          {!askingName && <div style={{
            flex: 1, overflowY: 'auto',
            padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '78%',
                    padding: '8px 12px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 14, lineHeight: 1.5,
                    backgroundImage: isUser ? GRAD : undefined,
                    background: isUser ? undefined : '#222',
                    color: '#fff',
                    border: isUser ? 'none' : '1px solid #2a2a2a',
                    wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: '#222', border: '1px solid #2a2a2a',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#a855f7',
                      display: 'inline-block',
                      animation: `pulse 1s ${delay}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>}

          {/* Input bar */}
          {!askingName && <div style={{ flexShrink: 0, background: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Съобщение..."
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 22,
                border: '1.5px solid #2a2a2a', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                background: '#111', color: '#fff',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                backgroundImage: input.trim() ? GRAD : undefined,
                background: input.trim() ? undefined : '#2a2a2a',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {loading
                ? <Loader2 size={15} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={15} color={input.trim() ? '#fff' : '#444'} />
              }
            </button>
            </div>
          </div>}
        </div>
      )}

      {/* Bubble toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          backgroundImage: GRAD, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: open ? 0 : 24,
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? <X size={22} color="#fff" /> : '💬'}
      </button>
    </div>
  );
}
