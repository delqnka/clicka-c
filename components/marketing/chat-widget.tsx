'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const WELCOME: Message = {
  role: 'assistant',
  content: 'Здравей! 👋 Аз съм асистентът на Clicka. Как мога да помогна?',
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ messages: next.filter((m) => m.role !== 'assistant' || m !== WELCOME) }),
      });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.message || 'Нещо се обърка.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Нещо се обърка. Опитай пак.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Mobile full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex flex-col sm:hidden"
          style={{ background: '#0f0f0f' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
              <span className="text-white font-semibold text-base">Clicka Асистент</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 p-1">
              <X size={22} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed"
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg, #e11d48, #a855f7)', color: '#fff' }
                    : { background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a' }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <Loader2 size={16} className="text-pink-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-white/5 shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Напиши съобщение..."
                className="flex-1 rounded-2xl px-4 py-3 text-base outline-none"
                style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="rounded-2xl px-4 py-3 transition-opacity disabled:opacity-40 shrink-0"
                style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop popup + toggle button */}
      <div className="fixed bottom-6 right-6 z-50 hidden flex-col items-end gap-3 sm:flex">
        {open && (
          <div className="w-80 rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
            style={{ height: 420, background: '#0f0f0f' }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                <span className="text-white font-semibold text-sm">Clicka Асистент</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                    style={m.role === 'user'
                      ? { background: 'linear-gradient(135deg, #e11d48, #a855f7)', color: '#fff' }
                      : { background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a' }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                    <Loader2 size={14} className="text-pink-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="px-3 py-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Напиши съобщение..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a' }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="rounded-xl px-3 py-2 transition-opacity disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}
        >
          {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </button>
      </div>

      {/* Mobile toggle button (only when chat is closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 sm:hidden"
          style={{ background: 'linear-gradient(135deg, #e11d48, #a855f7)' }}
        >
          <MessageCircle size={22} className="text-white" />
        </button>
      )}
    </>
  );
}
