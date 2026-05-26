import { ButtonColorful } from '@/components/ui/button-colorful';
import { formatHeroTrustPill, MARKETING_ACTIVITY_FLOOR } from '@/lib/marketing-activity-shared';
import { cn } from '@/lib/utils';

const EMPHASIS = 'Готов за 15 минути.';

type ClickaHeroProps = {
  activeSalons?: number;
};

const CHAR_TITLE =
  'font-display text-[clamp(1.35rem,4.8vw,3rem)] leading-[1.05] font-bold text-[var(--foreground)] tracking-tight';
const CHAR_EMPHASIS =
  'font-display text-[clamp(1.5rem,5.5vw,3.5rem)] leading-none font-bold text-[var(--primary)] tracking-tight';

export function ClickaHero({ activeSalons }: ClickaHeroProps) {
  const heroPill =
    typeof activeSalons === 'number' && Number.isFinite(activeSalons)
      ? formatHeroTrustPill(activeSalons)
      : formatHeroTrustPill(MARKETING_ACTIVITY_FLOOR.activeSalons);
  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[var(--background)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: 'clamp(20px, 5vw, 60px) clamp(20px, 5vw, 60px)',
        }}
        aria-hidden
      />

      <div className="absolute left-8 top-24 h-12 w-12 border-l border-t border-[var(--border)]" aria-hidden />
      <div className="absolute bottom-8 right-8 h-12 w-12 border-r border-b border-[var(--border)]" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-28 sm:pt-32">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm font-semibold text-[var(--foreground)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden />
          {heroPill}
        </div>

        <h1 className="mb-10 w-full max-w-5xl text-center">
          <span className={cn('block md:inline', CHAR_TITLE)}>Независим собствен сайт</span>
          <span className="hidden md:inline"> </span>
          <span className={cn('block md:inline', CHAR_TITLE)}>с резервации за твоя салон.</span>
          <span className={cn('mt-3 block', CHAR_EMPHASIS)}>{EMPHASIS}</span>
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonColorful
            href="/create"
            label="Създай своя сайт сега"
            className="h-12 rounded-full px-8 text-base font-bold"
          />
          <ButtonColorful
            href="/demo"
            label="Виж демо"
            className="h-12 rounded-full px-7 text-base font-medium"
          />
        </div>

        <p className="mt-5 text-center text-sm font-normal text-[var(--secondary-foreground)]">
          от 0.82 € / ден · без скрити такси · 0% комисионна · собствен бранд
        </p>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[12] h-24 bg-gradient-to-b from-transparent to-[var(--background)]"
        aria-hidden
      />
    </section>
  );
}
