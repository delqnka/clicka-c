import { ButtonColorful } from '@/components/ui/button-colorful';
import { LiveSalonCount } from '@/components/ui/live-salon-count';
import {
  getMarketingActivityMock,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';

type ClickaHeroProps = {
  activity?: MarketingActivity;
};

export function ClickaHero({ activity: activityProp }: ClickaHeroProps) {
  const activity = activityProp ?? getMarketingActivityMock();
  const { settingUpNow } = activity;

  return (
    <section
      aria-label="Hero"
      className="clicka-hero relative flex min-h-[85svh] w-full flex-col overflow-hidden bg-white"
    >
      {/* Pink gradient — starts only behind/below the buttons */}
      <div
        className="absolute bottom-0 left-0 right-0 z-0"
        style={{
          height: '55%',
          background: 'radial-gradient(120% 120% at 50% 100%, #fce7ef 0%, #fff0f5 60%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:pt-24">

        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 text-[13px] font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="badge-chk" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path d="M20 6L9 17l-5-5" stroke="url(#badge-chk)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            За специалисти, които работят с часове
          </span>
        </div>

        {/* Heading */}
        <h1
          className="mb-4 w-full bg-clip-text pb-1 text-center text-[clamp(2.35rem,9.2vw,3.85rem)] font-bold leading-[1.12] tracking-[-0.02em] text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' }}
        >
          Собствен сайт.<br />Онлайн резервации.
        </h1>

        {/* Subheading */}
        <p className="mb-3 text-center text-[clamp(1.25rem,4vw,1.75rem)] font-bold leading-snug text-[var(--foreground)]">
          Управлявай всичко от <span style={{ color: '#2AABEE' }}>Telegram</span>.
        </p>

        {/* Description */}
        <p className="mb-5 text-center text-[clamp(0.875rem,2.2vw,1rem)] font-medium leading-relaxed" style={{ color: '#6b7280' }}>
          Получавай резервации, качвай снимки и променяй услуги с едно съобщение.
        </p>

        {/* 3 key badges */}
        <div className="mb-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {['0% комисионна', 'Онлайн резервации 24/7', 'Управление от Telegram'].map((label, i) => (
            <span key={label} className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--foreground)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`hchk${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="50%" stopColor="#db2777" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path d="M20 6L9 17l-5-5" stroke={`url(#hchk${i})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {label}
            </span>
          ))}
        </div>

        {/* Price line */}
        <p className="mb-8 text-center text-[clamp(0.875rem,2vw,1rem)] font-semibold text-[var(--foreground)]">
          От <span style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>0,82 €</span> на ден
        </p>

        {/* Buttons */}
        <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonColorful
            href="/create"
            label="Създай сайт"
            className="h-10 w-full rounded-full px-7 text-sm font-bold sm:w-auto"
          />
          <ButtonColorful
            href="https://salonurban.online/"
            label="Виж демо"
            variant="outline"
            className="h-10 w-full sm:w-auto"
          />
        </div>

      </div>
    </section>
  );
}
