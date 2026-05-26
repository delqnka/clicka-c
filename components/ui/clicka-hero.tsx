import type { ReactNode } from 'react';
import { ButtonColorful } from '@/components/ui/button-colorful';
import {
  formatSalonCitiesTrustLine,
  getMarketingActivityMock,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';
import { cn } from '@/lib/utils';

const HERO_TITLE_SIZE = 'text-[clamp(1.65rem,6.5vw,3.25rem)]';
const HERO_SUBTITLE_SIZE = 'text-[clamp(1rem,3.2vw,1.35rem)]';
const HERO_META_SIZE = 'text-[clamp(0.9rem,2.4vw,1.1rem)]';

const HERO_EMPHASIS_GRADIENT =
  'bg-gradient-to-r from-[#ff2d55] via-[#c026d3] to-[#7c3aed] bg-clip-text text-transparent';

const HERO_ACCENT_GRADIENT =
  'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent';

type HeroStatProps = {
  children: ReactNode;
  variant?: 'accent' | 'pink' | 'hero';
  className?: string;
};

function HeroStat({ children, variant = 'accent', className }: HeroStatProps) {
  return (
    <span
      className={cn(
        'inline-block align-middle font-extrabold tabular-nums leading-[0.9] tracking-[-0.03em]',
        variant === 'hero' && 'text-[clamp(2.5rem,11vw,4.75rem)]',
        variant === 'accent' && 'text-[clamp(1.75rem,5.5vw,2.65rem)]',
        variant === 'pink' && 'text-[clamp(1.75rem,5.5vw,2.65rem)]',
        variant === 'hero' && HERO_ACCENT_GRADIENT,
        variant === 'accent' && HERO_ACCENT_GRADIENT,
        variant === 'pink' && HERO_EMPHASIS_GRADIENT,
        className,
      )}
    >
      {children}
    </span>
  );
}

type ClickaHeroProps = {
  activity?: MarketingActivity;
};

function HeroPriceLine() {
  return (
    <p
      className={cn(
        'mb-8 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1 text-center font-medium leading-snug text-[var(--secondary-foreground)]',
        HERO_META_SIZE,
      )}
    >
      <span>Готов за</span>
      <HeroStat variant="pink">15</HeroStat>
      <span>минути</span>
      <span className="mx-1 text-[var(--muted-foreground)]" aria-hidden>
        ·
      </span>
      <span>от</span>
      <HeroStat variant="accent">0,82 €</HeroStat>
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
        <h1 className="mb-4 w-full max-w-4xl text-center text-[var(--foreground)]">
          <span
            className={cn(
              'inline-flex flex-wrap items-baseline justify-center gap-x-[0.2em] leading-[1.12] tracking-[-0.02em]',
              HERO_TITLE_SIZE,
            )}
          >
            <span>Спри да плащаш</span>
            <HeroStat variant="hero">%</HeroStat>
            <span>от всяка резервация.</span>
          </span>
        </h1>

        <p
          className={cn(
            'hero-emphasis mb-3 flex max-w-3xl flex-wrap items-baseline justify-center gap-x-[0.25em] gap-y-1 text-center font-medium leading-snug text-[var(--foreground)]',
            HERO_SUBTITLE_SIZE,
          )}
        >
          <span>Собствен сайт. Собствени клиенти.</span>
          <HeroStat variant="accent">0%</HeroStat>
          <span>комисионна.</span>
        </p>

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
