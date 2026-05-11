'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const strength = 0.35;
const spring = { stiffness: 150, damping: 15, mass: 0.1 };

const MotionLink = motion(Link);

type MagneticCtaProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
};

export function MagneticCta({
  href,
  children,
  className = '',
  'aria-label': ariaLabel,
}: MagneticCtaProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      x.set((e.clientX - cx) * strength);
      y.set((e.clientY - cy) * strength);
    },
    [x, y]
  );

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <MotionLink
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={[
        'group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full',
        'border border-white/15 bg-white/[0.07] px-8 text-sm font-medium tracking-[-0.02em] text-white',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]',
        'backdrop-blur-xl transition-colors hover:border-accent/40',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      ].join(' ')}
      aria-label={ariaLabel}
    >
      <span
        className="absolute inset-0 -z-10 bg-gradient-to-r from-accent/20 via-white/5 to-accent/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <span className="flex items-center gap-2">
        {children}
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={2}
        />
      </span>
    </MotionLink>
  );
}
