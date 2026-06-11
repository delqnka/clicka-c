'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarketingHomeHeader } from '@/components/marketing/marketing-home-header';
import { FAQ_DATA } from '@/lib/faq-data';

const GRADIENT_TEXT = {
  backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
};

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = [...new Set(FAQ_DATA.map((f) => f.group))];

  return (
    <div className="hp" style={{ minHeight: '100vh' }}>
      <MarketingHomeHeader />

      <main id="main-content" style={{ paddingTop: 72 }}>
        {/* Breadcrumb */}
        <nav
          aria-label="Навигационна следа"
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '20px clamp(20px,5vw,48px) 0',
            fontSize: 13,
            color: 'var(--muted-foreground)',
          }}
        >
          <Link href="/" style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}>
            Начало
          </Link>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>›</span>
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>Въпроси и отговори</span>
        </nav>

        {/* Hero */}
        <section
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,48px) clamp(24px,4vw,40px)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#e11d48',
              marginBottom: 16,
            }}
          >
            Въпроси и отговори
          </p>
          <h1
            style={{
              fontSize: 'clamp(32px,5vw,52px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: 'var(--foreground)',
              marginBottom: 20,
            }}
          >
            Всичко, което трябва да{' '}
            <span style={GRADIENT_TEXT}>знаеш</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px,2vw,20px)',
              color: 'var(--muted-foreground)',
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            Отговори на най-честите въпроси: цени, резервации и как работи сайтът ти.
          </p>
        </section>

        {/* FAQ accordion */}
        <section
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '0 clamp(20px,5vw,48px)',
          }}
        >
          {groups.map((group, gi) => (
            <div key={group} style={{ marginTop: gi === 0 ? 0 : 40 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--muted-foreground)',
                  marginBottom: 8,
                }}
              >
                {group}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {FAQ_DATA.filter((f) => f.group === group).map((faq) => {
                  const isOpen = openId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                        aria-expanded={isOpen}
                        style={{
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          padding: '16px 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          textAlign: 'left',
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 'clamp(14px,1.8vw,16px)',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            lineHeight: 1.4,
                          }}
                        >
                          {faq.question}
                        </span>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="#db2777"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {isOpen && (
                        <p
                          style={{
                            fontSize: 'clamp(14px,1.5vw,15px)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.7,
                            paddingBottom: 16,
                            margin: 0,
                          }}
                        >
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,48px) clamp(64px,10vw,100px)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--muted-foreground)', fontSize: 15, marginBottom: 24 }}>
            Не намери отговор на въпроса си?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/create"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #e11d48, #a855f7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              Създай сайт безплатно →
            </Link>
            <Link
              href="mailto:support@clicka.bg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 28px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                color: 'var(--foreground)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Пиши ни
            </Link>
          </div>
        </section>

        {/* Internal links */}
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '0 clamp(20px,5vw,48px) clamp(40px,6vw,64px)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 13,
            borderTop: '1px solid rgba(0,0,0,0.07)',
            paddingTop: 32,
          }}
        >
          <Link href="/pricing" style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}>
            → Цени и планове
          </Link>
          <Link href="/features" style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}>
            → Всички функции
          </Link>
        </div>
      </main>
    </div>
  );
}
