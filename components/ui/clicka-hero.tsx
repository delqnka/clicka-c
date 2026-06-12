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
        <p className="mb-8 text-center text-[11px] font-normal" style={{ color: '#9ca3af' }}>
          За специалистите в красотата.
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

        {/* Price + ready — last push before CTA */}
        <p className="mb-5 text-center text-[clamp(0.75rem,1.8vw,0.85rem)] font-semibold text-[#0f0f0f]">
          От <span style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{formatDualEurText('0.82')}</span> на ден · Плащаш и сайтът ти е онлайн веднага
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <ButtonColorful
            href="/create"
            label="Създай сайт"
            className="h-14 rounded-full px-16 text-[15px] font-bold"
          />
          <ButtonColorful
            href="https://salonurban.online/"
            label="Виж готов сайт"
            variant="outline"
            className="scale-[0.82] origin-center"
          />
        </div>

      </div>
    </section>
  );
}
