'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type DeferredSectionProps = {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  rootMargin?: string;
  /** Render immediately (offers, services) instead of waiting for scroll. */
  eager?: boolean;
  /** Optional ref for scroll-spy (always attached to the placeholder section). */
  sectionRef?: (el: HTMLElement | null) => void;
};

/** Mount children only when the section nears the viewport (saves initial render work). */
export function DeferredSection({
  children,
  className,
  minHeight = 1,
  rootMargin = '480px 0px',
  eager = false,
  sectionRef,
}: DeferredSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  // Always render on server (SSR) to avoid hydration mismatch.
  // On client, start deferred unless eager.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const setRefs = (el: HTMLElement | null) => {
    ref.current = el;
    sectionRef?.(el);
  };

  useEffect(() => {
    setMounted(true);
    if (eager) setVisible(true);
  }, [eager]);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el || visible) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, visible, rootMargin]);

  // SSR and pre-mount: always render children (no placeholder).
  // After mount: show placeholder until visible.
  const showChildren = !mounted || visible;

  return (
    <section
      ref={setRefs}
      className={className}
      style={mounted && !visible && minHeight > 0 ? { minHeight } : undefined}
    >
      {showChildren ? children : null}
    </section>
  );
}
