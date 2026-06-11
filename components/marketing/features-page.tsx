import Link from 'next/link';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { ClickaLogo } from '@/components/brand/clicka-logo';

const GRADIENT_TEXT = {
  backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
};

const FEATURES = [
  {
    id: 'online-reservations',
    icon: '📅',
    eyebrow: 'Booking system за салон',
    title: 'Онлайн резервации',
    subtitle: 'Клиентите се записват сами — по всяко време, без обаждания.',
    bullets: [
      'Клиентите избират услуга, специалист, дата и час сами',
      'Достъп 24/7 — дори в неделя от 23:00',
      'По-малко обаждания, по-малко пропуснати клиенти',
      'Автоматично потвърждение по имейл след всяко записване',
      'Опция за депозит при записване — намалява неявяванията',
    ],
  },
  {
    id: 'telegram-management',
    icon: '✈️',
    eyebrow: 'Управление без админ панел',
    title: 'Управление от Telegram',
    subtitle: 'Добавяй услуги, снимки и часове — с едно съобщение.',
    bullets: [
      'Добавяй и редактирай услуги директно от Telegram',
      'Качи снимка на ценоразписа и AI добавя всичко за секунди',
      'Блокирай часове, промени работното си време по всяко време',
      'Преглеждай предстоящите резервации в реално време',
      'Записвай клиенти ръчно, ако са се обадили по телефон',
    ],
  },
  {
    id: 'gallery',
    icon: '🖼️',
    eyebrow: 'Портфолио и галерия',
    title: 'Галерия с резултати',
    subtitle: 'Покажи работата си и превърни посетителите в клиенти.',
    bullets: [
      'Изпрати снимките на Telegram бота — появяват се в сайта веднага',
      'SEO-friendly изображения с alt текст за Google',
      'Оптимизирани за бързо зареждане на мобилни устройства',
      'Категоризирани галерии по вид услуга',
    ],
  },
  {
    id: 'services-pricing',
    icon: '💇',
    eyebrow: 'Услуги и ценоразпис',
    title: 'Услуги и цени',
    subtitle: 'Организирани, ясни и винаги актуални.',
    bullets: [
      'Категории: Коса, Нокти, Козметика, Масаж и др.',
      'Видими цени и продължителност на всяка услуга',
      'Промени цена или добави нова услуга с едно съобщение в Telegram',
      'AI чете ценоразпис от снимка и добавя всичко автоматично',
    ],
  },
  {
    id: 'reminders',
    icon: '🔔',
    eyebrow: 'Намаляване на пропуснати посещения',
    title: 'Напомняния за часове',
    subtitle: 'Клиентите не забравят — ти не губиш приход.',
    bullets: [
      'Автоматичен имейл 24 часа преди записания час',
      'Потвърждение веднага след резервацията',
      'Опция за онлайн депозит — плащалите клиенти се явяват в 95% от случаите',
      'Известия за теб в Telegram при всяка нова или анулирана резервация',
    ],
  },
  {
    id: 'own-website',
    icon: '🌐',
    eyebrow: 'Сайт за салон',
    title: 'Собствен сайт',
    subtitle: 'Персонализиран, бърз и mobile-first — готов за минути.',
    bullets: [
      'Твоето лого, твои снимки, твой бранд',
      'Оптимизиран за мобилни устройства — над 70% от трафика е от телефон',
      'Бързо зареждане — Google Lighthouse 100/100',
      'Хостинг и SSL сертификат включени в плана',
      'Собствена клиентска база — нито един клиент не вижда конкурентите ти',
    ],
  },
  {
    id: 'seo',
    icon: '🔍',
    eyebrow: 'Индексиране в Google',
    title: 'SEO оптимизация',
    subtitle: 'Клиентите те намират, когато търсят в Google.',
    bullets: [
      'Перфектен SEO резултат — Google Lighthouse 100/100',
      'Автоматичен sitemap.xml при всяка промяна',
      'Meta тагове, Open Graph и structured data за всяка страница',
      'Blog секция за съдържание и дългосрочен SEO трафик',
    ],
  },
  {
    id: 'custom-domain',
    icon: '🏷️',
    eyebrow: 'Професионално онлайн присъствие',
    title: 'Собствен домейн',
    subtitle: 'moiatsalon.bg вместо нечий каталог.',
    bullets: [
      'Веднага получаваш безплатен адрес tvoiatsalon.clicka.bg',
      'Свържи собствен домейн безплатно от дашборда',
      'Можем да регистрираме и настроим домейна вместо теб',
      'Домейнът се регистрира на твоята фирма и остава твоя собственост',
    ],
  },
  {
    id: 'ai-receptionist',
    icon: '🤖',
    eyebrow: 'AI рецепционист',
    title: 'AI асистент 24/7',
    subtitle: 'Приема резервации и отговаря на въпроси — дори когато спиш.',
    bullets: [
      'Отговаря на въпроси на клиентите в реално време',
      'Записва нови часове директно в чата на сайта',
      'Ти отговаряш на живо от Telegram, когато искаш',
      'Не пропуска клиент преди резервация',
    ],
  },
  {
    id: 'google-reviews',
    icon: '⭐',
    eyebrow: 'Репутация онлайн',
    title: 'Google ревюта',
    subtitle: 'Повече ревюта = по-висока позиция в Google.',
    bullets: [
      'Автоматична покана за Google ревю след всяка завършена резервация',
      'Ревютата от Google Business се показват директно на сайта ти',
      'Повече ревюта означава по-висока позиция при търсене в Google',
    ],
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Какво е онлайн резервационна система за салон?',
    a: 'Онлайн резервационната система позволява на клиентите ти да се записват за час директно от сайта ти, без да се налага да звънят. Те избират услуга, специалист, дата и час, а ти получаваш известие в Telegram веднага.',
  },
  {
    q: 'Как работи booking системата на Clicka?',
    a: 'Клиентът отваря сайта ти, избира услуга и свободен час от твоя график, и потвърждава резервацията. Ти получаваш известие в Telegram и имейл. Часът се блокира автоматично — никой друг не може да го вземе.',
  },
  {
    q: 'Трябва ли ми технически умения за управление?',
    a: 'Не. Управляваш всичко от Telegram — приложение, което вече ползваш. Добавяш услуги, снимки и часове с обикновено съобщение. Ако можеш да изпратиш текст в Telegram, можеш да управляваш сайта си.',
  },
  {
    q: 'Мога ли да имам собствен домейн (например mysalon.bg)?',
    a: 'Да. Веднага получаваш безплатен адрес tvoiatsalon.clicka.bg. Ако искаш собствен домейн, можеш да го свържеш самостоятелно безплатно или ние да го регистрираме вместо теб срещу допълнително заплащане.',
  },
  {
    q: 'Как Clicka помага за SEO на моя салон?',
    a: 'Сайтът постига 100/100 в Google Lighthouse. Генерира автоматичен sitemap, има коректни meta тагове и structured data. Можеш да публикуваш blog статии за дългосрочен SEO трафик.',
  },
  {
    q: 'Как да намаля пропуснатите посещения?',
    a: 'С Clicka можеш да изискваш онлайн депозит при записването. Клиентите, платили депозит, се явяват в над 95% от случаите. Системата също изпраща автоматично напомняне по имейл 24 часа преди часа.',
  },
  {
    q: 'Работи ли за фризьор, маникюрист и козметик?',
    a: 'Да. Clicka работи за всеки специалист, работещ с часове — фризьори, барбъри, козметици, маникюристи, масажисти, педикюристи, груумъри и всяко студио за красота.',
  },
  {
    q: 'Има ли комисионна върху резервациите?',
    a: 'Не. Clicka не взима нито стотинка комисионна. Запазваш 100% от приходите си. Плащаш само годишния абонамент.',
  },
];

export function FeaturesPage() {
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
      <section
        aria-label="Всички функции на Clicka"
        style={{
          background: 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)',
          padding: 'clamp(64px,12vw,120px) clamp(20px,5vw,60px) clamp(56px,10vw,100px)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 14 }}>
          Функции
        </p>
        <h1 style={{
          fontSize: 'clamp(2rem,6vw,3.75rem)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          marginBottom: 'clamp(16px,3vw,24px)',
          ...GRADIENT_TEXT,
        }}>
          Всички функции, от които<br />се нуждае един модерен салон
        </h1>
        <p style={{
          fontSize: 'clamp(1rem,2vw,1.2rem)',
          color: '#4b5563',
          maxWidth: 600,
          margin: '0 auto clamp(32px,5vw,48px)',
          lineHeight: 1.65,
        }}>
          Clicka е собствен сайт с онлайн резервации, AI рецепционист и управление от Telegram.
          Без комисионна. Без конкуренти до теб. Само твоят бизнес.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ButtonColorful href="/create" label="Стартирай безплатно" className="h-12 rounded-full px-8 text-base font-semibold" />
          <Link
            href="/pricing"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 48,
              padding: '0 28px', borderRadius: 999,
              border: '1.5px solid #e11d48',
              fontSize: 15, fontWeight: 600, color: '#e11d48',
              textDecoration: 'none',
            }}
          >
            Виж цените
          </Link>
        </div>
      </section>

      {/* ── Feature grid ──────────────────────────────────── */}
      {FEATURES.map((f, idx) => {
        const even = idx % 2 === 0;
        return (
          <section
            key={f.id}
            id={f.id}
            aria-label={f.title}
            style={{
              background: even
                ? '#fff'
                : 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)',
              padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
            }}
          >
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 8 }}>
                    {f.eyebrow}
                  </p>
                  <h2 style={{
                    fontSize: 'clamp(1.5rem,4vw,2.5rem)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: 10,
                    ...GRADIENT_TEXT,
                  }}>
                    {f.title}
                  </h2>
                  <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: '#374151', fontWeight: 500, marginBottom: 20, lineHeight: 1.5 }}>
                    {f.subtitle}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {f.bullets.map((b) => (
                      <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="11" fill="url(#fg-check)" />
                          <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          <defs>
                            <linearGradient id="fg-check" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#e11d48" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span style={{ fontSize: 'clamp(14px,1.7vw,16px)', color: '#374151', lineHeight: 1.55 }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── Quick feature strip ───────────────────────────── */}
      <section
        aria-label="Всичко включено"
        style={{
          background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)',
          padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,60px)',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.1 }}>
            Всичко е включено в плана
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(14px,1.8vw,17px)', marginBottom: 40, lineHeight: 1.6 }}>
            Хостинг, SSL, AI рецепционист, онлайн резервации, Telegram управление, галерия, услуги, блог, SEO, напомняния. Без скрити такси.
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40,
          }}>
            {[
              '0% комисионна',
              'Хостинг включен',
              'SSL сертификат',
              'AI рецепционист',
              'Telegram управление',
              'Онлайн резервации',
              'Галерия',
              'Блог',
              'SEO 100/100',
              'Собствен домейн',
              'Google ревюта',
              'Онлайн плащания',
              'Напомняния',
              'Техническа поддръжка',
            ].map((tag) => (
              <span key={tag} style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
              }}>
                {tag}
              </span>
            ))}
          </div>
          <ButtonColorful href="/create" label="Създай своя сайт за минути" className="h-12 rounded-full px-8 text-base font-semibold bg-white" />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section
        id="faq"
        aria-label="Често задавани въпроси"
        style={{
          background: 'linear-gradient(180deg, #fdf2f8 0%, #fff 100%)',
          padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#db2777', marginBottom: 10 }}>
            FAQ
          </p>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 800, lineHeight: 1.12, marginBottom: 36, ...GRADIENT_TEXT }}>
            Честo задавани въпроси
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                style={{ borderBottom: '1px solid #f0e6f6' }}
              >
                <summary style={{
                  padding: '16px 0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', listStyle: 'none',
                  fontSize: 'clamp(14px,1.8vw,16px)', fontWeight: 600, color: '#0f0f0f', lineHeight: 1.4,
                }}>
                  {item.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: 12 }}>
                    <path d="M6 9l6 6 6-6" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <p style={{ fontSize: 'clamp(13px,1.6vw,15px)', color: '#666', lineHeight: 1.7, paddingBottom: 16, margin: 0 }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #ffffff, transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #ffffff, transparent)', pointerEvents: 'none' }} />
      </section>

      {/* ── CTA bottom ───────────────────────────────────── */}
      <section
        aria-label="Създай сайт"
        style={{
          background: '#fff',
          padding: 'clamp(56px,9vw,96px) clamp(20px,5vw,60px)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#db2777', marginBottom: 14 }}>
          Готов?
        </p>
        <h2 style={{
          fontSize: 'clamp(1.75rem,5vw,3rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: 16,
          ...GRADIENT_TEXT,
        }}>
          Създай своя сайт за минути
        </h2>
        <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: '#4b5563', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.65 }}>
          Избираш план → сайтът е готов веднага → качваш снимка на ценоразписа → вече приемаш резервации.
        </p>
        <ButtonColorful href="/create" label="Стартирай сега" className="h-12 rounded-full px-8 text-base font-semibold" />
        <p style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>
          От 0.82 € на ден · 0% комисионна · Без договор
        </p>
      </section>

    </main>
  );
}
