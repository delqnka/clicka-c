import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  formatSalonCitiesTrustLine,
  getMarketingActivityMock,
  HERO_CHIPS,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';
import { cn } from '@/lib/utils';

const EMPHASIS = 'Готов за 15 минути.';

const HERO_TITLE_SIZE = 'text-[clamp(1.75rem,6.2vw,3.75rem)]';
const HERO_EMPHASIS_SIZE = 'text-[clamp(0.95rem,2.8vw,1.35rem)]';
const HERO_EMPHASIS_GRADIENT =
  'bg-gradient-to-r from-[#ff2d55] via-[#c026d3] to-[#7c3aed] bg-clip-text text-transparent';

/** Същият градиент като outline бутона „Виж демо“ */
const HERO_ACCENT_GRADIENT =
  'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent';

type ClickaHeroProps = {
  /** Подай mock от сървъра; по подразбиране — MARKETING_ACTIVITY_MOCK */
  activity?: MarketingActivity;
};

function HeroPricePill() {
  return (
    <p className="inline-flex flex-wrap items-center justify-center gap-x-1 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm sm:text-xs">
      <span className={cn('font-semibold', HERO_ACCENT_GRADIENT)}>0%</span>
      <span>комисионна · от</span>
      <span className={cn('font-semibold', HERO_ACCENT_GRADIENT)}>0,82 €</span>
      <span>/ ден</span>
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

        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
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

        <ul className="mb-5 flex max-w-2xl flex-wrap items-center justify-center gap-1.5">
          {HERO_CHIPS.map((chip) => (
            <li key={chip}>
              <span className="inline-flex rounded-full border border-black/8 bg-white/65 px-2 py-0.5 text-[10px] font-medium leading-tight text-[var(--secondary-foreground)] shadow-sm backdrop-blur-sm sm:text-[11px]">
                {chip}
              </span>
            </li>
          ))}
        </ul>

        <div className="mb-4">
          <HeroPricePill />
        </div>

        <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted-foreground)] sm:text-xs">
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
