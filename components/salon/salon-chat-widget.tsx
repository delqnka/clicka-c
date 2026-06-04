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
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      if (sid) setTimeout(() => poll(sid), 300);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  const GRAD = `linear-gradient(135deg, ${primaryColor}, #a855f7)`;
  const PINK_GRAD = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

  return (
    <>
      {/* Chat panel — fullscreen on mobile, floating on desktop */}
      {open && (
        <div className="
          fixed z-[9999]
          inset-x-0 bottom-0 top-0
          sm:inset-auto sm:bottom-[84px] sm:right-5 sm:top-auto sm:w-[360px] sm:rounded-2xl
          flex flex-col overflow-hidden
          bg-white
          shadow-[0_8px_40px_rgba(0,0,0,0.18)]
          border border-black/[0.07]
        ">
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            style={{ background: GRAD }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/70" />
              <span className="text-[15px] font-bold text-white">{salonName}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-full p-1.5 text-white/80 transition hover:bg-white/20 active:bg-white/30"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {!nameEntered ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-8 pt-6">
              <MessageCircle size={44} style={{ color: primaryColor, opacity: 0.7 }} />
              <p className="text-center text-[15px] font-semibold text-gray-900">Как да те наречем?</p>
              <input
                ref={inputRef}
                autoFocus
                placeholder="Твоето име"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && clientName.trim() && setNameEntered(true)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
              />
              <button
                onClick={() => clientName.trim() && setNameEntered(true)}
                disabled={!clientName.trim()}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-40"
                style={{ background: GRAD }}
              >
                Започни чата
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                {messages.length === 0 && (
                  <p className="mt-4 text-center text-[13px] text-gray-400">
                    Здравей, {clientName}! Напиши съобщението си и ще ти отговорим скоро.
                  </p>
                )}
                {messages.map((m, i) => {
                  const bookingMatch = m.role === 'salon' && m.content.match(/https?:\/\/\S+#rezerviraj/);
                  if (bookingMatch) {
                    const bookingUrl = bookingMatch[0];
                    const textBefore = m.content.slice(0, m.content.indexOf(bookingUrl)).trim();
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="flex max-w-[85%] flex-col gap-2.5 rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-900">
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
                            className="block rounded-xl px-4 py-2.5 text-center text-[13px] font-bold text-white no-underline"
                            style={{ background: GRAD }}
                          >
                            📅 Виж свободни часове
                          </a>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={`flex ${m.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                          m.role === 'client'
                            ? 'rounded-br-sm text-white'
                            : 'rounded-bl-sm bg-gray-100 text-gray-900'
                        }`}
                        style={m.role === 'client' ? { background: GRAD } : undefined}
                      >
                        {m.content.split(/\n/).map((line, j, arr) => (
                          <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex justify-end">
                    <Loader2 size={14} className="animate-spin" style={{ color: primaryColor }} />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-3 pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-2.5 sm:pb-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Напиши съобщение..."
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-gray-400"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-none transition disabled:opacity-40"
                  style={{ background: GRAD }}
                >
                  <Send size={15} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle bubble — stays fixed bottom right, above sticky bar on mobile */}
      <div className="fixed bottom-[76px] right-4 z-[9999] lg:bottom-5 lg:right-5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full border-none shadow-[0_4px_20px_rgba(225,29,72,0.35)] transition-transform active:scale-95"
          style={{ backgroundImage: PINK_GRAD }}
        >
          {open ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
        </button>
      </div>
    </>
  );
}
