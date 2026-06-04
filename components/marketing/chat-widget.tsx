'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

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

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.message || 'Нещо се обърка.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Нещо се обърка. Опитай пак.' }]);
    } finally {
      setLoading(false);
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

            {/* Messages */}
            <div style={{
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
                      backgroundImage: isUser ? GRAD : undefined,
                      background: isUser ? undefined : '#222',
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
            </div>

            {/* Input bar */}
            <div style={{
              flexShrink: 0, background: '#1a1a1a',
              borderTop: '1px solid #2a2a2a',
              padding: '10px 12px',
              paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
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
          </div>
        )}

        {!open && (
          <button
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
              width: 56, height: 56, borderRadius: '50%', border: 'none',
              backgroundImage: GRAD, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
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

          {/* Messages */}
          <div style={{
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
          </div>

          {/* Input bar */}
          <div style={{
            flexShrink: 0, background: '#1a1a1a',
            borderTop: '1px solid #2a2a2a',
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
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
