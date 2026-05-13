'use client';

import { motion } from 'framer-motion';
import { HeroBackground } from '@/components/marketing/hero-background';
import { MagneticCta } from '@/components/marketing/magnetic-cta';

export function HeroSection() {
  const pills = [
    '0% комисионна',
    'Клиентите са твои',
    'Личен домейн',
    'SMS/email известия',
  ];

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-16 pt-32 sm:pb-24"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 -z-10">
        <HeroBackground />
        <div className="bg-fade-hero pointer-events-none absolute inset-0" />
        <div className="grid-overlay pointer-events-none absolute inset-0" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="mb-4 max-w-4xl text-sm font-medium leading-relaxed text-white/65 sm:text-base">
          За фризьори, маникюристи, козметици, груумъри и всички професионалисти в сферата на красотата
        </p>
        <div className="hero-h1-spotlights max-w-[min(100%,36rem)] sm:max-w-5xl">
          <motion.h1
            className="hero-h1-title max-w-5xl text-[clamp(2rem,4.2vw+0.75rem,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[clamp(2.125rem,4.5vw+0.5rem,3.5rem)]"
            id="hero-title"
            initial={{ opacity: 1, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Резервации онлайн.
            <br />
            0 % комисионна.
            <br />
            100 % финансова независимост.
          </motion.h1>
        </div>
        <motion.p
          className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/58"
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Личната ти резервационна страница е готова за 15 минути — без платформи, без комисионни, без зависимост. Клиентите записват час директно при теб.
        </motion.p>
        <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <MagneticCta href="/create" aria-label="Започни сега">
            Започни сега
          </MagneticCta>
          <motion.a
            href="/demo"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/18 px-4 text-sm font-medium text-white/72 shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition hover:border-white/34 hover:text-white"
            whileHover={{ x: 2 }}
          >
            Виж демо
          </motion.a>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {pills.map(pill => (
            <span
              key={pill}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 shadow-[0_10px_22px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:text-sm"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
