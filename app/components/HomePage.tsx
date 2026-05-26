'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ClickaHero } from '@/components/ui/clicka-hero';

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

const WHY_US = [
  {
    title: 'Край на заробващите проценти',
    body: 'Не е честно да даваш огромен процент от трудно изработените си пари на външни платформи за всеки доведен клиент. Плащаш фиксиран абонамент и точка. Твоите клиенти и твоите приходи са си 100% твои!',
  },
  {
    title: 'Без притеснения по телефона',
    body: 'Не е редно и да те притесняват по телефона, за да даваш обяснения за всеки клиент, който е резервирал онлайн час при теб!',
  },
  {
    title: 'Светкавични известия във Telegram',
    body: 'Забрави за пропуснатите имейли или скъпите SMS-и. Всяка нова резервация или промяна на час идва като мигновено съобщение директно във Telegram на телефона ти. Винаги знаеш графика си в реално време.',
  },
  {
    title: 'Минималистична визия от световно ниво, но с ТВОЯ бранд',
    body: 'Клиентите ти получават същото бързо, удобно и красиво изживяване при резервация, с което са свикнали в големите платформи. Разликата? Сайтът е изцяло твой и е на твоя личен домейн, който е собственост на твоята фирма.',
  },
  {
    title: 'Google те обича (100/100 SEO)',
    body: 'Погрижихме се за перфектното ти локално присъствие. Нашите сайтове постигат максимален резултат за скорост и SEO. Когато някой в твоя град напише в Google услугата, която предлагаш, твоят бизнес ще излиза на първа линия пред конкуренцията.',
  },
  {
    title: 'Твоите ревюта са си твоя собственост',
    body: 'Няма смисъл да трупаш стотици петзвездни оценки в профил на чужда платформа, от която утре можеш да бъдеш изтрит. Твоите ревюта се синхронизират автоматично от твоя Google My Business профил, което допълнително вдига рейтинга ти в търсачката и излизаш по-напред в Google.',
  },
  {
    title: 'Умно събиране на отзиви, което работи за теб',
    body: 'Знаем колко е досадно да напомняш на клиентите да ти пишат отзиви. Затова го правим вместо теб! След резервацията им изпращаме имейл с директен линк за оценка в твоя Google профил! Така трупаш легитимни ревюта в Google, които веднага се визуализират на сайта ти и привличат следващите ти клиенти.',
  },
  {
    title: 'Всичко включено (без скрити такси)',
    body: 'Получаваш сайт, резервационна система и хостинг на едно място. Не плащаш нищо допълнително за сървъри и поддръжка — всичко е включено в цената.',
  },
  {
    title: 'Супер бърз старт за минути',
    body: 'Няма нужда да чакаш месеци. Твоят сайт е готов за работа веднага, за да започнеш да приемаш часове още днес.',
  },
  {
    title: 'Пълна независимост без програмисти',
    body: 'Големите платформи утре могат да вдигнат таксите си двойно. С твоя собствен сайт ти си шефът. Системата е толкова проста и модерна, че можеш сам да променяш цени, услуги и работно време директно от телефона си — без да плащаш на скъпи програмисти.',
  },
  {
    title: 'Добавяш услугите си за секунди (снимка и готово!)',
    body: 'Забрави за досадното писане на цени и услуги една по една. Просто снимай настоящия си хартиен ценоразпис или меню, качи снимката и те автоматично влизат в системата ти за резервации!',
  },
  {
    title: '0 лв. такса за имейл известия към клиентите',
    body: 'Твоите клиенти получават напълно безплатни имейли за потвърждение на часа, напомняния и промени. Грижата за тяхното удобство не ти струва нищо.',
  },
  {
    title: 'Опция за SMS известия',
    body: 'Искаш клиентите ти да получават напомняне с класически SMS на телефона си, за да не изпускат часове? Можеш да го включиш по всяко време.',
  },
  {
    title: 'Законова изрядност без главоболия (GDPR и общи условия)',
    body: 'Погрижихме се сайтът ти да бъде напълно законен. В контролния панел сме ти подготвили готови и лесни за попълване автоматизирани секции за общи условия, политика за поверителност и GDPR правила. Без нужда от скъпи консултации с адвокати — просто въвеждаш данните си и си напълно спокоен при проверки!',
  },
  {
    title: 'Създаден първо за телефони (Mobile-First)',
    body: 'Над 90% от твоите клиенти ще си запазват час през мобилния си телефон. Затова сайтът от Clicka.bg е проектиран първо за смартфони. Сайтът ти ще зарежда светкавично бързо, ще изглежда перфектно на всеки екран и запазването на час ще става с няколко докосвания — без досадно приближаване и лутане.',
  },
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
   Scoped CSS — warm minimal, NO dark backgrounds in hero/features
═══════════════════════════════════════════════════════════ */
const CSS = `
  /* ── Keyframes ─────────────────────────────── */
  @keyframes mq    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

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

  /* ── Step ──────────────────────────────────── */
  .hp-step {
    display:flex; gap:28px; align-items:flex-start;
    padding:34px 0; border-bottom:1px solid #E7E5E4;
  }
  .hp-step:last-child { border-bottom:none; }

  /* ── Pricing grid ──────────────────────────── */
  .hp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 16px;
  }
  @media (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr; } }
  @media (min-width:640px) and (max-width:900px) { .hp-pricing-grid { grid-template-columns: 1fr 1fr; } }

  /* ── Why us list ───────────────────────────── */
  .hp-why-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }
  .hp-why-item {
    background: #fff;
    border: 1px solid #E7E5E4;
    border-radius: 18px;
    padding: 22px 26px;
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .hp-why-item:hover { border-color: #D6D3D1; box-shadow: 0 6px 20px rgba(28,25,23,.06); }
  .hp-why-item h3 {
    font-size: clamp(16px,1.8vw,18px);
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
    line-height: 1.35;
  }
  .hp-why-item p {
    font-size: 15px;
    color: #78716C;
    line-height: 1.72;
    margin: 0;
  }

  /* ── SEO split section ─────────────────────── */
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
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #E7E5E4;
    box-shadow: 0 24px 64px rgba(28,25,23,.1);
    background: #fff;
  }
  .hp-seo-benefit {
    padding: 18px 0;
    border-bottom: 1px solid #E7E5E4;
  }
  .hp-seo-benefit:last-child { border-bottom: none; padding-bottom: 0; }
  .hp-seo-benefit:first-child { padding-top: 0; }

  /* ── Misc ──────────────────────────────────── */
  .hp-check { display:flex; align-items:center; gap:10px; font-size:14px; color:#44403C; line-height:1.5; padding:4px 0; }

  /* ── Reduced motion ────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    [data-reveal]     { opacity:1; transform:none; transition:none; }
    .hp-mq            { animation:none; }
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
      <ClickaHero />

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

      {/* ── ЗАЩО ДА ИЗБЕРЕШ НАС ─────────────────────────────── */}
      <section
        style={{ background: '#FAF8F5', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="why-h"
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="hp-label">
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
            За кого е и защо го правим?
          </div>

          <h2 id="why-h" data-reveal className="font-display" style={{ fontSize: 'clamp(28px,4.2vw,50px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            Защо да избереш нас?
          </h2>

          <p data-reveal style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: '#44403C', lineHeight: 1.74, maxWidth: 760, marginBottom: 40, fontWeight: 500 }}>
            <strong style={{ fontWeight: 700, color: '#1C1917' }}>На 1-во място:</strong>{' '}
            Ние <strong style={{ fontWeight: 700 }}>НЕ</strong> сме резервационна платформа. Ние предлагаме на бизнеса ти
            собствен дигитален дом, с идея за максимално добро локално позициониране!
          </p>

          <div className="hp-why-list">
            {WHY_US.map((item, i) => (
              <article key={item.title} data-reveal className="hp-why-item" style={{ transitionDelay: `${(i % 6) * 0.05}s` }}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO 100/100 ─────────────────────────────────────── */}
      <section
        style={{ background: '#fff', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
        aria-labelledby="seo-h"
      >
        <div className="hp-seo-grid">
          <div>
            <div className="hp-label">
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#B07D2E', display: 'inline-block' }} />
              SEO резултат
            </div>

            <h2 id="seo-h" data-reveal className="font-display" style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.12, marginBottom: 20 }}>
              Постигни невъзможното:<br />100/100 SEO резултат
            </h2>

            <p data-reveal style={{ fontSize: 'clamp(15px,1.55vw,17px)', color: '#78716C', lineHeight: 1.74, marginBottom: 28 }}>
              Докато другите само говорят за SEO, ние го доказваме. Това е реалният резултат от теста на Google Lighthouse
              за нашия демо сайт — перфектна оценка от 100 от 100 за SEO оптимизация. Това означава, че сайтът ти е
              технически безупречен в очите на Google. Това е твоят билет за предна линия в локалното търсене.
            </p>

            <p data-reveal style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', marginBottom: 8, letterSpacing: '-0.01em' }}>
              Какво получаваш с този перфектен резултат?
            </p>

            <div data-reveal>
              {SEO_BENEFITS.map((b) => (
                <div key={b.title} className="hp-seo-benefit">
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{b.title}</h3>
                  <p style={{ fontSize: 15, color: '#78716C', lineHeight: 1.68, margin: 0 }}>{b.body}</p>
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
        style={{ background: '#FAF8F5', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
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

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section
        style={{ background: '#fff', borderTop: '1px solid #E7E5E4', padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,60px)' }}
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

