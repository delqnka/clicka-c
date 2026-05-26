'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MARKETING_ACTIVITY_FLOOR } from '@/lib/marketing-activity';

function AnimatedCount({
  initialValue,
  target,
  minWidthClassName,
}: {
  initialValue: number;
  target: number;
  minWidthClassName: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : initialValue);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    const duration = 900;
    const startValue = valueRef.current;
    const delta = target - startValue;

    if (delta === 0) return;

    const tick = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValue = Math.round(startValue + delta * eased);

      setValue(current => (current === nextValue ? current : nextValue));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [initialValue, prefersReducedMotion, target]);

  return (
    <span className={`inline-flex justify-center overflow-hidden align-middle font-semibold tabular-nums ${minWidthClassName}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: '0.35em' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-0.35em' }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ActivityBanner() {
  const initialStartedThisMonth = MARKETING_ACTIVITY_FLOOR.startedThisMonth;
  const initialSettingUpNow = MARKETING_ACTIVITY_FLOOR.settingUpNow;
  const [startedThisMonth, setStartedThisMonth] = useState<number>(initialStartedThisMonth);
  const [settingUpNow, setSettingUpNow] = useState<number>(initialSettingUpNow);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/marketing-activity', { cache: 'no-store' });
        if (!res.ok) return;

        const data = (await res.json()) as {
          startedThisMonth?: number;
          settingUpNow?: number;
        };

        if (cancelled) return;

        if (typeof data.startedThisMonth === 'number' && Number.isFinite(data.startedThisMonth)) {
          setStartedThisMonth(Math.max(initialStartedThisMonth, data.startedThisMonth));
        }

        if (typeof data.settingUpNow === 'number' && Number.isFinite(data.settingUpNow)) {
          setSettingUpNow(Math.max(initialSettingUpNow, data.settingUpNow));
        }
      } catch {}
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="bg-white pb-4 sm:pb-6">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-[30px] border border-black/10 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.16)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/20" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-black" />
              </span>
              <p className="text-balance text-[clamp(0.98rem,1.2vw+0.7rem,1.18rem)] leading-[1.45] tracking-[-0.02em] text-black">
                Този месец{' '}
                <AnimatedCount
                  initialValue={initialStartedThisMonth}
                  target={startedThisMonth}
                  minWidthClassName="min-w-[2ch]"
                />{' '}
                салона в България избраха да са независими
              </p>
            </div>

            <div className="h-px w-full bg-black/10 sm:hidden" />

            <p className="text-balance pl-[1.35rem] text-[clamp(0.92rem,1vw+0.7rem,1.05rem)] leading-[1.45] tracking-[-0.02em] text-black sm:pl-0 sm:text-right">
              В момента{' '}
              <AnimatedCount
                initialValue={initialSettingUpNow}
                target={settingUpNow}
                minWidthClassName="min-w-[1ch]"
              />{' '}
              beauty бизнеса настройват сайта си
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
