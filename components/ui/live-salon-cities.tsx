'use client';

import { useState, useEffect } from 'react';
import { formatSalonCitiesTrustLine, pickRandomCities } from '@/lib/marketing-activity-shared';

export function LiveSalonCities({ fallback }: { fallback: string }) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    setLine(formatSalonCitiesTrustLine(pickRandomCities()));
  }, []);

  return <>{line ?? fallback}</>;
}
