'use client';

import React, { useEffect, useRef, useState } from 'react';

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Stacking order for sticky scroll sections */
  index?: number;
  'aria-label'?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  index = 0,
  'aria-label': ariaLabel,
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    className={cx(
      'sticky top-0 min-h-[60vh] sm:min-h-screen sm:min-h-[100dvh] w-full overflow-hidden',
      className,
    )}
    style={{ zIndex: index + 1, ...style }}
  >
    <div
      data-flow-inner
      className={cx(
        'flow-art-container relative flex min-h-[60vh] sm:min-h-screen sm:min-h-[100dvh] w-full flex-col px-[5vw] pt-[clamp(5rem,10vw,7rem)] pb-[5vw]',
        'will-change-transform',
      )}
      style={{ transformOrigin: 'bottom left', contain: 'layout style paint' }}
    >
      {children}
    </div>
  </section>
);

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  'aria-label': ariaLabel = 'Story scroll',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!mounted || reducedMotion || !containerRef.current) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !containerRef.current) return;

      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      ctx = gsap.context(() => {
        const sections = Array.from(
          containerRef.current!.querySelectorAll<HTMLElement>('[data-flow-section]'),
        );
        if (sections.length === 0) return;

        sections.forEach((section, i) => {
          const inner = section.querySelector<HTMLElement>('.flow-art-container');
          if (!inner) return;

          if (i === 0) {
            gsap.set(inner, { yPercent: 8, scale: 0.96, opacity: 0 });
            gsap.to(inner, {
              yPercent: 0,
              scale: 1,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'top 40%',
                scrub: true,
              },
            });
          } else {
            gsap.set(inner, { rotation: 30, transformOrigin: 'bottom left' });
            gsap.to(inner, {
              rotation: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'top 25%',
                scrub: true,
              },
            });
          }
        });

        requestAnimationFrame(() => ScrollTrigger.refresh());
      }, containerRef.current);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [mounted, reducedMotion]);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      aria-label={ariaLabel}
      role="region"
      className={cx('w-full overflow-x-hidden', className)}
    >
      {children}
    </div>
  );
};

export default FlowArt;
