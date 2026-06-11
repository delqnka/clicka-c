import { ButtonColorful } from '@/components/ui/button-colorful';
import { formatDualEurText } from '@/lib/salon-currency';
import {
  MARKETING_ACTIVITY_MOCK,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';

type ClickaHeroProps = {
  activity?: MarketingActivity;
};

export function ClickaHero({ activity: activityProp }: ClickaHeroProps) {
  const activity = activityProp ?? MARKETING_ACTIVITY_MOCK;
  const { settingUpNow } = activity;

  return (
    <section
      aria-label="Hero"
      className="clicka-hero relative flex min-h-[85svh] w-full flex-col overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Fade from white at top */}
      <div
        className="absolute top-0 left-0 right-0 z-0"
        style={{ height: '18%', background: 'linear-gradient(to top, transparent, #ffffff)' }}
        aria-hidden
      />

      {/* Fade into next section colour */}
      <div
        className="absolute bottom-0 left-0 right-0 z-0"
        style={{ height: '28%', background: 'linear-gradient(to bottom, transparent, #ffffff)' }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-36 sm:pt-28">

        {/* Badge */}
        <p className="mb-8 text-center text-[13px] font-normal" style={{ color: '#0f0f0f' }}>
          За фризьори, маникюристи, козметици, салони и професионалистите в красотата
        </p>

        {/* Heading */}
        <h1
          className="mb-2 w-full bg-clip-text pb-1 text-center text-[clamp(2.6rem,11vw,5rem)] font-bold leading-[1.08] tracking-[-0.03em] text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' }}
        >
          Готов сайт с онлайн резервации с твоето име.
        </h1>

        {/* Subline */}
        <p className="mb-6 text-center text-[clamp(1.15rem,3.5vw,1.4rem)] font-normal" style={{ color: '#0f0f0f' }}>
          Не в платформа, а на твой домейн.
        </p>

        {/* Price line */}
        <p className="mb-2 text-center text-[clamp(0.875rem,2vw,1rem)] font-semibold text-[var(--foreground)]">
          От <span style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{formatDualEurText('0.82')}</span> на ден
        </p>

        {/* Ready now line */}
        <p className="mb-6 text-center text-[clamp(0.8rem,2vw,0.9rem)] font-medium" style={{ color: '#9ca3af' }}>
          Плащаш и сайтът ти е онлайн веднага
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <ButtonColorful
            href="/create"
            label="Създай сайт"
            className="h-10 rounded-full px-28 text-base font-bold"
          />
          <ButtonColorful
            href="https://salonurban.online/"
            label="Виж готов сайт"
            variant="outline"
            className=""
          />
        </div>

      </div>
    </section>
  );
}
