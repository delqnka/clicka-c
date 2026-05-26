import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  formatSalonCitiesTrustLine,
  getMarketingActivityMock,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';
import { cn } from '@/lib/utils';

const EMPHASIS = 'Готов за 15 минути.';

const HERO_TITLE_SIZE = 'text-[clamp(2rem,8.5vw,3.85rem)]';
const HERO_EMPHASIS_SIZE = 'text-[clamp(1rem,3.2vw,1.4rem)]';
const HERO_EMPHASIS_GRADIENT =
  'bg-gradient-to-r from-[#ff2d55] via-[#c026d3] to-[#7c3aed] bg-clip-text text-transparent';

const HERO_ACCENT_GRADIENT =
  'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent';

type ClickaHeroProps = {
  activity?: MarketingActivity;
};

function HeroPriceLine() {
  return (
    <p className="mb-8 text-center text-base font-medium leading-snug text-[var(--foreground)] sm:text-lg">
      <span className={cn('text-lg font-bold sm:text-xl', HERO_ACCENT_GRADIENT)}>0%</span>
      <span className="mx-1">комисионна</span>
      <span className="text-[var(--muted-foreground)]" aria-hidden>
        ·
      </span>
      <span className="mx-1 text-[var(--secondary-foreground)]">от</span>
      <span className={cn('text-lg font-bold sm:text-xl', HERO_ACCENT_GRADIENT)}>0,82 €</span>
      <span className="text-[var(--secondary-foreground)]">/ ден</span>
    </p>
  );
}

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
          background: 'radial-gradient(125% 125% at 50% 10%, #fff 40%, #f472b6 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-28 sm:pt-32">
        <h1 className="mb-6 w-full max-w-5xl text-center text-[var(--foreground)]">
          <span className={cn('block md:inline', HERO_TITLE_SIZE)}>Независим собствен сайт</span>
          <span className="hidden md:inline"> </span>
          <span className={cn('block md:inline', HERO_TITLE_SIZE)}>с резервации за твоя салон.</span>
          <span
            className={cn('hero-emphasis mt-3 block', HERO_EMPHASIS_SIZE, HERO_EMPHASIS_GRADIENT)}
          >
            {EMPHASIS}
          </span>
        </h1>

        <HeroPriceLine />

        <div className="mb-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт сега"
            className="h-12 w-full rounded-full px-8 text-base font-bold sm:w-auto"
          />
          <ButtonColorful
            href="https://salonurban.online/"
            label="Виж демо"
            variant="outline"
            className="h-12 w-full sm:w-auto"
          />
        </div>

        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted-foreground)] sm:text-xs">
          <span className="hero-live-dot h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
          <span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">{settingUpNow}</span>{' '}
            салона настройват сайт сега
          </span>
        </p>

        <p className="text-center text-xs text-[var(--muted-foreground)] sm:text-sm">{citiesTrustLine}</p>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[12] h-28 bg-gradient-to-b from-transparent to-white"
        aria-hidden
      />
    </section>
  );
}
