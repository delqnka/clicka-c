'use client';

import { useState } from 'react';

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
      <defs>
        <linearGradient id="chk-fl" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e11d48" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M20 6L9 17l-5-5" stroke="url(#chk-fl)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const VISIBLE = [
  'Собствен сайт',
  'Онлайн резервации 24/7',
  'AI рецепционист',
  'Онлайн чат с клиенти',
  'Управление през Telegram',
  'Собствен домейн',
  'Google ревюта в сайта',
  'Онлайн депозити и плащания (Stripe)',
];

const HIDDEN = [
  'Имейл известия',
  'Имейл напомняния към клиентите и теб',
  'Meta Pixel + Google Analytics',
  'Собствена клиентска база',
  'Неограничени посещения',
  '100% автоматизиран процес',
  'Събиране на ревюта към Google профила ти',
  '0% комисионна',
];

export default function FeaturesList() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {VISIBLE.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Check />
            <span style={{ fontSize: 14, color: '#374151' }}>{f}</span>
          </div>
        ))}

        {expanded && HIDDEN.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Check />
            <span style={{ fontSize: 14, color: '#374151' }}>{f}</span>
          </div>
        ))}
      </div>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 0',
            display: 'flex',
            backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            alignItems: 'center',
            gap: 4,
          }}
        >
          + Виж всички функции ({HIDDEN.length} още)
        </button>
      )}
    </div>
  );
}
