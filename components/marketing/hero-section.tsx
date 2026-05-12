'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { HeroBackground } from '@/components/marketing/hero-background';
import { MagneticCta } from '@/components/marketing/magnetic-cta';
import { clickaMarketingSite } from '@/lib/clicka-marketing-site';

export function HeroSection() {
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
        <p className="mb-4 flex max-w-prose flex-col gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/50 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            Уебсайт + резервации
          </span>
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-white/40 sm:pl-0 sm:text-xs">
            24/7 ai рецепционист за салона ти
          </span>
        </p>
        <div className="hero-h1-spotlights max-w-[min(100%,36rem)] sm:max-w-5xl">
          <motion.h1
            className="hero-h1-title max-w-5xl text-[clamp(2rem,4.2vw+0.75rem,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[clamp(2.125rem,4.5vw+0.5rem,3.5rem)]"
            id="hero-title"
            initial={{ opacity: 1, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Твоята лична резервационна система.
            <span className="text-white/30"> / </span>
            <span className="text-white/90">Независима от платформи.</span>
          </motion.h1>
          <motion.p
            className="hero-h1-commission mt-4 max-w-5xl text-[clamp(1.5rem,3.6vw+0.45rem,2.85rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:mt-5 sm:text-[clamp(1.65rem,3.9vw+0.35rem,3.1rem)]"
            initial={{ opacity: 1, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            0 % комисионна
          </motion.p>
        </div>
        <motion.p
          className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/55"
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {clickaMarketingSite.description}
        </motion.p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <MagneticCta href="/create" aria-label="Започни създаване на сайт">
            Започни сега
          </MagneticCta>
          <motion.a
            href="#services"
            className="px-2 text-sm font-medium text-white/45 transition hover:text-white/90"
            whileHover={{ x: 2 }}
          >
            Виж как работи →
          </motion.a>
        </div>
      </div>
    </section>
  );
}
