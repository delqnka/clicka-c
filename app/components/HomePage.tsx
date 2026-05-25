'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PLANS = [
  { id: 'solo',   name: 'SOLO',   price: '299', daily: '0.82', desc: '1 специалист',    tag: null },
  { id: 'ekip',   name: 'ЕКИП',   price: '399', daily: '1.09', desc: 'до 3 специалисти', tag: 'Най-популярен' },
  { id: 'studio', name: 'СТУДИО', price: '599', daily: '1.64', desc: 'без ограничения',  tag: null },
];

const STEPS = [
  { n: '01', head: 'Избери план',      body: 'SOLO, ЕКИП или СТУДИО — без скрити такси, без изненади.' },
  { n: '02', head: 'Попълни данните',  body: 'Снимки, ценоразпис, работно време. Без технически познания. 15 минути.' },
  { n: '03', head: 'Получи своя сайт', body: 'Активен, с резервационна система, готов за клиенти от ден 1.' },
];

// Уникалните Clicka предимства — това е сърцето на продукта
const BENEFITS = [
  {
    icon: '⭐',
    head: 'Повече ревюта в Google — автоматично',
    body: 'След всяка приключила услуга клиентът получава имейл или SMS с директен линк към твоя Google профил. Един клик и оставя ревю. Повече ревюта = по-висок ранг в Google = повече нови клиенти от района.',
    label: 'GOOGLE РЕПУТАЦИЯ',
  },
  {
    icon: '📍',
    head: 'По-добро присъствие в Google търсенето',
    body: 'Собственият ти сайт с правилно SEO, Google My Business профил и натрупани ревюта те показват по-напред когато някой търси „фризьор до мен". Клиентите намират теб, не конкурент.',
    label: 'ЛОКАЛНА ВИДИМОСТ',
  },
  {
    icon: '📅',
    head: 'Синхрон с Google & iOS Calendar',
    body: 'При всяка нова резервация — автоматично събитие в телефона ти. Клиент, услуга, час. Без ръчно въвеждане. Работи с Google Calendar, Apple Calendar и всеки CalDAV клиент.',
    label: 'АВТОМАТИЗАЦИЯ',
  },
  {
    icon: '📩',
    head: 'Telegram известия в реално време',
    body: 'Нова резервация → моментално съобщение в Telegram. Потвърди или откажи с един бутон. Без да отваряш приложение, без да чакаш имейл.',
    label: 'НОТИФИКАЦИИ',
  },
  {
    icon: '✉️',
    head: 'Email и SMS потвърждения',
    body: 'Клиентът получава потвърждение веднага след резервацията — услуга, дата, час, адрес на салона. После и напомняне преди часа. Без пропуснати записвания.',
    label: 'КОМУНИКАЦИЯ',
  },
  {
    icon: '🔒',
    head: 'Клиентите са изцяло твои',
    body: 'Платформите за резервации вземат % от всеки час и изграждат тяхна клиентска база, не твоя. При нас — данните, историята и клиентите са само твои. Никога не ги споделяме.',
    label: '0% КОМИСИОННА',
  },
];

const MARQUEE = [
  'Повече ревюта в Google',
  'Telegram нотификации',
  'Google Calendar sync',
  'Локална видимост',
  '0% комисионна',
  'Клиентите са твои',
  'Готов за 15 мин',
  'Без технически познания',
];

export default function HomePage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 247;
    let cur = 0;
    const tick = () => {
      cur += Math.ceil((target - cur) / 8);
      setCount(cur);
      if (cur < target) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',system-ui,sans-serif", background: '#F8F6F1', color: '#0D0D0D', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 66, padding: '0 clamp(16px,4vw,48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(20px)',
        background: 'rgba(248,246,241,0.88)',
        borderBottom: '1px solid rgba(13,13,13,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: '#0D0D0D', color: '#F8F6F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, letterSpacing: '-0.04em',
          }}>c</div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.04em' }}>clicka.bg</span>
        </div>
        <Link href="/create" style={{
          background: '#0D0D0D', color: '#F8F6F1',
          padding: '10px 22px', borderRadius: 100,
          fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}>
          Започни сега →
        </Link>
      </nav>

      {/* ── HERO ────────────────────────── */}
      <section style={{
        minHeight: '100svh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: 'clamp(110px,16vh,180px) clamp(16px,4vw,48px) clamp(60px,8vh,100px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(13,13,13,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,13,13,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at center, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at center, black 20%, transparent 80%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(180,158,120,0.15), transparent 65%)',
        }} />

        {/* live badge */}
        <div data-reveal style={{
          opacity: 0, transform: 'translateY(18px)',
          transition: 'opacity 0.55s, transform 0.55s',
          position: 'relative', zIndex: 1, marginBottom: 28,
          display: 'inline-flex', alignItems: 'center', gap: 9,
          background: '#fff', border: '1px solid rgba(13,13,13,0.09)',
          borderRadius: 100, padding: '8px 18px',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
        }}>
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'blink 2.2s infinite' }} />
          <span style={{ color: '#555' }}>Над <strong style={{ color: '#0D0D0D' }}>{count}</strong> салона вече работят с Clicka</span>
        </div>

        <h1 data-reveal style={{
          opacity: 0, transform: 'translateY(28px)',
          transition: 'opacity 0.65s ease 0.08s, transform 0.65s ease 0.08s',
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(40px, 7vw, 96px)',
          fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.0,
          marginBottom: 28, maxWidth: 860,
        }}>
          Спри да даваш %<br />
          <span style={{
            background: 'linear-gradient(135deg, #8B6F4E 0%, #D4A853 50%, #8B6F4E 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>на чужди платформи.</span>
        </h1>

        <p data-reveal style={{
          opacity: 0, transform: 'translateY(18px)',
          transition: 'opacity 0.6s ease 0.17s, transform 0.6s ease 0.17s',
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(16px,2vw,21px)', color: '#666',
          maxWidth: 560, lineHeight: 1.7, marginBottom: 44,
        }}>
          Твоят собствен сайт с резервационна система — с Google Calendar sync,
          Telegram нотификации и автоматично събиране на Google ревюта за по-добра
          локална видимост. Готов за 15 минути.
        </p>

        <div data-reveal style={{
          opacity: 0, transform: 'translateY(16px)',
          transition: 'opacity 0.55s ease 0.26s, transform 0.55s ease 0.26s',
          position: 'relative', zIndex: 1,
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Link href="/create" style={{
            background: '#0D0D0D', color: '#F8F6F1',
            padding: '17px 40px', borderRadius: 100,
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
            textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(13,13,13,0.22)',
          }}>
            Стартирай безплатно
          </Link>
          <a href="/demo" style={{
            background: 'transparent', color: '#0D0D0D',
            padding: '17px 36px', borderRadius: 100,
            fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em',
            textDecoration: 'none',
            border: '1.5px solid rgba(13,13,13,0.14)',
          }}>
            Виж как изглежда →
          </a>
        </div>

        <p data-reveal style={{
          opacity: 0, transform: 'translateY(10px)',
          transition: 'opacity 0.5s ease 0.38s, transform 0.5s ease 0.38s',
          position: 'relative', zIndex: 1,
          marginTop: 22, fontSize: 13, color: '#999',
        }}>
          от 0.82 € / ден · без скрити такси · без комисионна
        </p>
      </section>

      {/* ── MARQUEE ─────────────────────── */}
      <div style={{ background: '#0D0D0D', padding: '16px 0', overflow: 'hidden' }}>
        <style>{`@keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}} .mq{display:flex;animation:mq 26s linear infinite;width:max-content;}`}</style>
        <div className="mq">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '0 24px', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: 'rgba(248,246,241,0.75)', letterSpacing: '0.01em' }}>
              <span style={{ fontSize: 5, opacity: 0.4 }}>◆</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── MYTH BUSTER ─────────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,130px) clamp(16px,4vw,48px)', background: '#F2EFE8' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 data-reveal style={{
            opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s, transform 0.6s',
            fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: 20,
          }}>
            Отдавна искаш да спреш<br />да даваш комисионна?
          </h2>
          <p data-reveal style={{
            opacity: 0, transform: 'translateY(16px)', transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            fontSize: 'clamp(16px,1.8vw,20px)', color: '#666', lineHeight: 1.7,
            maxWidth: 680, marginBottom: 48,
          }}>
            Платформите за онлайн резервации вземат процент от всеки записан час —
            дори когато клиентът е твой от години. Ние имаме готово решение:
            твоят сайт е активен за 15 минути, без да даваш нищо на никого.
          </p>
          {[
            { em: '→ Без технически познания', rest: ' — ние изграждаме всичко за теб.' },
            { em: '→ Без скрити такси', rest: ' — плащаш веднъж годишно, толкова.' },
            { em: '→ Без главоболия', rest: ' — поемаме цялата поддръжка.' },
          ].map((b, i) => (
            <div key={i} data-reveal style={{
              opacity: 0, transform: 'translateY(14px)',
              transition: `opacity 0.5s ease ${i*0.08}s, transform 0.5s ease ${i*0.08}s`,
              fontSize: 'clamp(17px,2vw,22px)', marginBottom: 14,
            }}>
              <strong style={{ fontWeight: 700 }}>{b.em}</strong>{b.rest}
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE STATEMENTS ────────────── */}
      <section style={{ padding: 'clamp(70px,9vw,120px) clamp(16px,4vw,48px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {[
            { line: 'Твоят сайт за 15 минути.', note: null },
            { line: 'Клиентите записват директно при теб.', note: null },
            { line: 'Нито стотинка комисионна.', note: 'Никога. За нищо.' },
          ].map((item, i) => (
            <div key={i} data-reveal style={{
              opacity: 0, transform: 'translateY(22px)',
              transition: `opacity 0.65s ease ${i*0.1}s, transform 0.65s ease ${i*0.1}s`,
              padding: 'clamp(28px,4vw,52px) 0',
              borderBottom: i < 2 ? '1px solid rgba(13,13,13,0.08)' : 'none',
            }}>
              <p style={{ fontSize: 'clamp(26px,5.2vw,62px)', fontWeight: 800, margin: 0, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
                {item.line}
              </p>
              {item.note && (
                <p style={{ fontSize: 'clamp(14px,1.6vw,19px)', color: '#888', marginTop: 8, fontWeight: 400 }}>{item.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── UNIQUE BENEFITS ─────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,130px) clamp(16px,4vw,48px)', background: '#0D0D0D', color: '#F8F6F1' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p data-reveal style={{ opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s, transform 0.5s', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(248,246,241,0.35)', marginBottom: 20 }}>
            Само в Clicka
          </p>
          <h2 data-reveal style={{ opacity: 0, transform: 'translateY(18px)', transition: 'opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s', fontSize: 'clamp(30px,5.5vw,66px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 16 }}>
            Функции, които<br />
            <span style={{ color: 'rgba(248,246,241,0.3)' }}>правят разликата.</span>
          </h2>
          <p data-reveal style={{ opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s ease 0.12s, transform 0.5s ease 0.12s', fontSize: 'clamp(15px,1.6vw,18px)', color: 'rgba(248,246,241,0.45)', maxWidth: 580, lineHeight: 1.7, marginBottom: 64 }}>
            Не просто сайт — цялостна система, която работи вместо теб.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} data-reveal style={{
                opacity: 0, transform: 'translateY(20px)',
                transition: `opacity 0.6s ease ${i*0.07}s, transform 0.6s ease ${i*0.07}s`,
                padding: '36px 36px 32px',
                border: '1px solid rgba(248,246,241,0.07)',
                borderRadius: 20,
                background: i === 0 || i === 2 ? 'rgba(248,246,241,0.03)' : 'transparent',
                position: 'relative',
              }}>
                {/* Label pill */}
                <span style={{
                  display: 'inline-block', marginBottom: 20,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#D4A853',
                  border: '1px solid rgba(212,168,83,0.3)',
                  borderRadius: 100, padding: '4px 10px',
                }}>
                  {b.label}
                </span>

                <div style={{ fontSize: 28, marginBottom: 14, lineHeight: 1 }}>{b.icon}</div>

                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.025em', lineHeight: 1.3 }}>
                  {b.head}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(248,246,241,0.45)', lineHeight: 1.7, margin: 0 }}>
                  {b.body}
                </p>
              </div>
            ))}
          </div>

          {/* Google Reviews → local visibility highlight */}
          <div data-reveal style={{
            opacity: 0, transform: 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s',
            marginTop: 3,
            padding: '44px 44px',
            border: '1px solid rgba(212,168,83,0.3)',
            borderRadius: 20,
            background: 'rgba(212,168,83,0.05)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 48, lineHeight: 1, flexShrink: 0 }}>⭐</div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <span style={{
                  display: 'inline-block', marginBottom: 14,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: '#D4A853', border: '1px solid rgba(212,168,83,0.35)', borderRadius: 100, padding: '4px 10px',
                }}>ЛОКАЛНА ВИДИМОСТ</span>
                <h3 style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                  Повече ревюта в Google = повече клиенти от района
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(248,246,241,0.5)', lineHeight: 1.75, margin: 0, maxWidth: 620 }}>
                  След всяка приключила услуга клиентът получава имейл или SMS
                  с директен линк към твоя Google профил — един клик и оставя ревю.
                  Ревютата не се натрупват скрити в платформата ни, а в Google,
                  където новите клиенти те намират.
                </p>
              </div>
            </div>

            {/* Flow визуализация */}
            <div style={{
              marginTop: 36,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 2,
            }}>
              {[
                { n: '1', icon: '✂️', text: 'Услугата приключва' },
                { n: '2', icon: '📧', text: 'Автоматичен имейл / SMS до клиента' },
                { n: '3', icon: '⭐', text: 'Клиентът оставя ревю в Google' },
                { n: '4', icon: '📍', text: 'Ти се появяваш по-напред в местното търсене' },
              ].map((step, i) => (
                <div key={i} style={{
                  padding: '20px 22px',
                  background: 'rgba(248,246,241,0.04)',
                  border: '1px solid rgba(248,246,241,0.08)',
                  borderRadius: 14,
                  position: 'relative',
                }}>
                  <span style={{
                    display: 'block', fontSize: 10, fontWeight: 800,
                    color: 'rgba(212,168,83,0.6)', letterSpacing: '0.1em',
                    marginBottom: 10,
                  }}>СТЪПКА {step.n}</span>
                  <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>{step.icon}</span>
                  <p style={{ fontSize: 13, color: 'rgba(248,246,241,0.55)', margin: 0, lineHeight: 1.55 }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            <p style={{
              marginTop: 24, fontSize: 13,
              color: 'rgba(248,246,241,0.3)',
              fontStyle: 'italic',
            }}>
              * Функцията е в разработка и ще бъде включена автоматично при всички планове.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,130px) clamp(16px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p data-reveal style={{ opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s, transform 0.5s', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>
            Как работи
          </p>
          <h2 data-reveal style={{ opacity: 0, transform: 'translateY(18px)', transition: 'opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s', fontSize: 'clamp(30px,5vw,60px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 64 }}>
            Три стъпки до твоя сайт.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 16 }}>
            {STEPS.map((step, i) => (
              <div key={step.n} data-reveal style={{
                opacity: 0, transform: 'translateY(20px)',
                transition: `opacity 0.6s ease ${i*0.1}s, transform 0.6s ease ${i*0.1}s`,
                padding: 36, background: '#fff',
                border: '1px solid rgba(13,13,13,0.07)', borderRadius: 20,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                <span style={{ display: 'block', fontSize: 64, fontWeight: 800, color: 'rgba(13,13,13,0.06)', lineHeight: 1, marginBottom: 20, letterSpacing: '-0.05em' }}>{step.n}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.025em' }}>{step.head}</h3>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.65, margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,130px) clamp(16px,4vw,48px)', background: '#F2EFE8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p data-reveal style={{ opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s, transform 0.5s', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>
            Ценови планове
          </p>
          <h2 data-reveal style={{ opacity: 0, transform: 'translateY(18px)', transition: 'opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s', fontSize: 'clamp(30px,5vw,58px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: 10 }}>
            Ясно. Прозрачно.
          </h2>
          <p data-reveal style={{ opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s ease 0.12s, transform 0.5s ease 0.12s', fontSize: 17, color: '#777', marginBottom: 52 }}>
            Без скрити такси. Плащаш веднъж за цяла година.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px,1fr))', gap: 14, marginBottom: 14 }}>
            {PLANS.map((plan, i) => (
              <div key={plan.id} data-reveal style={{
                opacity: 0, transform: 'translateY(22px)',
                transition: `opacity 0.6s ease ${i*0.1}s, transform 0.6s ease ${i*0.1}s`,
                position: 'relative', padding: 36,
                background: plan.tag ? '#0D0D0D' : '#fff',
                color: plan.tag ? '#F8F6F1' : '#0D0D0D',
                border: `1.5px solid ${plan.tag ? '#0D0D0D' : 'rgba(13,13,13,0.09)'}`,
                borderRadius: 22, display: 'flex', flexDirection: 'column',
                boxShadow: plan.tag ? '0 20px 56px rgba(0,0,0,0.18)' : '0 4px 18px rgba(0,0,0,0.05)',
              }}>
                {plan.tag && (
                  <span style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: '#D4A853', color: '#0D0D0D',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap',
                  }}>{plan.tag}</span>
                )}
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: plan.tag ? 'rgba(248,246,241,0.4)' : '#aaa', margin: '0 0 4px' }}>{plan.name}</p>
                <p style={{ fontSize: 14, color: plan.tag ? 'rgba(248,246,241,0.55)' : '#888', margin: '0 0 22px' }}>{plan.desc}</p>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontSize: 50, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{plan.price}€</span>
                  <span style={{ fontSize: 13, color: plan.tag ? 'rgba(248,246,241,0.4)' : '#aaa', marginLeft: 4 }}> / год.</span>
                  <p style={{ fontSize: 13, color: plan.tag ? 'rgba(248,246,241,0.35)' : '#bbb', margin: '6px 0 0' }}>по-малко от {plan.daily} € на ден</p>
                </div>
                <div style={{ flex: 1, borderTop: `1px solid ${plan.tag ? 'rgba(248,246,241,0.1)' : 'rgba(13,13,13,0.07)'}`, paddingTop: 22, marginBottom: 26 }}>
                  {[
                    'Готов сайт за 15 минути',
                    'Резервационна система',
                    'Google Calendar sync',
                    'Telegram нотификации',
                    'Email потвърждения',
                    'Собствен домейн с 1 клик',
                    'Хостинг включен',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', fontSize: 13, color: plan.tag ? 'rgba(248,246,241,0.7)' : '#555' }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke={plan.tag ? '#D4A853' : '#0D0D0D'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href={`/create?plan=${plan.id}`} style={{
                  display: 'block', textAlign: 'center',
                  padding: '13px 24px', borderRadius: 100,
                  fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em',
                  background: plan.tag ? '#F8F6F1' : '#0D0D0D',
                  color: plan.tag ? '#0D0D0D' : '#F8F6F1',
                }}>
                  Избери {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <div data-reveal style={{
            opacity: 0, transform: 'translateY(14px)', transition: 'opacity 0.5s ease 0.28s, transform 0.5s ease 0.28s',
            padding: '22px 30px', background: '#fff', border: '1px solid rgba(13,13,13,0.07)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontWeight: 700, margin: '0 0 3px', fontSize: 15 }}>+ SMS напомняния</p>
              <p style={{ color: '#999', margin: 0, fontSize: 13 }}>Автоматични SMS до клиентите — по желание</p>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', flexShrink: 0 }}>9 € / мес.</span>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────── */}
      <section style={{
        padding: 'clamp(100px,14vw,180px) clamp(16px,4vw,48px)',
        textAlign: 'center', background: '#0D0D0D', color: '#F8F6F1',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 45% at 50% 50%, rgba(212,168,83,0.10), transparent 60%)' }} />
        <h2 data-reveal style={{
          opacity: 0, transform: 'translateY(28px)', transition: 'opacity 0.7s, transform 0.7s',
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(38px,8vw,100px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95, marginBottom: 40,
        }}>
          Готова ли си?
        </h2>
        <div data-reveal style={{
          opacity: 0, transform: 'translateY(18px)', transition: 'opacity 0.6s ease 0.14s, transform 0.6s ease 0.14s',
          position: 'relative', zIndex: 1,
        }}>
          <Link href="/create" style={{
            display: 'inline-block',
            background: '#D4A853', color: '#0D0D0D',
            padding: '20px 52px', borderRadius: 100,
            fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
            textDecoration: 'none',
            boxShadow: '0 12px 40px rgba(212,168,83,0.3)',
          }}>
            Стартирай своя сайт →
          </Link>
          <p style={{ marginTop: 18, fontSize: 13, color: 'rgba(248,246,241,0.3)' }}>
            Готов за 15 минути · без технически познания · без комисионна
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────── */}
      <footer style={{
        background: '#0D0D0D', color: '#F8F6F1',
        borderTop: '1px solid rgba(248,246,241,0.06)',
        padding: '28px clamp(16px,4vw,48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(248,246,241,0.3)' }}>© 2025 Clicka.bg</span>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'rgba(248,246,241,0.3)' }}>
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Условия</Link>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Поверителност</Link>
          <a href="mailto:hello@clicka.bg" style={{ color: 'inherit', textDecoration: 'none' }}>hello@clicka.bg</a>
        </div>
      </footer>

    </div>
  );
}
