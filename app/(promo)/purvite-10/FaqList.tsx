'use client';

import { useState } from 'react';

type FaqItem = { q: string; a: string };

export default function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {items.map(({ q, a }, i) => (
        <div key={q} style={{ borderBottom: '1px solid #f3f4f6' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 400, color: '#1a1a1a', lineHeight: 1.5 }}>{q}</span>
            <span style={{
              fontSize: 18,
              flexShrink: 0,
              transition: 'transform 0.2s ease',
              transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
              display: 'inline-block',
              backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>+</span>
          </button>
          {open === i && (
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.7 }}>{a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
