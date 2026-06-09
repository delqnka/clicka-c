'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Placeholder height while waiting to enter viewport */
  minHeight?: number;
  rootMargin?: string;
};

/** Mount children only when the placeholder nears the viewport (saves image/JS work on initial load). */
export function DeferredMount({ children, minHeight = 120, rootMargin = '280px 0px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ minHeight }} aria-hidden />}
    </div>
  );
}
