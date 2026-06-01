import { ButtonColorful } from '@/components/ui/button-colorful';
import { LiveSalonCount } from '@/components/ui/live-salon-count';
import { LiveSalonCities } from '@/components/ui/live-salon-cities';
import {
  formatSalonCitiesTrustLine,
  getMarketingActivityMock,
  type MarketingActivity,
} from '@/lib/marketing-activity-shared';

type ClickaHeroProps = {
  activity?: MarketingActivity;
};

export function ClickaHero({ activity: activityProp }: ClickaHeroProps) {
  const activity = activityProp ?? getMarketingActivityMock();
  const { settingUpNow, salonCities } = activity;
  const citiesTrustLine = formatSalonCitiesTrustLine(salonCities);

  return (
    <section
      aria-label="Hero"
      className="clicka-hero relative flex min-h-[85svh] w-full flex-col overflow-hidden"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(125% 125% at 50% 10%, #fff 40%, #f472b6 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:pt-24">
        <div className="mb-7 flex flex-col items-center">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted-foreground)] sm:text-xs">
            <span className="hero-live-dot h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
            <span>
              <LiveSalonCount />{' '}
              салона настройват сайт сега
            </span>
          </p>

          <p className="text-center text-[10px] text-[var(--muted-foreground)] sm:text-[11px]">
            <LiveSalonCities fallback={citiesTrustLine} />
          </p>
        </div>

        <h1
          className="mb-6 w-full bg-clip-text text-center text-[clamp(2.35rem,9.2vw,3.85rem)] font-bold leading-[1.05] tracking-[-0.02em] text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)' }}
        >
          Собствен сайт с резервации за твоя салон
        </h1>

        <p className="mb-3 text-center text-[clamp(1rem,2.8vw,1.3rem)] font-medium leading-snug text-[var(--foreground)]">
          Готов <span className="font-extrabold">ВЕДНАГА</span>.
          {' '}Твоят бранд с <span className="font-extrabold text-[var(--primary)]">0%</span> комисионна.
        </p>

        <p className="mb-8 text-center text-[clamp(0.875rem,2vw,1rem)] font-semibold" style={{ background: 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          от 0,82 € на ден. Без скрити такси.
        </p>

        <div className="mb-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт"
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

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[9] h-48 bg-gradient-to-b from-transparent via-[#f9d4da] to-[#fff1f2]"
        aria-hidden
      />
    </section>
  );
}
