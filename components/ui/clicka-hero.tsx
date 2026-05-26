'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeroText } from '@/components/ui/hero-text';

const TITLE =
  'Независим собствен сайт с резервации за твоя салон.';
const EMPHASIS = 'Готов за 15 минути.';

const CHAR_TITLE =
  'font-display text-[clamp(1.35rem,4.8vw,3rem)] leading-[1.05] font-black text-[#1C1917] tracking-tight';
const CHAR_EMPHASIS =
  'font-display text-[clamp(1.5rem,5.5vw,3.5rem)] leading-none font-black text-[#B07D2E] tracking-tight';

export function ClickaHero() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#FAF8F5] transition-colors duration-700"
    >
      <h1 className="sr-only">
        {TITLE} {EMPHASIS}
      </h1>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)',
          backgroundSize: 'clamp(20px, 5vw, 60px) clamp(20px, 5vw, 60px)',
        }}
        aria-hidden
      />

      <div className="absolute left-8 top-24 h-12 w-12 border-l border-t border-[#E7E5E4]" aria-hidden />
      <div className="absolute bottom-28 right-8 h-12 w-12 border-r border-b border-[#E7E5E4]" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-36 pt-28 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-1.5 text-sm font-semibold text-[#78716C]"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]"
            style={{ boxShadow: '0 0 6px rgba(34,197,94,.55)' }}
            aria-hidden
          />
          clicka.bg
        </motion.div>

        <HeroText
          text={TITLE}
          replayKey={replayKey}
          charClassName={CHAR_TITLE}
          sliceAccentClassName="text-[#B07D2E]"
          sliceMidClassName="text-[#44403C]"
          className="mb-3"
        />

        <HeroText
          text={EMPHASIS}
          replayKey={replayKey}
          charClassName={CHAR_EMPHASIS}
          sliceAccentClassName="text-[#1C1917]"
          sliceMidClassName="text-[#78716C]"
          className="mb-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/create"
            className={cn(
              'inline-flex items-center justify-center rounded-full bg-[#1C1917] px-8 py-3.5',
              'text-base font-bold text-[#FAF8F5] no-underline shadow-[0_4px_24px_rgba(28,25,23,.18)]',
              'transition-transform duration-200 hover:-translate-y-0.5',
            )}
          >
            Създай своя сайт сега →
          </Link>
          <Link
            href="/demo"
            className={cn(
              'inline-flex items-center justify-center rounded-full border-[1.5px] border-[#D6D3D1]',
              'bg-white px-7 py-3.5 text-base font-semibold text-[#1C1917] no-underline',
              'transition-colors duration-200 hover:border-[#A8A29E]',
            )}
          >
            Виж демо →
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-5 text-center text-sm text-[#A8A29E]"
        >
          от 0.82 € / ден · без скрити такси · 0% комисионна · собствен бранд
        </motion.p>
      </div>

      <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08, rotate: 180 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setReplayKey((c) => c + 1)}
          className="rounded-full bg-[#1C1917] p-4 text-[#FAF8F5] shadow-2xl transition-colors duration-300"
          aria-label="Пусни отново анимацията на заглавието"
        >
          <RefreshCw size={22} aria-hidden />
        </motion.button>
        <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-[#A8A29E]">
          Пусни отново анимацията
        </p>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[12] h-24 bg-gradient-to-b from-transparent to-[#FAF8F5]"
        aria-hidden
      />
    </section>
  );
}
