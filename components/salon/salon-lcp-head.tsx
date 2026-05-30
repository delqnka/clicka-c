import { r2PreconnectOrigin } from '@/lib/hero-lcp-url';

/** Preconnect to R2 — `next/image` priority handles LCP preload for the optimized hero. */
export function SalonLcpHead() {
  const r2Origin = r2PreconnectOrigin();

  if (!r2Origin) return null;

  return (
    <>
      <link rel="dns-prefetch" href={r2Origin} />
      <link rel="preconnect" href={r2Origin} crossOrigin="anonymous" />
    </>
  );
}
