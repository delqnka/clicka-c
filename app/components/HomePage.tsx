'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
   SVG Icons — consistent 22×22, 1.75 stroke, no emoji
═══════════════════════════════════════════════════════════ */
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconCheck({ color = '#22C55E' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Data
═══════════════════════════════════════════════════════════ */
const PLANS = [
  { id: 'solo',   name: 'Solo',   price: 299, daily: '0.82', desc: '1 специалист',     popular: false },
  { id: 'ekip',   name: 'Екип',   price: 399, daily: '1.09', desc: 'до 3 специалисти', popular: true  },
  { id: 'studio', name: 'Студио', price: 599, daily: '1.64', desc: 'без ограничения',  popular: false },
];

const FEATURES = [
  {
    Icon: IconCalendar, label: 'Резервации',
    head: 'Клиентите записват директно',
    body: 'Резервационна система без комисионна и без посредник. Клиентите избират час и специалист в реално време от твоя сайт.',
  },
  {
    Icon: IconStar, label: 'Google ревюта',
    head: 'Повече ревюта, автоматично',
    body: 'След всяка приключила услуга клиентът получава имейл с директен линк към Google профила ти. Повече ревюта = по-висок ранг в Google.',
  },
  {
    Icon: IconMapPin, label: 'Локална видимост',
    head: 'По-добро местно SEO',
    body: 'Собственият сайт с правилно SEO те показва по-напред, когато някой търси „фризьор до мен". Клиентите намират теб, не конкурент.',
  },
  {
    Icon: IconSend, label: 'Telegram',
    head: 'Нотификации в реално време',
    body: 'Нова резервация → моментално съобщение в Telegram. Потвърди или откажи с един бутон. Без да отваряш приложение.',
  },
  {
    Icon: IconMail, label: 'Комуникация',
    head: 'Email и SMS потвърждения',
    body: 'Клиентът получава потвърждение веднага след резервацията — услуга, дата, час, адрес. После и напомняне преди часа.',
  },
  {
    Icon: IconShield, label: '0% комисионна',
    head: 'Клиентите са само твои',
    body: 'Данните, историята и клиентите са изцяло твои. Никога не ги споделяме с трети страни. Нито стотинка комисионна.',
  },
];

const STEPS = [
  {
    n: '01', head: 'Въведи 3 неща',
    body: 'Само: Салон, Град, Имейл. Нищо повече. 30 секунди и продължаваш.',
  },
  {
    n: '02', head: 'Виж своя сайт',
    body: 'Автоматично ти показваме как ще изглежда сайтът с твоята информация. Харесва ли ти — продължи. Не харесва — промени.',
  },
  {
    n: '03', head: 'Плати и публикувай',
    body: 'Добави детайли по желание, избери план, плати. Сайтът е активен и приема резервации от минута 1.',
  },
];

const MARQUEE = [
  'Готов за 15 минути', 'Без технически познания', 'Google Calendar sync',
  'Telegram нотификации', '0% комисионна', 'Без скрити такси',
  'Email напомняния', 'Клиентите са твои', 'Мобилна версия',
  'Хостинг включен', 'Свързи собствен домейн',
];

const PLAN_FEATURES = [
  'Готов сайт за 15 минути',
  'Резервационна система',
  'Google Calendar sync',
  'Telegram нотификации',
  'Email потвърждения',
  'Собствен домейн с 1 клик',
  'Хостинг включен',
];

/* ═══════════════════════════════════════════════════════════
   Scoped CSS — warm minimal, NO dark backgrounds in hero/features
═══════════════════════════════════════════════════════════ */
const CSS = `
  /* ── Keyframes ─────────────────────────────── */
  @keyframes mq    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes notifSlide {
    0%   { opacity:0; transform:translateX(16px); }
    15%  { opacity:1; transform:translateX(0); }
    85%  { opacity:1; transform:translateX(0); }
    100% { opacity:0; transform:translateX(-8px); }
  }

  /* ── Root ──────────────────────────────────── */
  .hp {
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    background: #FAF8F5;
    color: #1C1917;
    overflow-x: hidden;
  }

  /* ── Scroll reveal ─────────────────────────── */
  [data-reveal] {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1);
  }

  /* ── Display font helper ───────────────────── */
  .font-display {
    font-family: var(--font-display, 'Playfair Display', Georgia, serif);
  }

  /* ── Navigation ────────────────────────────── */
  .hp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 64px;
    background: rgba(250,248,245,.93);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 1px solid rgba(28,25,23,.07);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(16px, 5vw, 60px);
  }

  /* ── Buttons ───────────────────────────────── */
  .hp-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border-radius: 9999px;
    font-family: inherit; font-size: 14px; font-weight: 600;
    text-decoration: none; cursor: pointer; white-space: nowrap;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .hp-btn:focus-visible { outline: 3px solid #B07D2E; outline-offset: 3px; }

  .hp-btn-ink {
    background: #1C1917; color: #FAF8F5; border: none;
    padding: 12px 28px;
    box-shadow: 0 2px 8px rgba(28,25,23,.2), 0 1px 2px rgba(28,25,23,.1);
  }
  .hp-btn-ink:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(28,25,23,.22); }

  .hp-btn-ghost {
    background: #fff; color: #1C1917; border: 1.5px solid rgba(28,25,23,.18);
    padding: 11px 28px;
  }
  .hp-btn-ghost:hover { border-color: rgba(28,25,23,.42); box-shadow: 0 4px 14px rgba(28,25,23,.08); }

  .hp-btn-brass {
    background: #B07D2E; color: #FAF8F5; border: none;
    padding: 18px 52px;
    box-shadow: 0 4px 24px rgba(176,125,46,.3);
    font-size: 17px;
  }
  .hp-btn-brass:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(176,125,46,.4); }

  /* ── Hero layout ───────────────────────────── */
  .hp-hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    max-width: 1180px;
    margin: 0 auto;
    padding: 100px clamp(20px,5vw,60px) 80px;
    min-height: 100svh;
  }
  @media (max-width:820px) {
    .hp-hero-grid {
      grid-template-columns: 1fr;
      padding-top: 88px;
      min-height: auto;
      padding-bottom: 60px;
    }
    .hp-hero-right { display: none !important; }
    .hp-hero-left  { text-align: center; }
    .hp-hero-btns  { justify-content: center !important; }
  }

  /* ── Feature cards ─────────────────────────── */
  .hp-feat-card {
    background: #fff;
    border: 1px solid #E7E5E4;
    border-radius: 20px;
    padding: 28px;
    transition:
      transform .3s cubic-bezier(.16,1,.3,1),
      box-shadow .3s ease,
      border-color .25s ease;
  }
  .hp-feat-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 56px rgba(28,25,23,.09), 0 4px 14px rgba(28,25,23,.05);
    border-color: #D6D3D1;
  }

  /* ── Feature icon ──────────────────────────── */
  .hp-feat-icon {
    width: 46px; height: 46px;
    border-radius: 13px;
    background: #FAF8F5; border: 1px solid #E7E5E4;
    display: flex; align-items: center; justify-content: center;
    color: #1C1917; margin-bottom: 20px; flex-shrink: 0;
  }

  /* ── Label pill ────────────────────────────── */
  .hp-label {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: #78716C; margin-bottom: 16px;
  }

  /* ── Marquee ───────────────────────────────── */
  .hp-mq { display:flex; animation:mq 36s linear infinite; width:max-content; }
  .hp-mq-wrap {
    overflow:hidden; position:relative;
    border-top:1px solid #E7E5E4; border-bottom:1px solid #E7E5E4;
    padding:17px 0; background:#fff;
  }
  .hp-mq-wrap::before,.hp-mq-wrap::after {
    content:''; position:absolute; top:0; bottom:0; width:100px; z-index:2; pointer-events:none;
  }
  .hp-mq-wrap::before { left:0; background:linear-gradient(to right,#fff,transparent); }
  .hp-mq-wrap::after  { right:0; background:linear-gradient(to left,#fff,transparent); }

  /* ── Pricing card ──────────────────────────── */
  .hp-price-card {
    background: #fff;
    border: 1.5px solid #E7E5E4;
    border-radius: 24px;
    padding: 36px 28px;
    display: flex; flex-direction: column;
    position: relative;
    transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
  }
  .hp-price-card:hover { transform: translateY(-5px); box-shadow: 0 20px 56px rgba(28,25,23,.1); }
  .hp-price-card.popular {
    border-color: #B07D2E;
    box-shadow: 0 0 0 1px #B07D2E, 0 8px 32px rgba(176,125,46,.14);
  }

  /* ── Phone mockup & notifs ─────────────────── */
  .hp-phone-wrap { animation: float 7s ease-in-out infinite; }
  .hp-notif {
    position: absolute; background: #fff;
    border: 1px solid #E7E5E4; border-radius: 14px;
    padding: 11px 15px;
    box-shadow: 0 8px 28px rgba(28,25,23,.1);
    font-size: 13px; font-weight: 500; color: #1C1917;
    white-space: nowrap; display: flex; align-items: center; gap: 9px;
    animation: notifSlide 4s ease-in-out infinite;
  }
  .hp-notif-b { animation-delay: 2.2s; }

  /* ── Step ──────────────────────────────────── */
  .hp-step {
    display:flex; gap:28px; align-items:flex-start;
    padding:34px 0; border-bottom:1px solid #E7E5E4;
  }
  .hp-step:last-child { border-bottom:none; }

  /* ── Value statements ──────────────────────── */
  .hp-value-line {
    padding: clamp(26px,4vw,48px) 0;
    border-bottom: 1px solid #E7E5E4;
  }
  .hp-value-line:last-child { border-bottom: none; }

  /* ── Pricing grid ──────────────────────────── */
  .hp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 16px;
  }
  @media (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr; } }
  @media (min-width:640px) and (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr 1fr; } }

  /* ── Features grid ─────────────────────────── */
  .hp-feat-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 14px;
  }
  @media (max-width:900px) { .hp-feat-grid { grid-template-columns:1fr 1fr; } }
  @media (max-width:560px) { .hp-feat-grid { grid-template-columns:1fr; } }

  /* ── Myth buster cards ─────────────────────── */
  .hp-myth-card {
    background: #fff;
    border: 1px solid #E7E5E4;
    border-radius: 18px;
    padding: 20px 24px;
    font-size: clamp(15px,1.7vw,18px);
    line-height: 1.65;
    margin-bottom: 10px;
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .hp-myth-card:hover { border-color: #D6D3D1; box-shadow: 0 6px 20px rgba(28,25,23,.06); }

  /* ── Misc ──────────────────────────────────── */
  .hp-check { display:flex; align-items:center; gap:10px; font-size:14px; color:#44403C; line-height:1.5; padding:4px 0; }

  /* ── Reduced motion ────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    [data-reveal]     { opacity:1; transform:none; transition:none; }
    .hp-phone-wrap    { animation:none; }
    .hp-notif         { animation:none; opacity:1; }
    .hp-mq            { animation:none; }
  }
`;

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [count, setCount] = useState(0);

  /* Counter */
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

  /* Scroll reveal */
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
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="hp">
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="hp-nav" aria-label="Главна навигация">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{ width: 32, height: 32, borderRadius: 9, background: '#1C1917', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#FAF8F5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: '#1C1917' }}>
            clicka.bg
          </span>
        </div>
        <Link href="/create" className="hp-btn hp-btn-ink" style={{ padding: '10px 22px', fontSize: 13 }}>
          Стартирай →
        </Link>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{ background: '#FAF8F5' }} aria-labelledby="hero-h">
        <div className="hp-hero-grid">

          {/* Left — text */}
          <div className="hp-hero-left">
            {/* Live badge */}
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff', border: '1px solid #E7E5E4', borderRadius: 9999,
                padding: '7px 16px', marginBottom: 32,
                fontSize: 13, fontWeight: 500, color: '#44403C',
                boxShadow: '0 2px 8px rgba(28,25,23,.06)',
              }}
              role="status"
              aria-live="polite"
            >
              <span
                style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'blink 2s infinite', boxShadow: '0 0 6px rgba(34,197,94,.45)', flexShrink: 0 }}
                aria-hidden="true"
              />
              Над <strong style={{ fontWeight: 700, marginLeft: 4 }}>{count}</strong>&nbsp;салона вече работят с Clicka
            </div>

            <h1
              id="hero-h"
              className="font-display"
              style={{ fontSize: 'clamp(36px,5.8vw,72px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.06, marginBottom: 24, color: '#1C1917' }}
            >
              Сайт за твоя салон.<br />
              <span style={{ color: '#B07D2E' }}>Готов за 15 минути.</span>
            </h1>

            <p style={{ fontSize: 'clamp(16px,1.7vw,19px)', color: '#78716C', lineHeight: 1.74, marginBottom: 40, maxWidth: 480 }}>
              Резервационна система, Telegram нотификации, Google Calendar sync и
              автоматично събиране на ревюта.{' '}
              <strong style={{ color: '#1C1917', fontWeight: 600 }}>0% комисионна.</strong>
            </p>

            <div className="hp-hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <Link href="/create" className="hp-btn hp-btn-ink" style={{ padding: '15px 40px', fontSize: 16 }}>
                Стартирай безплатно
              </Link>
              <Link href="/demo" className="hp-btn hp-btn-ghost" style={{ padding: '15px 32px', fontSize: 16 }}>
                Виж демо →
              </Link>
            </div>

            <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>
              от 0.82 € / ден · без скрити такси · без комисионна
            </p>
          </div>

          {/* Right — phone mockup */}
          <div
            className="hp-hero-right"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingBlock: 40 }}
            aria-hidden="true"
          >
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────── */}
      <div className="hp-mq-wrap" aria-hidden="true">
        <div className="hp-mq">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '0 26px', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: '#78716C' }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block', flexShrink: 0 }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── MYTH BUSTER ─────────────────────────────────────── */}
      <section
        style={{ background: '#FAF8F5', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="myth-h"
      >
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="hp-label">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
            За собственици на салони
          </div>

          <h2 id="myth-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            Отдавна искаш да спреш<br />да даваш комисионна?
          </h2>

          <p data-reveal style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: '#78716C', lineHeight: 1.74, maxWidth: 660, marginBottom: 36 }}>
            Платформите за онлайн резервации вземат процент от всеки записан час —
            дори когато клиентът е твой от години. Имаме готово решение: твоят сайт е
            активен за 15 минути, без да даваш нищо на никого.
          </p>

          {[
            { em: 'Без технически познания', rest: ' — ние изграждаме всичко за теб.' },
            { em: 'Без скрити такси',         rest: ' — плащаш веднъж годишно, толкова.' },
            { em: 'Без главоболия',            rest: ' — поемаме цялата поддръжка.' },
          ].map((b, i) => (
            <div key={i} data-reveal className="hp-myth-card" style={{ transitionDelay: `${i * 0.08}s` }}>
              <strong style={{ fontWeight: 700 }}>{b.em}</strong>
              <span style={{ color: '#78716C' }}>{b.rest}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section
        style={{ background: '#fff', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="steps-h"
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="hp-label">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
            Как работи
          </div>

          <h2 id="steps-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 52 }}>
            Три стъпки до<br />твоя собствен сайт.
          </h2>

          {STEPS.map((s, i) => (
            <div key={i} data-reveal className="hp-step" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div style={{ width: 52, flexShrink: 0, paddingTop: 3 }}>
                <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#B07D2E', letterSpacing: '.06em' }}>{s.n}</span>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{s.head}</h3>
                <p style={{ fontSize: 16, color: '#78716C', margin: 0, lineHeight: 1.67 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section
        style={{ background: '#FAF8F5', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="feat-h"
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="hp-label">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
            Функции
          </div>

          <h2 id="feat-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 52 }}>
            Всичко, от което<br />се нуждае твоят бранд.
          </h2>

          <div className="hp-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} data-reveal className="hp-feat-card" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="hp-feat-icon">
                  <f.Icon />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B07D2E', marginBottom: 10 }}>
                  {f.label}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{f.head}</h3>
                <p style={{ fontSize: 14, color: '#78716C', lineHeight: 1.74, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUE STATEMENTS ────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {[
            { line: 'Твоят сайт за 15 минути.',               note: null,                 brass: false },
            { line: 'Клиентите записват директно при теб.',    note: null,                 brass: false },
            { line: 'Нито стотинка комисионна.',               note: 'Никога. За нищо.',   brass: true  },
          ].map((item, i) => (
            <div key={i} data-reveal className="hp-value-line" style={{ transitionDelay: `${i * 0.1}s` }}>
              <p
                className="font-display"
                style={{ fontSize: 'clamp(26px,5vw,60px)', fontWeight: 700, margin: 0, letterSpacing: '-0.033em', lineHeight: 1.06, color: item.brass ? '#B07D2E' : '#1C1917' }}
              >
                {item.line}
              </p>
              {item.note && <p style={{ fontSize: 'clamp(14px,1.4vw,17px)', color: '#A8A29E', marginTop: 8 }}>{item.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section
        style={{ background: '#FAF8F5', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="pricing-h"
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="hp-label">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
            Цени
          </div>

          <h2 id="pricing-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12 }}>
            Прозрачни цени.<br />Без изненади.
          </h2>
          <p data-reveal style={{ fontSize: 'clamp(15px,1.5vw,17px)', color: '#78716C', marginBottom: 52, lineHeight: 1.67 }}>
            Годишна такса. Без комисионна. Без скрити разходи.
          </p>

          <div className="hp-pricing-grid">
            {PLANS.map((plan, i) => (
              <div key={plan.id} data-reveal className={`hp-price-card${plan.popular ? ' popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: '#B07D2E', color: '#FAF8F5', borderRadius: 9999,
                      padding: '4px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                    aria-label="Най-популярен план"
                  >
                    Най-популярен
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.025em' }}>{plan.name}</h3>
                  <p style={{ fontSize: 14, color: '#78716C', margin: 0 }}>{plan.desc}</p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>{plan.price} €</span>
                  <span style={{ fontSize: 14, color: '#78716C', marginLeft: 4 }}>/ год.</span>
                  <p style={{ fontSize: 13, color: '#A8A29E', margin: '6px 0 0' }}>от {plan.daily} € на ден</p>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 28 }}>
                  {PLAN_FEATURES.map((f, fi) => (
                    <div key={fi} className="hp-check">
                      <IconCheck />
                      {f}
                    </div>
                  ))}
                </div>

                <Link
                  href="/create"
                  className={`hp-btn ${plan.popular ? 'hp-btn-ink' : 'hp-btn-ghost'}`}
                  style={{ textAlign: 'center', width: '100%', padding: '14px 0', fontSize: 15 }}
                >
                  Избери {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section
        style={{ background: '#1C1917', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)', textAlign: 'center' }}
        aria-labelledby="cta-h"
      >
        <div data-reveal style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 id="cta-h" className="font-display" style={{ fontSize: 'clamp(30px,5vw,58px)', fontWeight: 700, letterSpacing: '-0.033em', lineHeight: 1.1, color: '#FAF8F5', marginBottom: 20 }}>
            Готов ли си да спреш<br />да даваш % на другите?
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: 'rgba(250,248,245,.52)', marginBottom: 44, lineHeight: 1.67 }}>
            Нужни ти са само: Салон + Град + Имейл.<br />
            30 секунди и виждаш твоя сайт.
          </p>
          <Link href="/create" className="hp-btn hp-btn-brass">
            Стартирай сега
          </Link>
          <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(250,248,245,.28)' }}>
            от 0.82 € / ден · без скрити такси · без комисионна
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: '#1C1917', borderTop: '1px solid rgba(250,248,245,.07)', padding: 'clamp(28px,4vw,44px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'rgba(250,248,245,.45)', letterSpacing: '-0.03em' }}>
            clicka.bg
          </span>
          <p style={{ fontSize: 13, color: 'rgba(250,248,245,.25)', margin: 0 }}>
            © {new Date().getFullYear()} clicka.bg · Всички права запазени
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Phone Mockup Component
═══════════════════════════════════════════════════════════ */
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 290 }}>
      {/* Floating notification: new booking */}
      <div
        className="hp-notif"
        style={{ top: -18, right: -50 }}
        role="img"
        aria-label="Уведомление: нова резервация"
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block', flexShrink: 0, animation: 'blink 2s infinite' }} />
        Нова резервация!
      </div>

      {/* Floating notification: new review */}
      <div
        className="hp-notif hp-notif-b"
        style={{ bottom: 60, left: -52 }}
        role="img"
        aria-label="Уведомление: нова Google оценка"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#B07D2E" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        4.9 нова Google оценка
      </div>

      {/* Phone shell */}
      <div
        style={{
          background: '#1C1917', borderRadius: 44, padding: 10,
          boxShadow: '0 36px 90px rgba(28,25,23,.24), 0 10px 28px rgba(28,25,23,.14)',
        }}
        className="hp-phone-wrap"
      >
        {/* Dynamic island */}
        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 96, height: 22, background: '#0A0908', borderRadius: 9999 }} />
        </div>

        {/* Screen */}
        <div style={{ background: '#FAF8F5', borderRadius: 36, overflow: 'hidden', height: 510 }}>
          {/* Cover / hero of salon site */}
          <div style={{ background: '#1C1917', height: 160, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '0 20px 18px' }}>
            {/* Salon logo */}
            <div style={{ position: 'absolute', top: 18, left: 18, width: 44, height: 44, borderRadius: 12, background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 3h12a2 2 0 0 1 2 2v1a2 2 0 0 0-2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 0-2-2V5a2 2 0 0 1 2-2z"/>
                <path d="M12 12v9M9 15h6"/>
              </svg>
            </div>
            <div>
              <p style={{ color: '#FAF8F5', fontWeight: 700, fontSize: 17, margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>Салон Мими</p>
              <p style={{ color: 'rgba(250,248,245,.5)', fontSize: 12, margin: 0 }}>Фризьорски салон · София</p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* CTA */}
            <div style={{ background: '#1C1917', borderRadius: 12, padding: '13px', color: '#FAF8F5', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
              Резервирай час →
            </div>

            {/* Services */}
            {[
              { name: 'Подстригване', price: '25 €', dur: '45 мин' },
              { name: 'Боядисване',   price: '60 €', dur: '120 мин' },
            ].map((svc, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E7E5E4' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{svc.name}</p>
                  <p style={{ color: '#78716C', fontSize: 11, margin: 0 }}>{svc.dur}</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#B07D2E' }}>{svc.price}</span>
              </div>
            ))}

            {/* Stars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: 2 }}>
              {[1,2,3,4,5].map(n => (
                <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill="#B07D2E" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              <span style={{ fontSize: 11, color: '#78716C', marginLeft: 5 }}>4.9 (127 ревюта)</span>
            </div>
          </div>
        </div>

        {/* Home bar */}
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 80, height: 4, background: 'rgba(250,248,245,.25)', borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  );
}
