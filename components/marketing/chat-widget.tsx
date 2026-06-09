'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { trackLead } from '@/lib/tracking-events';
import { X, Send, Loader2, ImageUp, ChevronLeft, MessageSquarePlus, MessageSquare } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; imageUrl?: string };
type StoredSession = { id: string; isoDate: string; preview: string; clientName: string };

const WELCOME: Message = {
  role: 'assistant',
  content: 'Здравей! 👋 Аз съм асистентът на Clicka. Как мога да помогна?',
};

const GRAD = 'linear-gradient(135deg, #e11d48, #a855f7)';
const LS_KEY = 'clicka_support_sessions';

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

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Днес';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function loadStoredSessions(): StoredSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSession(session: StoredSession) {
  try {
    const existing = loadStoredSessions().filter((s) => s.id !== session.id);
    localStorage.setItem(LS_KEY, JSON.stringify([session, ...existing]));
  } catch { /* ignore */ }
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

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [fromHistory, setFromHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<StoredSession[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);

  // Image upload
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const sendingRef = useRef(false);
  const lastAtRef = useRef('1970-01-01');
  const seenIdsRef = useRef(new Set<string>());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('clicka:open-chat', handler);
    return () => window.removeEventListener('clicka:open-chat', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      const stored = loadStoredSessions();
      setPastSessions(stored);
      setShowHistory(stored.length > 0);
      setOpen(true);
    };
    window.addEventListener('clicka:open-chat-history', handler);
    return () => window.removeEventListener('clicka:open-chat-history', handler);
  }, []);

  // On open: load history
  useEffect(() => {
    if (!open) return;
    const stored = loadStoredSessions();
    setPastSessions(stored);
    if (stored.length > 0 && !humanMode) {
      setShowHistory(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Body scroll lock
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [kbOffset]);

  useEffect(() => {
    if (open && !showHistory && !askingName) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, showHistory, askingName]);

  // Poll for owner replies
  useEffect(() => {
    if (!humanMode || !sessionId || !open) return;
    async function poll() {
      try {
        const res = await fetch(`/api/support-chat/${sessionId}?after=${encodeURIComponent(lastAtRef.current)}`);
        const data = await res.json() as { messages: { id: string; role: string; content: string; image_url: string | null; created_at: string }[] };
        const newMsgs = data.messages.filter((m) => m.role === 'salon' && !seenIdsRef.current.has(m.id));
        if (newMsgs.length > 0) {
          lastAtRef.current = newMsgs[newMsgs.length - 1]!.created_at;
          setMessages((prev) => [
            ...prev,
            ...newMsgs.map((m) => {
              seenIdsRef.current.add(m.id);
              return { role: 'assistant' as const, content: m.content, imageUrl: m.image_url ?? undefined };
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

  async function openSession(session: StoredSession) {
    setLoadingSession(true);
    setShowHistory(false);
    setFromHistory(true);
    setSessionId(session.id);
    setClientName(session.clientName);
    setHumanMode(true);
    setAskingName(false);
    setMessages([]);
    seenIdsRef.current.clear();
    try {
      const res = await fetch(`/api/support-chat/${session.id}?after=1970-01-01`);
      const data = await res.json() as { messages: { id: string; role: string; content: string; image_url: string | null; created_at: string }[] };
      lastAtRef.current = data.messages.length > 0 ? data.messages[data.messages.length - 1]!.created_at : '1970-01-01';
      data.messages.forEach((m) => seenIdsRef.current.add(m.id));
      setMessages(data.messages.map((m) => ({
        role: m.role === 'client' ? 'user' : 'assistant',
        content: m.content,
        imageUrl: m.image_url ?? undefined,
      })));
    } catch { /* ignore */ } finally {
      setLoadingSession(false);
    }
  }

  function startNewChat() {
    setShowHistory(false);
    setFromHistory(false);
    setSessionId(null);
    setClientName('');
    setHumanMode(false);
    setMessages([WELCOME]);
    setAskingName(true);
    seenIdsRef.current.clear();
    lastAtRef.current = '1970-01-01';
    setPendingImageDataUrl(null);
    setUploadedImageUrl(null);
  }

  function goBackToHistory() {
    setShowHistory(true);
    setFromHistory(false);
    setMessages([WELCOME]);
    setHumanMode(false);
    setSessionId(null);
    setPendingImageDataUrl(null);
    setUploadedImageUrl(null);
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => setPendingImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingImage(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/support-chat/upload', { method: 'POST', body: fd });
      const data = await res.json() as { url?: string };
      if (data.url) {
        setUploadedImageUrl(data.url);
      } else {
        setPendingImageDataUrl(null);
      }
    } catch {
      setPendingImageDataUrl(null);
    } finally {
      setUploadingImage(false);
    }
  }

  function cancelImage() {
    setPendingImageDataUrl(null);
    setUploadedImageUrl(null);
  }

  async function send() {
    const text = input.trim();
    const hasImage = !!uploadedImageUrl;
    if ((!text && !hasImage) || loading || sendingRef.current || uploadingImage) return;
    sendingRef.current = true;

    const imgUrl = uploadedImageUrl;
    setInput('');
    setPendingImageDataUrl(null);
    setUploadedImageUrl(null);

    const isFirstHumanMsg = humanMode && messages.filter((m) => m.role === 'user').length === 0;
    if (!humanMode && messages.filter((m) => m.role === 'user').length === 0) trackLead();

    if (humanMode) {
      const msgContent = text || '[Снимка]';
      setMessages((prev) => [...prev, { role: 'user', content: msgContent, imageUrl: imgUrl ?? undefined }]);
      try {
        const res = await fetch('/api/support-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, clientName: clientName || 'Посетител', message: msgContent, imageUrl: imgUrl }),
        });
        const data = await res.json() as { sessionId?: string };
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
          const newSession: StoredSession = {
            id: data.sessionId,
            isoDate: new Date().toISOString(),
            preview: text.length > 60 ? text.slice(0, 60) + '…' : text || '📷 Снимка',
            clientName: clientName || 'Посетител',
          };
          saveSession(newSession);
          setPastSessions(loadStoredSessions());
        }
        if (isFirstHumanMsg) trackLead();
      } catch { /* ignore */ } finally {
        sendingRef.current = false;
      }
      return;
    }

    if (!text) { sendingRef.current = false; return; } // AI mode: text only

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

  // ── Shared sub-components (render functions) ─────────────────────────────

  function renderMessage(m: Message, i: number, small = false) {
    const isUser = m.role === 'user';
    const showContent = m.content && m.content !== '[Снимка]';
    const pad = small ? '8px 12px' : '9px 13px';
    const fs = small ? 14 : 15;
    const radius = isUser
      ? (small ? '16px 16px 4px 16px' : '18px 18px 4px 18px')
      : (small ? '16px 16px 16px 4px' : '18px 18px 18px 4px');

    return (
      <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{
          maxWidth: '78%', padding: m.imageUrl ? '6px' : pad,
          borderRadius: radius, fontSize: fs, lineHeight: 1.5,
          backgroundImage: isUser ? GRAD : undefined,
          background: isUser ? undefined : (small ? '#222' : '#2a2a2a'),
          color: '#fff',
          border: isUser ? 'none' : `1px solid ${small ? '#2a2a2a' : '#333'}`,
          wordBreak: 'break-word', overflow: 'hidden',
        }}>
          {m.imageUrl && (
            <img
              src={m.imageUrl}
              alt="снимка"
              style={{
                maxWidth: '100%', borderRadius: 10, display: 'block',
                marginBottom: showContent ? 6 : 0,
              }}
            />
          )}
          {showContent && (
            <span style={{ display: 'block', padding: m.imageUrl ? '0 6px 4px' : undefined }}>
              {m.content}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderHistoryList(small = false) {
    const fs = small ? 14 : 15;
    const btnPad = small ? '10px 14px' : '12px 16px';
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* New chat button */}
        <div style={{ padding: small ? '12px' : '14px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          <button
            onClick={startNewChat}
            style={{
              width: '100%', padding: btnPad, borderRadius: 14, border: 'none',
              backgroundImage: GRAD, color: '#fff', fontWeight: 700,
              fontSize: fs, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <MessageSquarePlus size={small ? 16 : 18} />
            Нов разговор
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {pastSessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: fs }}>
              Няма предишни разговори
            </div>
          ) : (
            pastSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: '1px solid #1e1e1e',
                  padding: small ? '12px 14px' : '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: '#2a2a2a', border: '1px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageSquare size={16} color="#a855f7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: small ? 12 : 13, color: '#a855f7', fontWeight: 600, marginBottom: 2 }}>
                    {formatSessionDate(s.isoDate)}
                  </div>
                  <div style={{
                    fontSize: fs, color: '#ccc', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.preview || 'Разговор с поддръжката'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderImagePreview(small = false) {
    if (!pendingImageDataUrl) return null;
    return (
      <div style={{
        padding: small ? '6px 12px' : '8px 14px',
        borderTop: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={pendingImageDataUrl}
            alt="preview"
            style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 8, display: 'block' }}
          />
          {uploadingImage && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 8,
              background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          {!uploadingImage && (
            <button
              onClick={cancelImage}
              style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                background: '#ef4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={11} color="#fff" />
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          {uploadingImage ? 'Качване…' : 'Готово за изпращане'}
        </div>
      </div>
    );
  }

  function renderInputBar(small = false) {
    const canSend = (input.trim() || !!uploadedImageUrl) && !loading && !uploadingImage;
    const showImageBtn = humanMode; // images only in human support mode
    const size = small ? 38 : 44;
    const btnSize = small ? 15 : 18;
    const pad = small ? '9px 14px' : '11px 16px';

    return (
      <div style={{ flexShrink: 0, background: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
        {!small && (
          <div style={{ padding: '6px 14px', fontSize: 11, lineHeight: 1.4, color: '#000', background: '#fff' }}>
            Изпращайки съобщение, се съгласяваш данните ти да бъдат обработени с цел отговор на запитването. Виж <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'underline' }}>политиката за поверителност</a>.
          </div>
        )}
        {renderImagePreview(small)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: small ? '8px 12px' : '8px 12px' }}>
          {showImageBtn && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                style={{
                  width: size, height: size, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: '#2a2a2a', cursor: uploadingImage ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ImageUp size={btnSize} color={uploadingImage ? '#555' : '#888'} />
              </button>
            </>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Съобщение…"
            style={{
              flex: 1, padding: pad, borderRadius: 24,
              border: `1.5px solid ${small ? '#2a2a2a' : '#333'}`, fontSize: small ? 14 : 16,
              outline: 'none', fontFamily: 'inherit',
              background: '#111', color: '#fff',
            }}
          />
          <button
            onClick={send}
            disabled={!canSend}
            style={{
              width: size, height: size, borderRadius: '50%', border: 'none', flexShrink: 0,
              backgroundImage: canSend ? GRAD : undefined,
              background: canSend ? undefined : '#2a2a2a',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            {loading
              ? <Loader2 size={btnSize} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={btnSize} color={canSend ? '#fff' : (small ? '#444' : '#555')} />
            }
          </button>
        </div>
      </div>
    );
  }

  function renderHeader(small = false) {
    const showBack = fromHistory && !showHistory;
    return (
      <div style={{
        backgroundImage: GRAD, flexShrink: 0,
        paddingTop: (!small && isMobile) ? 'max(16px, env(safe-area-inset-top, 16px))' : (small ? undefined : 14),
        paddingBottom: small ? 14 : 14,
        paddingLeft: 16, paddingRight: 16,
        padding: small ? '14px 16px' : undefined,
        display: 'flex', alignItems: 'center', gap: small ? 10 : 12,
      }}>
        {showBack ? (
          <button
            onClick={goBackToHistory}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: small ? 30 : 34, height: small ? 30 : 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ChevronLeft size={small ? 16 : 18} color="#fff" />
          </button>
        ) : (
          <div style={{
            width: small ? 36 : 40, height: small ? 36 : 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: small ? 16 : 18, flexShrink: 0,
          }}>
            🤖
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: small ? 14 : 16, lineHeight: 1.2 }}>
            {showHistory ? 'Разговори с поддръжката' : 'Clicka Асистент'}
          </div>
          {!showHistory && (
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: small ? 11 : 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              онлайн
            </div>
          )}
        </div>
        {!humanMode && !showHistory && (
          <button
            onClick={switchToHuman}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: small ? 12 : 13, fontFamily: 'inherit',
              textDecoration: 'underline', flexShrink: 0, padding: 0, opacity: 0.85,
            }}
          >
            Свържи се с екипа
          </button>
        )}
        {pastSessions.length > 0 && humanMode && !showHistory && (
          <button
            onClick={goBackToHistory}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 11,
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            История
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: small ? 30 : 34, height: small ? 30 : 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={small ? 15 : 18} color="#fff" />
        </button>
      </div>
    );
  }

  // ── Mobile — fullscreen ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {open && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: kbOffset,
            zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#111',
          }}>
            {renderHeader(false)}

            {/* History list */}
            {showHistory && renderHistoryList(false)}

            {/* Ask name screen */}
            {!showHistory && askingName && (
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
                  type="tel" inputMode="tel"
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
            {!showHistory && !askingName && (
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 12px',
                display: 'flex', flexDirection: 'column', gap: 4,
                WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
              }}>
                {loadingSession
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={24} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} /></div>
                  : messages.map((m, i) => renderMessage(m, i, false))
                }
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
                          display: 'inline-block', animation: `pulse 1s ${delay}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Input bar */}
            {!showHistory && !askingName && renderInputBar(false)}
          </div>
        )}

        {!open && !hideBubble && (
          <button
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed',
              bottom: `calc(max(12px, env(safe-area-inset-bottom, 12px)) + ${mobileBottomOffset}px)`,
              right: 16, zIndex: 9999,
              width: 50, height: 50, borderRadius: '50%', border: 'none',
              backgroundImage: GRAD, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(225,29,72,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}
          >
            💬
          </button>
        )}
      </>
    );
  }

  // ── Desktop — floating window ────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
      {open && (
        <div style={{
          width: 360, height: 520,
          borderRadius: 16, background: '#111',
          boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
          border: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {renderHeader(true)}

          {/* History list */}
          {showHistory && renderHistoryList(true)}

          {/* Ask name screen — desktop */}
          {!showHistory && askingName && (
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
                type="tel" inputMode="tel"
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
          {!showHistory && !askingName && (
            <div style={{
              flex: 1, overflowY: 'auto', padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {loadingSession
                ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={22} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} /></div>
                : messages.map((m, i) => renderMessage(m, i, true))
              }
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
                        display: 'inline-block', animation: `pulse 1s ${delay}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input bar */}
          {!showHistory && !askingName && renderInputBar(true)}
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
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
      >
        {open ? <X size={22} color="#fff" /> : '💬'}
      </button>
    </div>
  );
}
