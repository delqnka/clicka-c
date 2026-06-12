'use client';

import Link from 'next/link';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { ClickaLogo } from '@/components/brand/clicka-logo';

const GRADIENT_TEXT = {
  backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
};

const CHAT_MESSAGES = [
  { from: 'client', text: 'Имате ли свободен час утре следобед?' },
  { from: 'ai', text: 'Да! Имам свободно в 14:00 и 16:30. Кой ти е по-удобен?' },
  { from: 'client', text: '14:00 е добре. Колко струва боядисване?' },
  { from: 'ai', text: 'Боядисването е от 60 лв. в зависимост от дължината. Да го запазя ли за утре в 14:00?' },
  { from: 'client', text: 'Да, запиши ме!' },
  { from: 'ai', text: 'Готово! Записах те за утре, 14:00. Ще получиш потвърждение на имейл. До утре! 🌸' },
];

const CAPABILITIES = [
  { icon: '🕐', label: 'Свободни часове и записване' },
  { icon: '💰', label: 'Цени на услугите' },
  { icon: '📍', label: 'Адрес и как да намерят салона' },
  { icon: '⏰', label: 'Работно време' },
  { icon: '✂️', label: 'Какви услуги предлагаш' },
  { icon: '💇', label: 'Препоръки за услуга' },
  { icon: '📅', label: 'Анулиране и промяна на час' },
  { icon: '👩', label: 'Кой специалист е наличен' },
];

export function AiReceptionistPage() {
  return (
    <main style={{ fontFamily: 'var(--font-client-manrope), sans-serif', overflowX: 'hidden' }}>

      {/* ── Nav ──────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f3e8ff',
        padding: '0 clamp(20px,5vw,60px)',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <ClickaLogo size="compact" href="/" priority />
        <Link
          href="/create"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 36,
            padding: '0 18px', borderRadius: 999,
            background: 'linear-gradient(135deg, #e11d48, #a855f7)',
            fontSize: 13, fontWeight: 600, color: '#fff',
            textDecoration: 'none',
          }}
        >
          Стартирай безплатно
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(64px,12vw,120px) clamp(20px,5vw,60px) clamp(56px,10vw,100px)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 14 }}>
          Нова функция
        </p>
        <h1 style={{
          fontSize: 'clamp(2rem,6.5vw,4rem)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          marginBottom: 'clamp(16px,3vw,24px)',
          ...GRADIENT_TEXT,
        }}>
          AI Рецепционист<br />за твоя салон
        </h1>
        <p style={{
          fontSize: 'clamp(1rem,2.1vw,1.25rem)',
          color: '#4b5563',
          maxWidth: 560,
          margin: '0 auto clamp(32px,5vw,48px)',
          lineHeight: 1.7,
        }}>
          Докато работиш с клиент, той отговаря на въпроси и насочва към резервация — автоматично, 24/7.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ButtonColorful href="#demo" label="Виж демо разговор" className="h-12 rounded-full px-8 text-base font-semibold" />
          <Link
            href="/create"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 48,
              padding: '0 28px', borderRadius: 999,
              border: '1.5px solid #e11d48',
              fontSize: 15, fontWeight: 600, color: '#e11d48',
              textDecoration: 'none',
            }}
          >
            Вземи за салона си
          </Link>
        </div>
      </section>

      {/* ── Demo chat ────────────────────────────────────── */}
      <section
        id="demo"
        style={{
          background: '#fff',
          padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10, textAlign: 'center' }}>
            Демо разговор
          </p>
          <h2 style={{
            fontSize: 'clamp(1.5rem,4vw,2.25rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            marginBottom: 32,
            textAlign: 'center',
            ...GRADIENT_TEXT,
          }}>
            Ето как работи
          </h2>

          {/* Chat window */}
          <div style={{
            background: '#f9fafb',
            borderRadius: 20,
            border: '1.5px solid #f0e6f6',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(168,85,247,0.08)',
          }}>
            {/* Chat header */}
            <div style={{
              background: 'linear-gradient(135deg, #e11d48, #a855f7)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🤖</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Рецепционист</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>● Онлайн 24/7</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CHAT_MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.from === 'client' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: msg.from === 'client'
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                    background: msg.from === 'client'
                      ? 'linear-gradient(135deg, #e11d48, #a855f7)'
                      : '#fff',
                    color: msg.from === 'client' ? '#fff' : '#1f2937',
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: msg.from === 'ai' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    border: msg.from === 'ai' ? '1px solid #f0e6f6' : 'none',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
            Реален разговор — без никакво участие от теб
          </p>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
      }}>
        <div style={{ maxWidth: 740, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Какво може
          </p>
          <h2 style={{
            fontSize: 'clamp(1.5rem,4vw,2.5rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            marginBottom: 12,
            ...GRADIENT_TEXT,
          }}>
            Отговаря на всичко, което клиентите питат
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: '#4b5563', marginBottom: 40, lineHeight: 1.6 }}>
            Обучен с информацията за твоя салон — услуги, цени, работно време, локация.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {CAPABILITIES.map((c) => (
              <div key={c.label} style={{
                background: '#fff',
                border: '1.5px solid #f0e6f6',
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 12px rgba(168,85,247,0.06)',
              }}>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', lineHeight: 1.3, textAlign: 'center' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Included in Clicka ───────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
        padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,60px)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem,4vw,2.5rem)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: 16,
            lineHeight: 1.1,
          }}>
            Включен е във всеки сайт, създаден с Clicka
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(14px,1.8vw,17px)', marginBottom: 36, lineHeight: 1.6 }}>
            Не плащаш допълнително. Получаваш всичко наведнъж.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 340,
            margin: '0 auto 40px',
            textAlign: 'left',
          }}>
            {[
              'Собствен сайт',
              'Онлайн резервации',
              'AI рецепционист',
              'Онлайн плащания',
              '0% комисионна',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
          <ButtonColorful
            href="/create"
            label="Вземи за салона си"
            className="h-12 rounded-full px-8 text-base font-semibold bg-white"
          />
          <p style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            От 0.82 € на ден · Без договор · Без комисионна
          </p>
        </div>
      </section>

      {/* ── Why now CTA ──────────────────────────────────── */}
      <section style={{
        background: '#fff',
        padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 14 }}>
          Защо сега?
        </p>
        <h2 style={{
          fontSize: 'clamp(1.75rem,5vw,3rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: 16,
          ...GRADIENT_TEXT,
        }}>
          Клиентите питат дори в 23:00
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: '#4b5563', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.65 }}>
          Без AI рецепционист — губиш резервацията. С него — часът е запазен докато спиш.
        </p>
        <ButtonColorful href="/create" label="Стартирай безплатно" className="h-12 rounded-full px-8 text-base font-semibold" />
        <p style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>
          Сайтът е готов за минути · AI рецепционистът работи веднага
        </p>
      </section>

    </main>
  );
}
