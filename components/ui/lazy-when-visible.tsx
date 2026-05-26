'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  minHeight?: number;
  rootMargin?: string;
};

export function LazyWhenVisible({
  children,
  className = '',
  style,
  minHeight = 320,
  rootMargin = '200px 0px',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, minHeight: visible ? style?.minHeight : minHeight }}
    >
      {visible ? children : null}
    </div>
  );
}
