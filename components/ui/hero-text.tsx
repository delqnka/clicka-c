'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export interface HeroTextProps {
  text?: string;
  className?: string;
  replayKey?: number;
  charClassName?: string;
  sliceAccentClassName?: string;
  sliceMidClassName?: string;
}

export function HeroText({
  text = 'IMMERSE',
  className = '',
  replayKey = 0,
  charClassName = 'text-[15vw] leading-none font-black text-zinc-900 tracking-tighter',
  sliceAccentClassName = 'text-indigo-600',
  sliceMidClassName = 'text-zinc-800',
}: HeroTextProps) {
  const characters = text.split('');

  return (
    <div className={cn('relative z-10 w-full flex flex-col items-center', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={replayKey}
          className="flex flex-wrap justify-center items-center w-full max-w-5xl"
        >
          {characters.map((char, i) => (
            <div key={`${replayKey}-${i}`} className="relative px-[0.1vw] overflow-hidden group">
              <motion.span
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.04 + 0.3, duration: 0.8 }}
                className={charClassName}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>

              <motion.span
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '100%', opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: 'easeInOut' }}
                className={cn(
                  'absolute inset-0 leading-none font-black z-10 pointer-events-none',
                  charClassName,
                  sliceAccentClassName,
                )}
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 35%)' }}
                aria-hidden
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>

              <motion.span
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: '-100%', opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: i * 0.04 + 0.1, ease: 'easeInOut' }}
                className={cn(
                  'absolute inset-0 leading-none font-black z-10 pointer-events-none',
                  charClassName,
                  sliceMidClassName,
                )}
                style={{ clipPath: 'polygon(0 35%, 100% 35%, 100% 65%, 0 65%)' }}
                aria-hidden
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>

              <motion.span
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '100%', opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: i * 0.04 + 0.2, ease: 'easeInOut' }}
                className={cn(
                  'absolute inset-0 leading-none font-black z-10 pointer-events-none',
                  charClassName,
                  sliceAccentClassName,
                )}
                style={{ clipPath: 'polygon(0 65%, 100% 65%, 100% 100%, 0 100%)' }}
                aria-hidden
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
