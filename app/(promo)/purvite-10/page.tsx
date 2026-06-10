import type { Metadata } from 'next';
import Link from 'next/link';
import VideoPlayer from './VideoPlayer';
import FeaturesList from './FeaturesList';
import FaqList from './FaqList';

export const revalidate = 60;

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
  robots: { index: false, follow: false },
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

function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
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
  { q: 'Колко е сложно? Трябват ли ми технически знания?', a: 'Не. Сайтът е готов веднага след регистрация. Управляваш всичко от Telegram — добавяш услуги, качваш снимки, следиш резервации. Без технически познания, без обучение.' },
  { q: 'Какво се случва след плащане?', a: 'Получаваш имейл с достъп до сайта си. Влизаш, попълваш услугите и работното си време — и сайтът е готов за клиенти. Целият процес отнема под 30 минути.' },
  { q: 'Получавам ли собствен сайт?', a: 'Да. Сайтът е изцяло за твоя бизнес и твоя бранд.' },
  { q: 'Мога ли да използвам собствен домейн?', a: 'Да. Можеш да свържеш собствен домейн по всяко време.' },
  { q: 'Има ли комисионна върху резервациите?', a: 'Не. Запазваш 100% от приходите си.' },
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

  const gradFull = 'linear-gradient(135deg, #e11d48, #a855f7)';

  return (
    <div style={{ fontFamily: 'var(--font-client-manrope), sans-serif', color: '#1a1a1a', lineHeight: 1.6, background: '#fff', minHeight: '100vh' }}>
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
        .p10-pain-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          background: #fff5f5;
          border: 1px solid #fee2e2;
        }
        .p10-testimonial {
          background: #fafafa;
          border: 1px solid #f0f0f0;
          border-radius: 16px;
          padding: 24px;
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
            Остават <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', margin: '0 3px' }}>{remaining < 10 ? remaining : 6}</span> места
          </span>
        )}
      </nav>

      {/* ── HERO — pain first ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(40px,7vw,72px) 24px clamp(32px,5vw,56px)' }}>

        <h1 style={{ marginBottom: 24, letterSpacing: '-0.03em' }}>
          <span style={{ display: 'block', fontSize: 'clamp(44px,11vw,80px)', fontWeight: 900, lineHeight: 1.05 }}>Умори ли се да плащаш,</span>
          <span style={{ display: 'block', fontSize: 'clamp(32px,8vw,58px)', fontWeight: 900, lineHeight: 1.1, ...grad }}>за да градиш чужд бизнес?</span>
        </h1>

        <p style={{ fontSize: 'clamp(20px,3.5vw,28px)', color: '#1a1a1a', marginBottom: 12, lineHeight: 1.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Клиентите идват заради теб. Заради работата ти. Заради доверието, което си изградил/а.
        </p>
        <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#6b7280', marginBottom: 28, lineHeight: 1.8 }}>
          Но значителна част от стойността на труда ти остава за платформата. Плащаш комисионни. Събираш ревюта там. Конкурираш се с десетки други специалисти на същата страница. Ти си просто позиция в един каталог.
        </p>

        {/* Pain points — grouped */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 36 }}>
          {[
            'Платформата взема тлъст % от труда ти.',
            'Дължиш комисионна за всеки клиент, когото сам си спечелил.',
            'Изграждаш чужд бранд вместо своя.',
            'Конкурираш се с десетки специалисти на една и съща страница.',
            'Клиентът сравнява теб с конкуренцията, още преди да те е избрал.',
            'Ако платформата промени правилата — просто трябва да се съобразиш.',
            'Клиентите, ревютата и историята остават при тях.',
            'Клиентът помни платформата, а не твоя бранд.',
            'Понякога се налага да даваш отчет по телефона за всеки клиент.',
          ].map((line) => (
            <div key={line} className="p10-pain-item">
              <span style={{ color: '#e11d48', fontWeight: 700, fontSize: 15, lineHeight: '1.6', flexShrink: 0 }}>✗</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.65 }}>{line}</span>
            </div>
          ))}
        </div>

        {/* Agitation question */}
        <div style={{ margin: '32px 0' }}>
          <p style={{ margin: 0, fontSize: 'clamp(22px,5vw,36px)', fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.02em', color: '#1a1a1a' }}>
            А какво ще направиш, ако утре увеличат <span style={{ color: '#e11d48', fontSize: '1.2em', lineHeight: 1 }}>%</span>-а още<span style={{ color: '#e11d48', fontSize: '1.6em', lineHeight: 1, marginLeft: '0.15em' }}>?</span>
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28, marginBottom: 0 }}>
          <p style={{ fontSize: 'clamp(18px,3.5vw,26px)', fontWeight: 800, lineHeight: 1.4, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Има по-добър начин.
          </p>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24, lineHeight: 1.7 }}>
            Собствен сайт. Собствени клиенти. 0% комисионна.
          </p>
          <a
            href={ctaHref}
            className="p10-cta"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: 9999,
              background: gradFull,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(225,29,72,0.28)',
            }}
          >
            {isSoldOut ? 'Виж другите планове' : 'Искам собствен сайт →'}
          </a>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
            ⚡ Плащаш. Получаваш сайта си веднага.
          </p>
        </div>
      </section>

      {/* ── DEMO — show it early ─────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(40px,6vw,64px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 6, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Виж как изглежда</p>
          <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 20, textAlign: 'center', letterSpacing: '-0.02em' }}>
            Собственият ти сайт изглежда така
          </h2>
          <VideoPlayer />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <a
              href="https://salonurban.online"
              target="_blank"
              rel="noopener noreferrer"
              className="p10-demo-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12,
                fontWeight: 500,
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: 9999,
                padding: '5px 14px',
                textDecoration: 'none',
              }}
            >
              Посети демо сайта ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF — testimonial ───────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 20, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Реален резултат</p>
        <div className="p10-testimonial">
          {/* Stars */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
            {[1,2,3,4,5].map((i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p style={{ fontSize: 'clamp(15px,2.2vw,18px)', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.65, marginBottom: 20 }}>
            &ldquo;Преди клиентите ме намираха само в Instagram и ме питаха за часове в Direct. Сега резервират директно от сайта — дори когато работя. Вечерта имам нови записани часове, без да съм пипала телефона.&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: gradFull,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>М</div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Мими</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Козметик · anibeauty.clicka.bg</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET — benefit-led ───────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Какво получаваш</p>
          <h2 style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Всичко необходимо за бизнес с резервации
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 28, lineHeight: 1.7 }}>
            Не само сайт. Цял дигитален асистент за твоя бизнес.
          </p>

          {/* 3 highlight cards */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
            {[
              {
                title: 'Резервации 24/7 — без теб',
                desc: 'Клиентите резервират сами по всяко време. Ти получаваш известие в Telegram.',
              },
              {
                title: 'AI рецепционист в сайта',
                desc: 'Отговаря на въпроси, препоръчва услуги, записва часове. Работи докато ти спиш.',
              },
              {
                title: '0% комисионна',
                desc: 'Приходите от депозити и плащания постъпват директно в твоята банкова сметка.',
              },
            ].map((card) => (
              <div key={card.title} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', flexShrink: 0, marginTop: 7 }} />
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{card.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <FeaturesList />
        </div>
      </section>

      {/* ── AI RECEPTIONIST ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI асистент</p>
        <h2 style={{ fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Докато работиш — сайтът работи за теб
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 20, lineHeight: 1.8 }}>
          Докато си зает с клиент. Докато спиш. Докато си на почивка.
          AI рецепционистът в сайта ти отговаря, записва и насочва.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {['Отговаря на въпроси за услугите и цените', 'Препоръчва подходящи услуги', 'Записва резервации вместо теб', 'Насочва клиентите към свободни часове', 'Работи 24 часа в денонощието, 7 дни в седмицата'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Check />
              <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
          <img src="/tg-new-booking.jpg" alt="Нова резервация в Telegram" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </section>

      {/* ── TELEGRAM ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Управление</p>
          <h2 style={{ fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Управляваш всичко от Telegram
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 20, lineHeight: 1.7 }}>
            Без нови приложения. Без сложни панели. Без обучение.<br />
            Само Telegram — и всичко е под контрол.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
            {[
              'Добавяш услуги от снимка',
              'Качваш снимки',
              'Променяш работно време',
              'Следиш резервации',
              'Създаваш резервации',
              'Отговаряш на клиентите',
              'Статистика за клиент',
              'Всичко от телефона ти',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Check size={12} />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <img
              src="/Untitled design 2.PNG"
              alt="Управление от телефона"
              style={{ width: '100%', maxWidth: 380, height: 'auto', display: 'inline-block' }}
            />
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>За кого е</p>
        <h2 style={{ fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Работиш с клиенти по часове?
        </h2>
        <p style={{ fontSize: 15, color: '#4b5563', marginBottom: 24, lineHeight: 1.8 }}>
          Clicka.bg е за всеки специалист, на когото клиентите записват час.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {PROFESSIONS.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={12} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{p}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', lineHeight: 1.7 }}>
          И всеки друг специалист, който работи с резервации.
        </p>
      </section>

      {/* ── OFFER / PRICE ────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px,7vw,72px) 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Офертата</p>

          {/* Gradient border card */}
          <div style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(#fff,#fff), linear-gradient(135deg,#e11d48,#a855f7)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            borderRadius: 24,
            padding: 'clamp(28px,5vw,44px)',
            boxShadow: '0 8px 40px rgba(225,29,72,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          }}>

            {/* Slots */}
            {!isSoldOut && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span className="p10-pulse" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  Остават <span style={{ fontSize: 20, fontWeight: 900 }}>{remaining < 10 ? remaining : 6}</span> от {total} промо места
                </span>
              </div>
            )}

            <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, marginBottom: 4, letterSpacing: '-0.02em' }}>
              Solo план — собствен сайт
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
              За 1 специалист. Всичко включено. Без скрити такси.
            </p>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 'clamp(42px,7vw,60px)', fontWeight: 900, letterSpacing: '-0.03em', ...grad }}>299 €</span>
              <span style={{ fontSize: 16, color: '#9ca3af', marginLeft: 8 }}>/ година</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'inline-block', backgroundImage: gradFull, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              По-малко от 0.82 € на ден
            </p>

            {!isSoldOut && (
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 28, paddingTop: 4 }}>
                Първите {total} бизнеса запазват тази цена завинаги.
              </p>
            )}

            {/* What's included */}
            <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
              {[
                'Собствен сайт с онлайн резервации',
                'AI рецепционист 24/7',
                'Управление от Telegram',
                'Собствен домейн (по избор)',
                'Онлайн депозити и плащания',
                '0% комисионна',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check />
                  <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={ctaHref}
              className="p10-cta"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '16px 32px',
                borderRadius: 9999,
                background: gradFull,
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 4px 24px rgba(225,29,72,0.30)',
                letterSpacing: '0.01em',
              }}
            >
              {isSoldOut ? 'Виж другите планове' : 'Създай своя сайт'}
            </a>

            <p style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              Плащаш. Получаваш сайта си веднага.
            </p>

            {/* Risk removal */}
            <div style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {[
                'Без договор и без обвързване',
                'Без скрити такси или комисионни',
                'Можеш да го спреш по всяко време',
              ].map((line) => (
                <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Check size={12} />
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{line}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Team plan nudge */}
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
            Имаш екип?{' '}
            <Link href="/pricing" style={{ textDecoration: 'none', fontWeight: 600, backgroundImage: gradFull, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Виж Team план за до 3 специалисти →
            </Link>
          </p>

        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(40px,6vw,64px) 24px' }}>
        <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.01em' }}>Имаш въпроси?</h2>
        <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 28 }}>Отговорихме на тези, които чуваме най-често.</p>
        <FaqList items={FAQ} />
        <div style={{ marginTop: 32, padding: '20px 24px', background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            Имаш друг въпрос?{' '}
            <a href="mailto:support@clicka.bg" style={{ color: '#e11d48', fontWeight: 600, textDecoration: 'none' }}>support@clicka.bg</a>
            {' '}— отговаряме в рамките на деня.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(40px,6vw,64px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p style={{
            fontSize: 'clamp(22px,4vw,34px)',
            fontWeight: 900,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            backgroundImage: gradFull,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
            marginBottom: 24,
          }}>
            Клиентът е твой.<br />И приходът трябва да е твой.
          </p>
          {!isSoldOut && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <span className="p10-pulse" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                Остават само <span style={{ fontWeight: 900 }}>{remaining < 10 ? remaining : 6}</span> места на 299 € / год.
              </span>
            </div>
          )}
          <a
            href={ctaHref}
            className="p10-cta"
            style={{
              display: 'inline-block',
              padding: '16px 48px',
              borderRadius: 9999,
              background: gradFull,
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(225,29,72,0.25)',
              marginBottom: 12,
            }}
          >
            {isSoldOut ? 'Виж другите планове' : 'Създай своя сайт'}
          </a>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>⚡ Плащаш. Получаваш сайта си веднага.</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '28px 24px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
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
