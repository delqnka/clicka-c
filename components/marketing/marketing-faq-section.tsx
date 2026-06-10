'use client';

import { useState } from 'react';
import { FAQ_DATA } from '@/lib/faq-data';

const FAQ_ITEMS = FAQ_DATA.map((f) => ({ q: f.question, a: f.answer }));

const FAQ_INITIAL_COUNT = 5;

export function MarketingFaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, FAQ_INITIAL_COUNT);

  return (
    <section
      id="faq"
      style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)', padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)', position: 'relative' }}
      aria-label="Честo задавани въпроси"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
          FAQ
        </p>
        <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 36, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Често задавани въпроси
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {visible.map((item, i) => (
            <div
              key={i}
              style={{ borderBottom: '1px solid #f0e6f6' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', background: 'none', border: 'none', padding: '16px 0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', textAlign: 'left', gap: 12,
                }}
              >
                <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.4 }}>{item.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                >
                  <path d="M6 9l6 6 6-6" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {open === i && (
                <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#666', lineHeight: 1.7, paddingBottom: 16, margin: 0 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => { setShowAll(v => !v); setOpen(null); }}
          style={{
            marginTop: 20, width: '100%', padding: '14px',
            background: 'none', border: '1.5px solid',
            borderImageSource: 'linear-gradient(135deg,#e11d48,#a855f7)',
            borderImageSlice: 1,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
            backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {showAll
            ? 'Скрий въпросите ↑'
            : `Виж всички въпроси (${FAQ_ITEMS.length - FAQ_INITIAL_COUNT} още) ↓`}
        </button>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}
