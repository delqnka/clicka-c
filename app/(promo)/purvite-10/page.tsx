import type { Metadata } from 'next';
import Link from 'next/link';
import VideoPlayer from './VideoPlayer';
import FeaturesList from './FeaturesList';
import FaqList from './FaqList';

export const revalidate = 60; // refresh counter every minute

export const metadata: Metadata = {
  title: 'Само за първите 10 бизнеса | clicka.bg',
  description:
    'Собствен сайт с онлайн резервации, AI рецепционист и 0% комисионна. 299 € / година — само за първите 10 бизнеса. Запазваш тази цена завинаги.',
  alternates: { canonical: 'https://www.clicka.bg/purvite-10' },
  openGraph: {
    title: 'Само за първите 10 бизнеса | clicka.bg',
    description: 'Собствен сайт с онлайн резервации. 299 € / година — запазваш тази цена завинаги.',
    url: 'https://www.clicka.bg/purvite-10',
    type: 'website',
  },
  robots: { index: false, follow: false }, // не индексираме промо страницата
};

async function getSlots(): Promise<{ remaining: number; total: number; used: number }> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/purvite10-slots`, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    return res.json();
  } catch {
    return { remaining: 10, total: 10, used: 0 };
  }
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
      <defs>
        <linearGradient id="chk-p10" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e11d48" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M20 6L9 17l-5-5" stroke="url(#chk-p10)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES = [
  'Собствен сайт',
  'Онлайн резервации 24/7',
  'AI рецепционист',
  'Онлайн чат с клиенти',
  'Управление през Telegram',
  'Собствен домейн',
  'Google ревюта в сайта',
  'Онлайн депозити и плащания (Stripe)',
  'Имейл известия',
  'Имейл напомняния към клиентите и теб',
  'Meta Pixel + Google Analytics',
  'Собствена клиентска база',
  'Неограничени посещения',
  '100% автоматизиран процес',
  'Събиране на ревюта към Google профила ти',
  '0% комисионна',
];

const PROFESSIONS = [
  'Фризьори', 'Барбъри', 'Маникюристи', 'Козметици',
  'Масажисти', 'Груумъри', 'Татуисти', 'Гримьори',
  'Терапевти', 'Консултанти', 'Треньори',
];

const FAQ = [
  { q: 'Получавам ли собствен сайт?', a: 'Да. Сайтът е изцяло за твоя бизнес и твоя бранд.' },
  { q: 'Мога ли да използвам собствен домейн?', a: 'Да. Можеш да свържеш собствен домейн по всяко време.' },
  { q: 'Има ли комисионна върху резервациите?', a: 'Не. Запазваш 100% от приходите си.' },
  { q: 'Колко време отнема?', a: 'Сайтът е готов веднага след регистрация.' },
  { q: 'Мога ли да приемам депозити онлайн?', a: 'Да. Плащанията постъпват директно в твоя Stripe акаунт.' },
  { q: 'Как работят онлайн депозитите и плащанията?', a: 'Използваме Stripe — водещата платежна платформа в света. Нужен ти е безплатен Stripe акаунт (5 мин. регистрация). Парите от депозити и плащания постъпват директно в твоята банкова сметка. Ние не докосваме приходите ти.' },
  { q: 'Запазвам ли цената и след 1 година?', a: 'Да. Първите 10 бизнеса запазват тази цена завинаги — независимо от бъдещи увеличения.' },
];

export default async function Purvite10Page() {
  const { remaining, total, used } = await getSlots();
  const isSoldOut = remaining === 0;

  const ctaHref = isSoldOut
    ? '/create'
    : `/create-p10?plan=solo_12m&ref=purvite10`;

  const grad: React.CSSProperties = {
    backgroundImage: 'linear-gradient(135deg, #db2777 0%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a', lineHeight: 1.6, background: '#fff', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        .p10-pulse {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          display: inline-block;
          flex-shrink: 0;
          animation: pulse-dot 1.6s ease-in-out infinite;
        }
        .p10-cta {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .p10-cta:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 32px rgba(225,29,72,0.45), 0 2px 8px rgba(168,85,247,0.25) !important;
          filter: brightness(1.08);
        }
        .p10-cta:active {
          transform: translateY(0) scale(0.98);
          filter: brightness(0.96);
        }
        .p10-demo-link {
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .p10-demo-link:hover {
          border-color: transparent !important;
          box-shadow: 0 0 0 1.5px #db2777, 0 0 12px rgba(225,29,72,0.30), 0 0 20px rgba(168,85,247,0.25);
        }
        .p10-footer-link {
          transition: opacity 0.15s ease;
        }
        .p10-footer-link:hover {
          background: linear-gradient(135deg, #e11d48, #db2777, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>


      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 680, margin: '0 auto' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 800, ...grad }}>clicka.bg</span>
        </Link>
        {!isSoldOut && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', background: 'transparent', padding: '4px 12px', borderRadius: 9999, border: '1px solid #e5e7eb', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="p10-pulse" />
            Остават <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>{remaining < 10 ? remaining : 6}</span> места
          </span>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,8vw,80px) 24px clamp(40px,6vw,64px)' }}>

        {/* Eyebrow */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#e11d48', marginBottom: 20 }}>
          Стартирахме с първите {total} бизнеса
        </p>

        <h1 style={{ fontSize: 'clamp(42px,10vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 20, letterSpacing: '-0.03em' }}>
          Спри да наемаш място<br />в чужди платформи.<br />
          <span style={{ ...grad, fontSize: '0.75em' }}>Клиентите резервират директно при теб.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#1a1a1a', fontWeight: 700, marginBottom: 12, lineHeight: 1.7 }}>
          Когато някой те потърси онлайн, трябва да намери теб.
        </p>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
          <strong style={{ color: '#1a1a1a' }}>Не</strong> каталог.{' '}
          <strong style={{ color: '#1a1a1a' }}>Не</strong> посредник.{' '}
          <strong style={{ color: '#1a1a1a' }}>Не</strong> конкурентите ти.
        </p>
        <p style={{ fontSize: 'clamp(28px,6vw,48px)', fontWeight: 900, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em' }}>
          <span style={{ backgroundImage: 'linear-gradient(90deg, #e11d48 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block', paddingRight: 4 }}>Теб.</span>
        </p>
        <p style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#6b7280', marginBottom: 20 }}>с твоя:</p>

        {/* 3 quick bullets before price card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {['Собствен сайт', 'Онлайн резервации', 'Собствена клиентска база'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check />
              <span style={{ fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#1a1a1a' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Promo card */}
        <div style={{
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#fff,#fff), linear-gradient(135deg,#e11d48,#a855f7)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderRadius: 20,
          padding: 'clamp(24px,4vw,36px)',
          marginBottom: 40,
          boxShadow: '0 2px 0 rgba(255,255,255,0.9) inset, 0 8px 24px rgba(225,29,72,0.14), 0 24px 48px rgba(168,85,247,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {/* Slots counter — show only after first real sale */}
          {!isSoldOut && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="p10-pulse" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                Остават <span style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{remaining < 10 ? remaining : 6}</span> от {total} места
              </span>
            </div>
          )}
          {isSoldOut && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>Промо местата са запълнени</span>
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 'clamp(38px,6vw,56px)', fontWeight: 900, letterSpacing: '-0.03em', ...grad }}>299 €</span>
            <span style={{ fontSize: 16, color: '#6b7280', marginLeft: 8 }}>/ година</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'inline-block', backgroundImage: 'linear-gradient(135deg, #e11d48, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>По-малко от 0.82 € на ден</p>

          {!isSoldOut && (
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 24 }}>
              🔥 Първите {total} бизнеса запазват тази цена завинаги.
            </p>
          )}

          <a
            href={ctaHref}
            className="p10-cta"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px 32px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #e11d48, #a855f7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 20px rgba(225,29,72,0.30)',
            }}
          >
            {isSoldOut ? 'Виж другите планове' : 'Създай своя сайт'}
          </a>
          {!isSoldOut && (
            <p style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', textAlign: 'center', marginTop: 12, marginBottom: 0, whiteSpace: 'nowrap' }}>
              ⚡ Плащаш. Получаваш сайта си веднага.
            </p>
          )}

        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px,5vw,42px)', fontWeight: 900, marginBottom: 24, letterSpacing: '-0.03em', color: '#1a1a1a', lineHeight: 1.15 }}>
            Ако утре платформата вдигне още %-а, какво ще правиш <span style={{ color: '#e11d48', fontSize: '1.3em' }}>?</span>
          </h2>
          <p style={{ fontSize: 15, color: '#4b5563', marginBottom: 20, lineHeight: 1.8 }}>
            Много специалисти изграждат бизнеса си върху чужди платформи.
            Плащат такси. Събират ревюта. Водят клиенти. Изграждат доверие.
            <strong style={{ color: '#1a1a1a' }}> Но не притежават нищо от това.</strong>
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              'Платформата притежава клиентите.',
              'Платформата притежава ревютата.',
              'Платформата контролира правилата.',
              'Платформата решава какво виждат клиентите.',
              'Платформата понякога решава и какви да са цените на услугите ти.',
              'Платформата взема тлъст % от труда ти.',
            ].map((line) => (
              <p key={line} style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#e11d48', flexShrink: 0, lineHeight: '1.6' }}>✗</span> {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── BELIEF ──────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(32px,5vw,48px) 24px', textAlign: 'center' }}>
        <p style={{
          fontSize: 'clamp(15px,2.5vw,20px)',
          fontWeight: 700,
          lineHeight: 1.5,
          letterSpacing: '-0.01em',
          backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
          marginBottom: 12,
        }}>
          Не харесваме комисионните.
        </p>
        <p style={{
          fontSize: 'clamp(24px,5vw,40px)',
          fontWeight: 900,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
        }}>
          Клиентът е твой.<br />И приходът трябва да е твой!
        </p>
        <div style={{ marginTop: 28 }}>
          <a
            href={ctaHref}
            className="p10-cta"
            style={{
              display: 'inline-block',
              padding: '13px 32px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #e11d48, #a855f7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(225,29,72,0.28)',
            }}
          >
            Създай своя сайт
          </a>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>⚡ Плащаш. Получаваш сайта си веднага.</p>
        </div>
      </section>

      {/* ── SOLUTION ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <h2 style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Нека, когато инвестираш в бизнеса си, резултатите остават при теб
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32 }}>Всеки нов клиент идва в твоя сайт, не в чужда платформа.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            'Всеки нов клиент резервира директно през твоя сайт.',
            'Всеки нов клиент влиза в твоята клиентска база.',
            'Всяко ново Google ревю работи за твоя бизнес.',
            'Всяка реклама води към твоя бранд.',
            'Всяко посещение изгражда твоята репутация. Не чужда.',
          ].map((line) => (
            <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Check />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 28, letterSpacing: '-0.01em', backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}>
            Компилирахме всичко необходимо за бизнес с резервации:
          </h2>
          <FeaturesList />
        </div>
      </section>

      {/* ── VIDEO DEMO ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(40px,6vw,64px) 24px 0' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ▶️ Виж как изглежда сайта и как клиент резервира час.
        </p>
        <VideoPlayer />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a
            href="https://salonurban.online"
            target="_blank"
            rel="noopener noreferrer"
            className="p10-demo-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 400,
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: 9999,
              padding: '4px 12px',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Посети сайта
          </a>
        </div>
      </section>

      {/* ── AI RECEPTIONIST ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.01em' }}>
          В сайта ти работи AI рецепционист
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 20, lineHeight: 1.8 }}>
          Докато работиш. Докато си зает. Докато спиш. Докато си на почивка.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {['Отговаря на въпроси', 'Препоръчва услуги', 'Записва резервации', 'Насочва клиентите', 'Работи 24 часа в денонощието'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check />
              <span style={{ fontSize: 14, color: '#374151' }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
          <img src="/tg-new-booking.jpg" alt="Нова резервация в Telegram" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </section>

      {/* ── TELEGRAM ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 12 }}>
            Управляваш сайта си директно от Telegram
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 20 }}>Без нови приложения. Без сложни панели. Без обучение.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {['Добавяш услуги от снимка', 'Качваш снимки', 'Променяш работно време', 'Следиш резервации', 'Променяш резервации', 'Създаваш резервации', 'Отговаряш на клиентите, които пишат на сайта', 'Всичко от телефона си'].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check />
                <span style={{ fontSize: 14, color: '#374151' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TELEGRAM SCREENSHOTS ────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src="/Untitled design 2.PNG"
              alt="Управление от телефона"
              style={{ width: '100%', maxWidth: 420, height: 'auto', display: 'inline-block' }}
            />
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <h2 style={{ fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Работиш с клиенти по часове?
        </h2>
        <p style={{ fontSize: 15, color: '#4b5563', marginBottom: 28, lineHeight: 1.8 }}>
          Тази сайт ще улесни &ldquo;живота ти&rdquo; в пъти, защото не е просто сайт, а твоят нов асистент.
        </p>
        <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
          {PROFESSIONS.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{p}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.7, marginBottom: 28 }}>
          И всеки друг специалист, който работи с резервации.
        </p>
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', maxWidth: 400 }}>
          <img src="/tg-client-stats.jpg" alt="Статистика за клиент в Telegram" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </section>

      {/* ── FINAL OFFER ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          {!isSoldOut ? (
            <>
              <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>
                <span style={grad}>299 € / година</span>
              </h2>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                🔥 Първите {total} бизнеса запазват тази цена завинаги.
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="p10-pulse" />
                <span>Остават <span style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a' }}>{remaining < 10 ? remaining : 6}</span> места.</span>
              </p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 32 }}>
                След запълване на местата новите регистрации ще бъдат по актуалните цени.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, marginBottom: 16 }}>
                Когато някой те потърси онлайн, трябва да намери теб.
              </h2>
            </>
          )}

          <a
            href={ctaHref}
            className="p10-cta"
            style={{
              display: 'inline-block',
              padding: '16px 48px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #e11d48, #a855f7)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(225,29,72,0.25)',
              marginBottom: 12,
            }}
          >
            {isSoldOut ? 'Виж другите планове' : 'Създай своя сайт'}
          </a>
          {!isSoldOut && (
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 16, marginTop: 0 }}>
              ⚡ Плащаш. Получаваш сайта си веднага.
            </p>
          )}

          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Имаш екип?{' '}
            <Link href="/pricing" style={{ textDecoration: 'none', fontWeight: 600, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Виж планове за до 3 специалисти →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 28 }}>Често задавани въпроси</h2>
        <FaqList items={FAQ} />
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px' }}>
          © 2025 „Буука" ЕООД · clicka.bg ·{' '}
          <a href="mailto:support@clicka.bg" style={{ color: '#9ca3af', textDecoration: 'none' }}>support@clicka.bg</a>
        </p>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
          <Link href="/privacy" className="p10-footer-link" style={{ color: '#9ca3af', textDecoration: 'none' }}>Поверителност</Link>
          {' · '}
          <Link href="/terms" className="p10-footer-link" style={{ color: '#9ca3af', textDecoration: 'none' }}>Условия</Link>
          {' · '}
          <Link href="/cookies" className="p10-footer-link" style={{ color: '#9ca3af', textDecoration: 'none' }}>Бисквитки</Link>
          {' · '}
          <Link href="/" className="p10-footer-link" style={{ color: '#9ca3af', textDecoration: 'none' }}>Начало</Link>
        </p>
      </footer>

    </div>
  );
}
