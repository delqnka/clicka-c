'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BouncyCardsFeatures } from '@/components/ui/bouncy-cards-features';
import { ClickaHero } from '@/components/ui/clicka-hero';

function IconCheck({ color = 'var(--primary)' }: { color?: string }) {
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

const SEO_BENEFITS = [
  {
    title: 'Техническо предимство',
    body: 'Google разбира, че сайтът ти е бърз, сигурен и добре структуриран, което автоматично му дава предимство. Как това ти носи нови клиенти?',
  },
  {
    title: 'Безплатни посещения',
    body: 'Получаваш безплатен трафик от хора, които вече активно търсят твоите услуги.',
  },
  {
    title: 'Бързина, която продава',
    body: 'Високият SEO резултат означава и светкавично бърз сайт на телефона на клиента, което ги подтиква да направят резервация.',
  },
  {
    title: 'Гарантирано класиране',
    body: 'Твоят салон ще излиза много по-напред, когато някой в твоя град търси „фризьор в центъра“ или „добър козметик“.',
  },
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
   Scoped CSS — uses .hp theme tokens from globals.css
═══════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes mq { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

  .hp {
    font-family: var(--font-sans);
    background: var(--background);
    color: var(--foreground);
    overflow-x: hidden;
  }

  [data-reveal] {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1);
  }

  .font-display {
    font-family: var(--font-serif);
  }

  .hp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 64px;
    background: color-mix(in srgb, var(--background) 93%, transparent);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(16px, 5vw, 60px);
  }

  .hp-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border-radius: 9999px;
    font-family: inherit; font-size: 14px; font-weight: 500;
    text-decoration: none; cursor: pointer; white-space: nowrap;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .hp-btn:focus-visible { outline: 3px solid var(--ring); outline-offset: 3px; }

  .hp-btn-ink {
    background: var(--primary); color: var(--primary-foreground); border: none;
    padding: 12px 28px;
    box-shadow: var(--hp-shadow);
  }
  .hp-btn-ink:hover { transform: translateY(-1px); box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 35%, transparent); }

  .hp-btn-ghost {
    background: var(--card); color: var(--foreground); border: 1.5px solid var(--border);
    padding: 11px 28px;
  }
  .hp-btn-ghost:hover { border-color: var(--ring); box-shadow: var(--hp-shadow); }

  .hp-btn-primary {
    background: var(--primary); color: var(--primary-foreground); border: none;
    padding: 18px 52px;
    box-shadow: 0 4px 24px color-mix(in srgb, var(--primary) 35%, transparent);
    font-size: 17px; font-weight: 700;
  }
  .hp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px color-mix(in srgb, var(--primary) 45%, transparent); }

  .hp-label {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--muted-foreground); margin-bottom: 16px;
  }

  .hp-mq { display:flex; animation:mq 36s linear infinite; width:max-content; }
  .hp-mq-wrap {
    overflow:hidden; position:relative;
    border-top:1px solid var(--border); border-bottom:1px solid var(--border);
    padding:17px 0; background:var(--card);
  }
  .hp-mq-wrap::before,.hp-mq-wrap::after {
    content:''; position:absolute; top:0; bottom:0; width:100px; z-index:2; pointer-events:none;
  }
  .hp-mq-wrap::before { left:0; background:linear-gradient(to right,var(--card),transparent); }
  .hp-mq-wrap::after  { right:0; background:linear-gradient(to left,var(--card),transparent); }

  .hp-price-card {
    background: var(--card);
    border: 1.5px solid var(--border);
    border-radius: calc(var(--radius) * 3);
    padding: 36px 28px;
    display: flex; flex-direction: column;
    position: relative;
    transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
  }
  .hp-price-card:hover { transform: translateY(-5px); box-shadow: var(--hp-shadow); }
  .hp-price-card.popular {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary), 0 8px 32px color-mix(in srgb, var(--primary) 18%, transparent);
  }

  .hp-step {
    display:flex; gap:28px; align-items:flex-start;
    padding:34px 0; border-bottom:1px solid var(--border);
  }
  .hp-step:last-child { border-bottom:none; }

  .hp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 16px;
  }
  @media (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr; } }
  @media (min-width:640px) and (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr 1fr; } }

  .hp-seo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(32px, 5vw, 64px);
    align-items: center;
    max-width: 1100px;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    .hp-seo-grid { grid-template-columns: 1fr; }
    .hp-seo-visual { order: -1; }
  }
  .hp-seo-visual {
    position: relative;
    border-radius: calc(var(--radius) * 2.5);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--hp-shadow);
    background: var(--card);
  }
  .hp-seo-benefit {
    padding: 18px 0;
    border-bottom: 1px solid var(--border);
  }
  .hp-seo-benefit:last-child { border-bottom: none; padding-bottom: 0; }
  .hp-seo-benefit:first-child { padding-top: 0; }

  .hp-check {
    display:flex; align-items:center; gap:10px;
    font-size:14px; font-weight:400;
    color:var(--secondary-foreground);
    line-height:1.5; padding:4px 0;
  }

  .hp-section-alt { background: var(--background); }
  .hp-section-card { background: var(--card); border-top: 1px solid var(--border); }
  .hp-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--primary); display: inline-block; }

  @media (prefers-reduced-motion: reduce) {
    [data-reveal] { opacity:1; transform:none; transition:none; }
    .hp-mq { animation:none; }
  }
`;

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */
export default function HomePage() {
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
            style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--foreground)' }}>
            clicka.bg
          </span>
        </div>
        <Link href="/create" className="hp-btn hp-btn-ink" style={{ padding: '10px 22px', fontSize: 13 }}>
          Стартирай →
        </Link>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <ClickaHero />

      {/* ── MARQUEE ─────────────────────────────────────────── */}
      <div className="hp-mq-wrap" aria-hidden="true">
        <div className="hp-mq">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '0 26px', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}
            >
              <span className="hp-dot" style={{ flexShrink: 0 }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── ЗАЩО ДА ИЗБЕРЕШ НАС (bouncy cards) ───────────────── */}
      <div className="hp-section-alt" style={{ borderTop: '1px solid var(--border)' }}>
        <BouncyCardsFeatures />
      </div>

      {/* ── SEO 100/100 ─────────────────────────────────────── */}
      <section
        className="hp-section-card"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <div className="hp-label">
              <span className="hp-dot" />
              SEO резултат
            </div>

            <h2 id="seo-h" data-reveal className="font-display" style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.12, marginBottom: 20, color: 'var(--foreground)' }}>
              Постигни невъзможното:<br />100/100 SEO резултат
            </h2>

            <p data-reveal style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: 'var(--muted-foreground)', lineHeight: 1.74, marginBottom: 28 }}>
              Докато другите само говорят за SEO, ние го доказваме. Това е реалният резултат от теста на Google Lighthouse
              за нашия демо сайт — перфектна оценка от 100 от 100 за SEO оптимизация. Това означава, че сайтът ти е
              технически безупречен в очите на Google. Това е твоят билет за предна линия в локалното търсене.
            </p>

            <p data-reveal style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8, letterSpacing: '-0.01em' }}>
              Какво получаваш с този перфектен резултат?
            </p>

            <div data-reveal>
              {SEO_BENEFITS.map((b) => (
                <div key={b.title} className="hp-seo-benefit">
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{b.title}</h3>
                  <p style={{ fontSize: 15, fontWeight: 400, color: 'var(--muted-foreground)', lineHeight: 1.68, margin: 0 }}>{b.body}</p>
                </div>
              ))}
            </div>
          </div>

          <figure data-reveal className="hp-seo-visual">
            <Image
              src="/images/lighthouse-seo-100.webp"
              alt="Google Lighthouse SEO резултат 100 от 100 и мобилен сайт на салон — Google те обича, а с него и клиентите в твоя град"
              width={576}
              height={1024}
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              priority={false}
            />
          </figure>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section
        className="hp-section-alt"
        style={{ borderTop: '1px solid var(--border)', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="steps-h"
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="hp-label">
            <span className="hp-dot" />
            Как работи
          </div>

          <h2 id="steps-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 52, color: 'var(--foreground)' }}>
            Три стъпки до<br />твоя собствен сайт.
          </h2>

          {STEPS.map((s, i) => (
            <div key={i} data-reveal className="hp-step" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div style={{ width: 52, flexShrink: 0, paddingTop: 3 }}>
                <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: '.06em' }}>{s.n}</span>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{s.head}</h3>
                <p style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.67 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section
        className="hp-section-card"
        style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="pricing-h"
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="hp-label">
            <span className="hp-dot" />
            Цени
          </div>

          <h2 id="pricing-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12, color: 'var(--foreground)' }}>
            Прозрачни цени.<br />Без изненади.
          </h2>
          <p data-reveal style={{ fontSize: 'clamp(15px,1.5vw,17px)', fontWeight: 400, color: 'var(--muted-foreground)', marginBottom: 52, lineHeight: 1.67 }}>
            Годишна такса. Без комисионна. Без скрити разходи.
          </p>

          <div className="hp-pricing-grid">
            {PLANS.map((plan, i) => (
              <div key={plan.id} data-reveal className={`hp-price-card${plan.popular ? ' popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 9999,
                      padding: '4px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                    aria-label="Най-популярен план"
                  >
                    Най-популярен
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.025em', color: 'var(--foreground)' }}>{plan.name}</h3>
                  <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted-foreground)', margin: 0 }}>{plan.desc}</p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <span className="font-display" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--foreground)' }}>{plan.price} €</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 4 }}>/ год.</span>
                  <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground)', margin: '6px 0 0' }}>от {plan.daily} € на ден</p>
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
        style={{ background: 'var(--hp-cta-bg)', padding: 'clamp(80px,12vw,140px) clamp(20px,5vw,60px)', textAlign: 'center' }}
        aria-labelledby="cta-h"
      >
        <div data-reveal style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 id="cta-h" className="font-display" style={{ fontSize: 'clamp(30px,5vw,58px)', fontWeight: 700, letterSpacing: '-0.033em', lineHeight: 1.1, color: 'var(--hp-cta-fg)', marginBottom: 20 }}>
            Готов ли си да спреш<br />да даваш % на другите?
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.6vw,18px)', fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 55%, transparent)', marginBottom: 44, lineHeight: 1.67 }}>
            Нужни ти са само: Салон + Град + Имейл.<br />
            30 секунди и виждаш твоя сайт.
          </p>
          <Link href="/create" className="hp-btn hp-btn-primary">
            Стартирай сега
          </Link>
          <p style={{ marginTop: 20, fontSize: 13, fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 35%, transparent)' }}>
            от 0.82 € / ден · без скрити такси · без комисионна
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: 'var(--hp-cta-bg)', borderTop: '1px solid color-mix(in srgb, var(--hp-cta-fg) 12%, transparent)', padding: 'clamp(28px,4vw,44px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'color-mix(in srgb, var(--hp-cta-fg) 50%, transparent)', letterSpacing: '-0.03em' }}>
            clicka.bg
          </span>
          <p style={{ fontSize: 13, fontWeight: 400, color: 'color-mix(in srgb, var(--hp-cta-fg) 30%, transparent)', margin: 0 }}>
            © {new Date().getFullYear()} clicka.bg · Всички права запазени
          </p>
        </div>
      </footer>
    </div>
  );
}

