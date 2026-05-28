'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type DeferredSectionProps = {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  rootMargin?: string;
  /** Optional ref for scroll-spy (always attached to the placeholder section). */
  sectionRef?: (el: HTMLElement | null) => void;
};

/** Mount children only when the section nears the viewport (saves initial render work). */
export function DeferredSection({
  children,
  className,
  minHeight = 1,
  rootMargin = '280px 0px',
  sectionRef,
}: DeferredSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  const setRefs = (el: HTMLElement | null) => {
    ref.current = el;
    sectionRef?.(el);
  };

  useEffect(() => {
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
  }, [visible, rootMargin]);

  return (
    <section ref={setRefs} className={className} style={!visible && minHeight > 0 ? { minHeight } : undefined}>
      {visible ? children : null}
    </section>
  );
}
