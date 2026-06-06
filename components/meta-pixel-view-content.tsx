'use client';

import { useEffect } from 'react';

export function MetaPixelViewContent() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent');
    }
  }, []);

  return null;
}
