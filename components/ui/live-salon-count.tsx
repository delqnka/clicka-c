'use client';

import { useState, useEffect } from 'react';

export function LiveSalonCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(Math.floor(Math.random() * 9) + 2); // 2–10
  }, []);

  return (
    <span className="font-semibold tabular-nums text-[var(--foreground)]">
      {count ?? 4}
    </span>
  );
}
