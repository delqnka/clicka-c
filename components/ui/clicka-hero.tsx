import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  formatSalonCitiesTrustLine,
  getMarketingActivityMock,
  HERO_CHIPS,
  HERO_PRICE_PILL,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';
import { cn } from '@/lib/utils';

const EMPHASIS = 'Готов за 15 минути.';

const HERO_TITLE_SIZE = 'text-[clamp(1.35rem,4.8vw,3rem)]';
const HERO_EMPHASIS_SIZE = 'text-[clamp(0.95rem,2.8vw,1.35rem)]';
const HERO_EMPHASIS_GRADIENT =
  'bg-gradient-to-r from-[#ff2d55] via-[#c026d3] to-[#7c3aed] bg-clip-text text-transparent';

type ClickaHeroProps = {
  /** Подай mock от сървъра; по подразбиране — MARKETING_ACTIVITY_MOCK */
  activity?: MarketingActivity;
};

export function ClickaHero({ activity: activityProp }: ClickaHeroProps) {
  const activity = activityProp ?? getMarketingActivityMock();
  const { settingUpNow, salonCities } = activity;
  const citiesTrustLine = formatSalonCitiesTrustLine(salonCities);

  return (
    <section
      aria-label="Hero"
      className="clicka-hero relative flex min-h-[100svh] w-full flex-col overflow-hidden"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(125% 125% at 50% 10%, #fff 40%, #6366f1 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-28 sm:pt-32">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <span className="hero-live-dot h-2 w-2 shrink-0 rounded-full" aria-hidden />
          <span>
            <span className="font-semibold tabular-nums">{settingUpNow}</span> салона настройват
            сайт сега
          </span>
        </p>

        <div className="mb-8 inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-sm font-semibold text-[var(--foreground)] shadow-sm backdrop-blur-sm">
          {HERO_PRICE_PILL}
        </div>

        <h1 className="mb-8 w-full max-w-5xl text-center text-[var(--foreground)]">
          <span className={cn('block md:inline', HERO_TITLE_SIZE)}>Независим собствен сайт</span>
          <span className="hidden md:inline"> </span>
          <span className={cn('block md:inline', HERO_TITLE_SIZE)}>с резервации за твоя салон.</span>
          <span
            className={cn('hero-emphasis mt-4 block', HERO_EMPHASIS_SIZE, HERO_EMPHASIS_GRADIENT)}
          >
            {EMPHASIS}
          </span>
        </h1>

        <ul className="mb-10 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {HERO_CHIPS.map((chip) => (
            <li key={chip}>
              <span className="inline-flex rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-medium text-[var(--secondary-foreground)] shadow-sm backdrop-blur-sm sm:text-[13px]">
                {chip}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт сега"
            className="h-12 rounded-full px-8 text-base font-bold"
          />
          <ButtonColorful
            href="https://salonurban.online/"
            label="Виж демо"
            variant="outline"
            className="h-12"
          />
        </div>

        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">{citiesTrustLine}</p>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[12] h-28 bg-gradient-to-b from-transparent to-white"
        aria-hidden
      />
    </section>
  );
}
