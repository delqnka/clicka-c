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
          Работиш с клиенти по часове?
        </h2>
        <div className="mx-auto mt-3 max-w-lg space-y-4 leading-relaxed">
          <p className="text-[clamp(1.1rem,2.5vw,1.3rem)] font-semibold" style={{ color: '#1a1a1a' }}>
            Когато някой те потърси онлайн - трябва да те намери.
          </p>
          <p className="text-[clamp(0.95rem,1.8vw,1.05rem)]" style={{ color: '#9ca3af' }}>
            <span className="font-bold" style={{ color: '#1a1a1a' }}>Не</span> каталог.<br />
            <span className="font-bold" style={{ color: '#1a1a1a' }}>Не</span> платформа.<br />
            <span className="font-bold" style={{ color: '#1a1a1a' }}>Не</span> конкурентите ти.
          </p>
          <p className={`text-[clamp(1.6rem,4vw,2.2rem)] font-bold ${GRADIENT_HEADING}`} style={GRADIENT_BG}>Теб.</p>
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
        background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
        padding: 'clamp(20px,4vw,40px) clamp(20px,5vw,60px) clamp(72px,11vw,110px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,56px)' }}>
          <h2 style={{ fontSize: 'clamp(36px,7vw,72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 'clamp(16px,3vw,28px)', backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Как работи?
          </h2>
          {/* Steps */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, marginBottom: 'clamp(80px,12vw,120px)', textAlign: 'left' }}>
            {[
              { n: '1', text: 'Избираш план', green: false },
              { n: '✓', text: 'Сайтът ти е готов веднага', green: true },
              { n: '3', text: 'Качваш снимка на услугите си', green: false },
              { n: '4', text: 'Вече приемаш резервации', green: false },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: s.green ? '#16a34a' : '#ffffff',
                    border: s.green ? 'none' : 'none',
                    fontWeight: 700, fontSize: s.green ? 16 : 14,
                    color: s.green ? '#fff' : '#6b7280',
                    boxShadow: s.green ? '0 4px 16px rgba(22,163,74,0.35)' : '0 6px 18px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)',
                  }}>{s.n}</span>
                  <span style={{
                    fontSize: 'clamp(14px,1.8vw,16px)',
                    fontWeight: s.green ? 700 : 500,
                    color: s.green ? '#15803d' : '#1a1a1a',
                    fontFamily: 'var(--font-client-manrope), sans-serif',
                  }}>{s.text}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ paddingLeft: 16, lineHeight: 1 }}>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>│</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
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
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'clamp(12px,3vw,32px)',
          alignItems: 'end',
        }}>

          {/* 1: real price list photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%' }}>
              <Image
                src="/images/IMG_2403.jpg"
                alt="Ценоразпис — Diana Stoyanova"
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
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Снимка на ценоразписа</p>
            </div>
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
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>AI чете за секунди</p>
            </div>
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
              <p style={{ fontSize: 11, fontWeight: 700, margin: 0, backgroundImage: 'linear-gradient(135deg,#e11d48,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3 }}>Готови за резервиране</p>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(28px,4vw,44px)' }}>
          <p style={{ fontSize: 14, color: '#888' }}>
            Работи с всякакъв ценоразпис - ръкописен, принтиран, скрийншот или снимка.
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
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12, backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Живи разговори с клиенти
          </p>
          <h2 style={{
            fontSize: 'clamp(26px,5vw,48px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16,
            backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Клиентите пишат в сайта ти.<br />Ти отговаряш от Telegram.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#0f0f0f', maxWidth: 520, margin: '0 auto', lineHeight: 1.65, fontWeight: 400 }}>
            Получаваш съобщенията директно в Telegram и можеш да отговаряш на клиентите си отвсякъде.
          </p>
        </div>

        {/* Story visual — all phones stacked vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 'clamp(40px,6vw,64px)' }}>

          {/* Phone 1: клиентът пише */}
          <div style={{ width: '100%', maxWidth: 220 }}>
            <IPhoneFrame src="/chat.png" alt="Клиентът пише в чата" size="lg" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', margin: '0 0 2px' }}>💬 Клиентът пише в сайта</p>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Задава въпрос директно от сайта ти</p>
          </div>

          {/* Arrow */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="#f9196e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Phone 2: известие */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <IPhoneFrame src="/IMG_1851.jpg" alt="Известие в Telegram" size="lg" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0f', margin: '0 0 2px' }}>🔔 Известие в Telegram</p>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Веднага на телефона ти</p>
          </div>

          {/* Arrow */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="#f9196e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Phone 3: отговаряш */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <IPhoneFrame src="/IMG_1852.jpg" alt="Отговаряш от Telegram" size="lg" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 2px', textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>📲 Отговаряш от Telegram</p>
            <p style={{ fontSize: 12, color: '#fff', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>Клиентът вижда отговора в реално време</p>
          </div>

        </div>

        {/* Checkmarks */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 'clamp(36px,5vw,56px)' }}>
          {[
            'Без допълнителни приложения',
            'Отговаряш директно от телефона си',
            'Не губиш клиенти преди резервация',
          ].map((text, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 999,
              padding: '6px 14px',
              width: 'fit-content',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id={`chk-pill-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path d="M20 6L9 17l-5-5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div style={{ textAlign: 'center', paddingBottom: 'clamp(80px,12vw,120px)', paddingTop: 'clamp(20px,3vw,32px)' }}>
          <p style={{ fontSize: 'clamp(20px,3vw,32px)', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
            Това не е просто чат.
          </p>
          <p style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 800, color: '#fff' }}>
            💬 AI асистент + чат с реален човек в една система
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
        background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)',
        padding: 'clamp(48px,9vw,96px) clamp(20px,5vw,60px)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,52px)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            Твоят AI асистент
          </p>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 14, color: '#0f0f0f' }}>
            <span style={{ backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Управляваш всичко с едно съобщение.</span>
          </h2>
          <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: '#666', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Добавяй услуги, снимки, променяй работното си време, записвай часове и виждай резервациите си директно в <span style={{ color: '#229ED9', fontWeight: 700 }}>Telegram</span>, веднага.
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
        <div style={{ textAlign: 'center', margin: 'clamp(56px,10vw,96px) 0 clamp(48px,8vw,80px)' }}>
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
          {'Знаем какво е да работиш с часове, да пазиш стандарта си и да усещаш, че някой друг печели от труда ти. '}
          <span style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>Clicka.bg</span>
          {' е създаден, за да върне контрола при теб.'}
        </p>
        <p
          data-reveal
          className="mt-5 text-[clamp(0.95rem,2vw,1.1rem)] italic leading-relaxed text-[var(--muted-foreground)]"
        >
          <span style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--muted-foreground)' }}>с фокус върху кредото: </span><span style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>„Изграждаш собствен бранд, а не чужда платформа."</span>
        </p>
      </div>

      {/* fade borders to white */}
      <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 50, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, #ffffff 20%, transparent)', pointerEvents: 'none' }} />
    </section>
  );
}
