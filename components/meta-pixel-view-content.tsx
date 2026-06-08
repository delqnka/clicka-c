'use client';

import { useEffect } from 'react';
import { trackViewContent } from '@/lib/tracking-events';

export function MetaPixelViewContent() {
  useEffect(() => {
    trackViewContent();
  }, []);

  return null;
}
