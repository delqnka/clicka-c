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
        <p className="mb-4 inline-flex max-w-prose items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
          Уебсайт + резервации
        </p>
        <div className="hero-h1-spotlights max-w-[min(100%,36rem)] sm:max-w-5xl">
          <motion.h1
            className="max-w-5xl text-[clamp(2rem,4.2vw+0.75rem,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[clamp(2.125rem,4.5vw+0.5rem,3.5rem)]"
            id="hero-title"
            initial={{ opacity: 1, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Твоята лична резервационна система.
            <span className="text-white/30"> / </span>
            <span className="text-white/90">Независима от платформи.</span>
          </motion.h1>
        </div>
        <motion.p
          className="mt-6 max-w-lg text-pretty text-base text-white/55"
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
