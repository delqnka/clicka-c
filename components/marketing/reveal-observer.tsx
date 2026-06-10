'use client';

import { useEffect } from 'react';

export function RevealObserver() {
  useEffect(() => {
    let obs: IntersectionObserver | null = null;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const els = document.querySelectorAll('[data-reveal]');
      obs = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).style.opacity = '1';
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              obs?.unobserve(e.target);
            }
          }),
        { threshold: 0.06, rootMargin: '0px 0px -40px 0px' },
      );
      els.forEach((el) => obs!.observe(el));
    };

    let cancelSchedule: (() => void) | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(setup, { timeout: 2500 });
      cancelSchedule = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(setup, 400);
      cancelSchedule = () => window.clearTimeout(id);
    }

    return () => {
      cancelled = true;
      cancelSchedule?.();
      obs?.disconnect();
    };
  }, []);

  return null;
}
