import Image from 'next/image';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { ButtonColorful } from '@/components/ui/button-colorful';
import FlowArt, { FlowSection } from '@/components/ui/flow-art';
import {
  MARKETING_AUDIENCE,
  MARKETING_COMPARISON,
  MARKETING_FEATURES,
  MARKETING_FOUNDER,
  MARKETING_STEPS,
} from '@/lib/marketing-home-copy';

const GRADIENT_HEADING = 'bg-clip-text text-transparent';
const GRADIENT_BG = { backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' } as const;

/* ── Audience marquee ─────────────────────────────────── */

const TAGS_ROW_1 = [
  'Фризьори', 'Козметици', 'Маникюристи', 'Бръснари',
  'Масажисти', 'Груумъри', 'Студия за красота',
];
const TAGS_ROW_2 = [
  'Барбършопове', 'Педикюристи', 'Стилисти', 'Визажисти',
  'Спа центрове', 'Терапевти', 'Салони',
];

const TAG_STYLES = [
  'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20',
  'border border-rose-200 bg-rose-50/80 text-rose-700',
  'border border-rose-300/50 bg-white text-rose-700',
] as const;

function MarqueeRow({ tags, duration = 30, reverse = false }: { tags: string[]; duration?: number; reverse?: boolean }) {
  const doubled = [...tags, ...tags];
  return (
    <div
      className="flex w-max gap-3"
      style={{
        animation: `${reverse ? 'aud-marquee-r' : 'aud-marquee'} ${duration}s linear infinite`,
      }}
    >
      {doubled.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide whitespace-nowrap ${TAG_STYLES[i % 3]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function MarketingAudienceSection() {
  return (
    <section
      id="audience"
      data-home-section="audience"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #fdf2f8 100%)', padding: 'clamp(56px,10vw,96px) clamp(20px,5vw,60px)', position: 'relative', marginTop: -8 }}
      aria-label="За кого е"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className={`text-balance text-[clamp(1.75rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          Всеки нов клиент става твой.
        </h2>
        <div className="mx-auto mt-4 max-w-lg space-y-2 leading-relaxed">
          <p className="text-[clamp(1rem,2.2vw,1.15rem)] font-semibold" style={{ color: '#1a1a1a' }}>
            В собствения ти сайт. В собствената ти клиентска база. Със собствения ти домейн.
          </p>
        </div>

        <p className={`mt-8 text-[0.7rem] leading-relaxed ${GRADIENT_HEADING}`} style={{ backgroundImage: 'linear-gradient(135deg, #db2777, #a855f7)' }}>
          {['Фризьори', 'Маникюристи', 'Козметици', 'Барбъри', 'Масажисти', 'Груумъри', 'Терапевти', 'Треньори', 'Консултанти', 'Гримьори', 'Татуисти'].join(' • ')}
        </p>
      </div>
      <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, #ffffff 40%, transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}

/* ── Feature flow config (pink/rose palette) ─────────── */

const FLOW_STYLE = [
  {
    bg: '#fff1f2',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.72)',
    line: 'rgba(255,241,242,0.9)',
    accent: '#be123c',
  },
  {
    bg: '#ffe4e6',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.72)',
    line: 'rgba(255,228,230,0.9)',
    accent: '#be123c',
  },
  {
    bg: '#fecdd3',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.78)',
    line: 'rgba(254,205,211,0.9)',
    accent: '#9f1239',
  },
  {
    bg: '#fda4af',
    fg: '#1a1a2e',
    sub: 'rgba(26,26,46,0.82)',
    line: 'rgba(253,164,175,0.9)',
    accent: '#881337',
  },
  {
    bg: '#fb7185',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.88)',
    line: 'rgba(251,113,133,0.9)',
    accent: '#fee2e2',
  },
  {
    bg: '#f43f5e',
    fg: '#fff',
    sub: 'rgba(255,255,255,0.88)',
    line: 'rgba(244,63,94,0.9)',
    accent: '#fee2e2',
  },
] as const;

const FLOW_HEADINGS = [
  'Онлайн\nрезервации',
  'Твоят\nдомейн',
  'Google\nревюта',
  'SEO\n100/100',
  'AI\nрецепционист',
  'От\nтелефона',
] as const;

/* ── Price list AI import section ────────────────────── */

export function PriceListImportSection() {
  return (
    <section
      aria-label="Качи ценоразпис"
      style={{
        background: '#fff',
        padding: 'clamp(48px,8vw,96px) clamp(20px,5vw,60px) clamp(96px,14vw,140px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,56px)' }}>
          {/* Losing clients? */}
          <div style={{ marginBottom: 'clamp(100px,16vw,160px)', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(16px,3vw,28px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Губиш клиенти без да го осъзнаваш.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Някой те намира в Google.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Разглежда работата ти. Харесва я.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Но не може да резервира веднага.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Трябва да ти пише и да чака отговор.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(24px,4vw,40px)' }}>
              И отива при следващия.
            </p>

            <p style={{ fontSize: 'clamp(26px,6vw,52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 'clamp(16px,3vw,24px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Колко клиенти си изпуснала тази седмица?
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Докато работиш.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Докато си в почивка.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)' }}>
              Докато спиш.
            </p>
            <p style={{ fontSize: 'clamp(22px,5vw,36px)', color: '#0f0f0f', marginBottom: 0, fontWeight: 700 }}>
              Сайтът работи дори, когато ти не работиш.
            </p>
          </div>

          {/* Messages all day? */}
          <div style={{ marginBottom: 'clamp(100px,16vw,160px)', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(16px,3vw,28px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Прекарваш деня си в съобщения?
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
              „Имате ли свободен час?"
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
              „Колко струва...?"
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)', fontStyle: 'italic' }}>
              „Може ли в събота?"
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Пишеш едни и същи отговори по 20 пъти на ден.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Докато работиш с клиент.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Докато шофираш.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)' }}>
              В 22:00 ч.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)' }}>
              И след всичко това, някои от тях пак не идват.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6, fontWeight: 700 }}>
              Ето решението:
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Клиентът вижда свободните часове и резервира сам.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)' }}>
              И ти плаща депозит, стига да активираш функцията.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Ти получаваш известие в Telegram.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              А той получава автоматични напомняния за часа си.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)' }}>
              Ако има въпрос, пише в чата на сайта. AI отговаря вместо теб.
            </p>
            <p style={{ fontSize: 'clamp(18px,4vw,24px)', color: '#0f0f0f', marginBottom: 0, fontWeight: 700 }}>
              Без съобщения. Без чакане. Без пропуснати резервации.
            </p>
          </div>

          {/* Section 4: No tech knowledge */}
          <div style={{ marginBottom: 'clamp(100px,16vw,160px)', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(16px,3vw,28px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Не разбираш от технологии?
            </p>
            <p style={{ fontSize: 'clamp(18px,4vw,24px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)', fontWeight: 700 }}>
              Не трябва.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Качваш снимка на ценоразписа.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)' }}>
              AI добавя всичките ти услуги за секунди.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6, maxWidth: 560, margin: '0 auto clamp(8px,2vw,12px)' }}>
              Искаш да промениш цена на услугата или да преместиш резервацията на Петя за друг ден? Просто пишеш в Telegram.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)' }}>
              Готово.
            </p>
            <p style={{ fontSize: 'clamp(18px,4vw,24px)', color: '#0f0f0f', marginBottom: 10, fontWeight: 700 }}>
              Ако ползваш Instagram ще се справиш.
            </p>
            <p style={{ fontSize: 'clamp(14px,3vw,16px)', color: '#6b7280', margin: 0 }}>
              Толкова е лесно управлението на този сайт.
            </p>
          </div>

          {/* Time? */}
          <div style={{ marginBottom: 'clamp(100px,16vw,160px)', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(8px,1.5vw,14px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Ще ми спести ли време?
            </p>
            <p style={{ fontSize: 'clamp(20px,5vw,28px)', color: '#0f0f0f', marginBottom: 10, fontWeight: 700 }}>
              Спираш да отговаряш на „Имате ли свободен час в петък?" в 23:00 ч. и в почивните дни.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 10 }}>
              Клиентите виждат свободните часове и си запазват сами.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Ако имат въпрос, могат да пишат в чата на сайта.
            </p>
            <p style={{ fontSize: 'clamp(14px,3vw,17px)', color: '#6b7280', margin: 0 }}>
              Твоят AI рецепционист отговаря вместо теб. 24/7. Без заплата.
            </p>
          </div>

          {/* Section 3: Platform profile */}
          <div style={{ marginBottom: 'clamp(100px,16vw,160px)', textAlign: 'center' }}>
            <p style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(16px,3vw,28px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Писна ли ти да си поредния профил в платформата?
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Там профилът ти е един от хиляди.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Клиентите виждат конкурентите ти до теб.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Плащаш им 30–50% за клиент…
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 6 }}>
              Ревютата остават в тяхната платформа.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(20px,4vw,32px)' }}>
              Ако утре се откажеш, нямаш ревюта.<br /><em>Я стига.</em>
            </p>
            <p style={{ fontSize: 'clamp(18px,4vw,24px)', color: '#0f0f0f', marginBottom: 6, fontWeight: 700 }}>
              На твоя сайт е различно.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>
              Само ти. Твоят бранд. Твоите клиенти.
            </p>
            <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)' }}>
              И нито един конкурент наоколо.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 'clamp(16px,4vw,20px)', fontWeight: 700, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                mariasalon.bg
              </span>
              <span style={{ fontSize: 'clamp(13px,3vw,15px)', color: '#6b7280', fontWeight: 400, marginBottom: 10 }}>
                представя теб и твоя бизнес.
              </span>
              <span style={{ fontSize: 'clamp(13px,3vw,15px)', color: '#6b7280', fontWeight: 400, marginTop: 4 }}>а</span>
              <span style={{ fontSize: 'clamp(14px,3.5vw,17px)', color: '#0f0f0f', fontWeight: 500, textDecoration: 'line-through' }}>
                platforma.com/12470
              </span>
              <span style={{ fontSize: 'clamp(13px,3vw,15px)', color: '#6b7280', fontWeight: 400, marginBottom: 20 }}>
                казва че си номер в каталога им.
              </span>
              <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', fontWeight: 700, margin: 0 }}>
                И никой няма да ти иска комисионна върху труда ти.
              </p>
            </div>
          </div>

          {/* Bridge */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)', marginTop: 'clamp(16px,3vw,24px)' }}>
            <p style={{ fontSize: 'clamp(32px,6.5vw,64px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(12px,2vw,20px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Направихме продукта, който решава всичко изброено.
            </p>
            <p style={{ fontSize: 'clamp(22px,5vw,36px)', color: '#0f0f0f', margin: 0, fontWeight: 700 }}>
              Ето какво прави за теб:
            </p>
          </div>

          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 10, marginTop: 'clamp(48px,8vw,80px)' }}>
            Без ръчно въвеждане
          </p>
          <h3 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 14, color: '#0f0f0f' }}>
            Качи снимка на ценоразписа.<br />
            <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI добавя всичко за секунди.
            </span>
          </h3>
          <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: '#666', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Снимай ценоразписа си, качи снимката в Telegram бота и мигновено всичките ти услуги са в сайта!
          </p>
        </div>

        {/* Flow: price list → AI → bot result → site */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr auto 1fr',
          gap: 0,
          alignItems: 'center',
        }}>

          {/* 1: real price list photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src="/images/IMG_2403.jpg"
                alt="Ценоразпис Diana Stoyanova"
                width={560}
                height={900}
                sizes="(max-width: 640px) 30vw, 280px"
                quality={78}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>1</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 400, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Качи снимка на ценоразписа си</p>
            </div>
          </div>

          {/* Arrow 1→2 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 40, paddingLeft: 6, paddingRight: 6 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="url(#arr1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="arr1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e11d48"/>
                  <stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 2: Telegram bot screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '100%' }}>
              <Image
                src="/images/IMG_1817 2.jpg"
                alt="Telegram бот @clickabot — добавени услуги от ценоразпис"
                width={560}
                height={900}
                sizes="(max-width: 640px) 30vw, 280px"
                quality={78}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>2</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 400, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>AI ще я разчете за секунди</p>
            </div>
          </div>

          {/* Arrow 2→3 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 40, paddingLeft: 6, paddingRight: 6 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="url(#arr2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="arr2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e11d48"/>
                  <stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* 3: real site screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src="/images/IMG_1819.jpg"
                alt="Услугите вече в сайта — salonurban.online"
                width={560}
                height={900}
                sizes="(max-width: 640px) 30vw, 280px"
                quality={78}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#e11d48,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>3</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 400, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Услугите ти са качени автоматично в сайта ти</p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'clamp(32px,5vw,56px)' }}>
          <p style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 700, color: '#0f0f0f', margin: 0 }}>
            Снимка, Telegram, готово.<br />
            <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Точно толкова е просто!
            </span>
          </p>
        </div>

      </div>
    </section>
  );
}

/* ── Own platform manifesto section ──────────────────── */

export function OwnPlatformSection() {
  return (
    <section
      aria-label="Не сте платформа"
      style={{
        background: '#fff',
        padding: 'clamp(48px,9vw,88px) clamp(20px,5vw,60px)',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        {/* Punch line */}
        <p style={{
          fontSize: 'clamp(26px,5vw,44px)',
          fontWeight: 800,
          lineHeight: 1.1,
          backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'clamp(16px,3vw,24px)',
        }}>
          Всеки нов клиент става твой.
        </p>

        {/* Concrete benefits */}
        <p style={{
          fontSize: 'clamp(15px,2vw,17px)',
          fontWeight: 600,
          color: '#1a1a1a',
          lineHeight: 1.7,
          marginBottom: 'clamp(16px,3vw,24px)',
        }}>
          В собствения ти сайт. В собствената ти клиентска база. Със собствения ти домейн.
        </p>

        {/* AI feature */}
        <p style={{
          fontSize: 'clamp(14px,1.8vw,16px)',
          color: '#6b7280',
          lineHeight: 1.65,
          maxWidth: 400,
          margin: '0 auto',
        }}>
          <span style={{ display: 'block', fontSize: 'clamp(32px,6vw,42px)', fontWeight: 800, marginBottom: 4, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>+</span>
          AI рецепционист, който приема резервации вместо теб <span style={{ fontWeight: 700, color: '#1a1a1a' }}>24/7</span>
        </p>
      </div>
    </section>
  );
}

/* ── Telegram Live Chat section ──────────────────────── */

const MARKETING_SCREENSHOT_SRC: Record<string, string> = {
  '/chat.png': '/marketing/chat.webp',
  '/IMG_1851.jpg': '/marketing/IMG_1851.webp',
  '/IMG_1852.jpg': '/marketing/IMG_1852.webp',
  '/images/IMG_1821.jpg': '/marketing/IMG_1821.webp',
  '/images/IMG_1822.jpg': '/marketing/IMG_1822.webp',
  '/images/IMG_1823.jpg': '/marketing/IMG_1823.webp',
  '/images/IMG_1826 2.jpg': '/marketing/IMG_1826-2.webp',
};

export function IPhoneFrame({ src, alt, size = 'md', fullRadius = false, imgPosition = 'top' }: { src: string; alt: string; size?: 'lg' | 'md'; fullRadius?: boolean; imgPosition?: string }) {
  const borderW = size === 'lg' ? 10 : 8;
  const outerR = fullRadius ? '36px' : '36px 36px 0 0';
  const innerR = fullRadius ? '30px' : '30px 30px 0 0';
  const imageSrc = MARKETING_SCREENSHOT_SRC[src] ?? src;
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: outerR,
      background: 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 60%, #0e0e10 100%)',
      boxShadow: '0 0 0 1.5px #3a3a40, 0 0 0 2.5px #1a1a1e, 0 24px 60px rgba(0,0,0,0.55)',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: -borderW / 2, top: '22%', width: borderW / 2, height: '7%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', left: -borderW / 2, top: '32%', width: borderW / 2, height: '9%', background: '#3a3a40', borderRadius: '1px 0 0 1px' }} />
      <div style={{ position: 'absolute', right: -borderW / 2, top: '30%', width: borderW / 2, height: '14%', background: '#3a3a40', borderRadius: '0 1px 1px 0' }} />
      <div style={{ margin: fullRadius ? '2.5%' : '2.5% 2.5% 0', borderRadius: innerR, background: '#000', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: size === 'lg' ? 28 : 20, background: '#000' }}>
          <div style={{ width: size === 'lg' ? '28%' : '22%', height: size === 'lg' ? 14 : 10, background: '#1a1a1e', borderRadius: 999 }} />
        </div>
        <Image
          src={imageSrc}
          alt={alt}
          width={390}
          height={844}
          sizes="(max-width: 640px) 220px, 280px"
          quality={78}
          loading="lazy"
          style={{ width: '100%', ...(fullRadius ? { aspectRatio: '390/844', objectFit: 'cover' as const, objectPosition: imgPosition } : { height: 'auto' }), display: 'block' }}
        />
      </div>
    </div>
  );
}

export function TelegramChatSection() {
  return (
    <section
      aria-label="Чат с клиенти от Telegram"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #ffffff 40%, #fdf2f8 52%, #fce7ef 62%, #f9a8d4 74%, #db2777 86%, #f472b6 100%)',
        padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,60px) clamp(64px,10vw,120px)',
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 340, background: 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.92) 15%, rgba(255,255,255,0.75) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.2) 70%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 3 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,72px)' }}>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Ти си на стола и работиш с клиентката.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(64px,12vw,120px)' }}>Някой нов клиент пише в сайта ти.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Назначихме AI да поеме контрола вместо теб.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Той ще консултира, ще отговаря и накрая ще я резервира.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#6b7280', marginBottom: 'clamp(32px,6vw,56px)' }}>Резервацията ще се появи в графика ти, а името и номерът на клиента в базата ти с клиенти.</p>

          <div style={{ width: '100%', maxWidth: 420, margin: '0 auto clamp(32px,6vw,56px)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
            <Image
              src="/klienti.png"
              alt="База с клиенти в clicka.bg"
              width={680}
              height={420}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          <h2 style={{
            fontSize: 'clamp(26px,5vw,48px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 0,
            backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Ти не пропускаш нищо.
          </h2>
        </div>

        {/* Story visual — all phones stacked vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 'clamp(40px,6vw,64px)' }}>

          {/* Phone 0: AI consultation */}
          <div style={{ width: '100%', maxWidth: 240 }}>
            <IPhoneFrame src="/IMG_2007.jpg" alt="AI консултация с нов клиент в сайта" size="lg" />
          </div>

          {/* Live chat heading */}
          <div style={{ textAlign: 'center', margin: 'clamp(40px,7vw,64px) 0 clamp(8px,2vw,16px)' }}>
            <p style={{ fontSize: 'clamp(18px,4vw,28px)', fontWeight: 700, lineHeight: 1.3, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Когато клиентката се нуждае от жив човек
            </p>
            <p style={{ fontSize: 'clamp(18px,4vw,28px)', fontWeight: 700, lineHeight: 1.3, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              получаваш съобщението и й отговаряш от Telegram.
            </p>
          </div>

          {/* Phone 2: известие */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <IPhoneFrame src="/IMG_1851.jpg" alt="Известие в Telegram" size="lg" />
          </div>

          {/* Arrow */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="#f9196e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Phone 3: отговаряш */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <IPhoneFrame src="/IMG_1852.jpg" alt="Отговаряш от Telegram" size="lg" />
          </div>

        </div>

        {/* Bottom tagline */}
        <div style={{ textAlign: 'center', paddingBottom: 'clamp(80px,12vw,120px)', paddingTop: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 'clamp(22px,4.5vw,38px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.15 }}>
            С AI чат и лайв чат няма как да пропуснеш нито един нов клиент.
          </p>
        </div>

      </div>
    </section>
  );
}

/* ── Features (FlowArt fullscreen scroll) ────────────── */

export function TelegramManagementSection() {
  return (
    <section
      aria-label="Управление от Telegram"
      style={{
        background: '#fff',
        padding: 'clamp(48px,9vw,96px) clamp(20px,5vw,60px)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Промени цени.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Добави услуга.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Редактирай цена на услуга.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Качи снимки в галерията.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Добави нов клиент.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Премести резервация.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Разбери какъв ти е оборотът.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 6 }}>Кой клиент колко пари е изхарчил при теб.</p>
          <p style={{ fontSize: 'clamp(16px,3.5vw,20px)', color: '#0f0f0f', marginBottom: 'clamp(20px,4vw,32px)' }}>Какви са предстоящите ти часове.</p>
          <p style={{ fontSize: 'clamp(20px,4.5vw,32px)', fontWeight: 900, lineHeight: 1.1, marginTop: 'clamp(80px,14vw,140px)', marginBottom: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            С едно съобщение в Telegram. Готово.
          </p>
        </div>

        {/* Screenshots — row 1 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'clamp(10px,2.5vw,24px)',
          alignItems: 'start',
        }}>
          {[
            { src: '/images/IMG_1821.jpg', alt: 'Записване на клиент и добавяне на услуга' },
            { src: '/images/IMG_1826 2.jpg', alt: 'Преместване на резервация и бележки за клиент' },
          ].map((img) => (
            <div key={img.src} style={{ width: '100%' }}>
              <IPhoneFrame src={img.src} alt={img.alt} size="lg" fullRadius />
            </div>
          ))}
        </div>

        {/* Divider label */}
        <div style={{ textAlign: 'center', margin: 'clamp(80px,14vw,140px) 0 clamp(48px,8vw,80px)' }}>
          <p style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, lineHeight: 1.2, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Качваш снимки в галерията си с едно съобщение.
          </p>
        </div>

        {/* Screenshots — row 2 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'clamp(10px,2.5vw,24px)',
          alignItems: 'start',
        }}>
          {[
            { src: '/images/IMG_1822.jpg', alt: 'Качване на снимки за портфолио' },
            { src: '/images/IMG_1823.jpg', alt: 'Снимките добавени в галерията' },
          ].map((img) => (
            <div key={img.src} style={{ width: '100%' }}>
              <IPhoneFrame src={img.src} alt={img.alt} size="lg" fullRadius />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

const AI_FEATURES = [
  {
    icon: '🤖',
    title: 'AI рецепционист',
    body: 'Отговаря на въпроси, препоръчва услуги и записва клиенти 24/7 - като истински служител на салона.',
  },
  {
    icon: '💬',
    title: 'Онлайн записване директно от чат',
    body: 'Клиентът резервира час в рамките на разговора, без да напуска сайта и без да чака отговор.',
  },
  {
    icon: '👤',
    title: 'Автоматичен клиентски профил',
    body: 'След всяка резервация клиентът автоматично се добавя в клиентската ти база с имена, телефон и имейл.',
  },
  {
    icon: '📊',
    title: 'Готов за реклами',
    body: 'Виж кои реклами носят реални резервации. Данните са твои — не на платформа.',
  },
];

const EXTRA_CHECKS = [
  'Собствен домейн',
  'SEO оптимизация и блог',
  'Google ревюта',
  'Онлайн плащания и депозити',
  'SMS и имейл напомняния',
  'Хостинг и SSL включени',
  '0% комисионна',
];

export function MarketingFeaturesSection() {
  return (
    <section
      id="features"
      data-home-section="features"
      aria-label="Какво получаваш"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 60%, #fff 100%)', padding: 'clamp(56px,10vw,96px) clamp(20px,5vw,60px)', position: 'relative', fontFamily: 'var(--font-client-manrope), sans-serif' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(32px,5vw,52px)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Твоят нов служител
          </p>
          <h2 style={{ marginBottom: 14, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <span style={{ display: 'block', fontSize: 'clamp(30px,5.5vw,52px)', fontWeight: 800, lineHeight: 1.1 }}>Работи 24/7. Не взима отпуска.</span>
            <span style={{ display: 'block', fontSize: 'clamp(22px,4vw,38px)', fontWeight: 800, lineHeight: 1.15 }}>Не пропуска клиент.</span>
          </h2>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 'clamp(28px,4vw,44px)' }}>
          {AI_FEATURES.map((f) => (
            <div key={f.title} style={{
              background: '#fff',
              borderRadius: 14,
              padding: '14px 16px',
              boxShadow: '0 4px 20px rgba(219,39,119,0.13)',
              border: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 4px', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ── How it works (3 steps) ───────────────────────────── */

export function MarketingStepsSection() {
  return (
    <section
      id="steps"
      data-home-section="steps"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)' }}
      aria-labelledby="steps-h"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="steps-h"
          data-reveal
          className={`mb-3 text-center text-[clamp(1.65rem,4.5vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_STEPS.title}
        </h2>
        <p
          data-reveal
          className="mb-12 text-center text-[clamp(0.875rem,1.5vw,1.05rem)] leading-relaxed text-[var(--muted-foreground)]"
        >
          {MARKETING_STEPS.subtitle}
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {MARKETING_STEPS.steps.map((step, i) => (
            <div
              key={step.number}
              data-reveal
              className="text-center"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-bold text-[var(--primary-foreground)]">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-12 text-center">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт"
            className="h-12 rounded-full px-8 text-base font-semibold"
          />
        </div>
      </div>
    </section>
  );
}

/* ── Comparison (platform vs clicka) ──────────────────── */

export function MarketingComparisonSection() {
  return (
    <section
      id="comparison"
      className="bg-[var(--background)]"
      style={{ padding: 'clamp(64px,10vw,100px) clamp(20px,5vw,60px)', fontFamily: 'var(--font-client-manrope), sans-serif' }}
      aria-labelledby="comparison-h"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="comparison-h"
          data-reveal
          className={`mb-10 text-center text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-[1.12] tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_COMPARISON.title}
        </h2>

        {/* Carousel on mobile, side-by-side on desktop */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 16,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: 8,
        }}>
          {/* Left: platforms */}
          <div
            data-reveal
            style={{
              flex: '0 0 82%',
              scrollSnapAlign: 'start',
              maxWidth: 420,
            }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">
              {MARKETING_COMPARISON.left.title}
            </h3>
            <ul className="space-y-2">
              {MARKETING_COMPARISON.left.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  <span className="mt-0.5 shrink-0 font-black text-red-500" aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: clicka */}
          <div
            data-reveal
            style={{
              flex: '0 0 82%',
              scrollSnapAlign: 'start',
              maxWidth: 420,
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #db2777, #a855f7) border-box',
              border: '2px solid transparent',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <ClickaLogo size="compact" href={null} className="inline-flex shrink-0" />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </h3>
            <ul className="space-y-2">
              {MARKETING_COMPARISON.right.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--foreground)]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, marginTop: 10, backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="sm:hidden">
          Плъзни за сравнение →
        </p>
      </div>
    </section>
  );
}

/* ── Founder section ──────────────────────────────────── */


export function MarketingFounderSection() {
  return (
    <section
      id="founder"
      className="text-center"
      style={{ background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)', padding: 'clamp(56px,8vw,88px) clamp(20px,5vw,60px)', position: 'relative', marginTop: '-1px' }}
      aria-labelledby="founder-h"
    >
      <div className="mx-auto max-w-xl">
        <h2
          id="founder-h"
          data-reveal
          className={`mb-5 text-[clamp(1.5rem,5vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] ${GRADIENT_HEADING}`}
          style={GRADIENT_BG}
        >
          {MARKETING_FOUNDER.title}
        </h2>
        <p
          data-reveal
          className="text-[clamp(1rem,2.2vw,1.15rem)] font-medium leading-snug text-[var(--foreground)]"
        >
          Всяка резервация трябва да изгражда твоя бранд.
        </p>
        <p
          data-reveal
          className="mt-2 text-[clamp(1rem,2.2vw,1.15rem)] font-medium leading-snug"
          style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        >
          Не на някой друг, а Твоя.
        </p>
      </div>

      {/* fade borders to white */}
      <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 50, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff 20%, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}
