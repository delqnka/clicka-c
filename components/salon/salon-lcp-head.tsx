import { heroLcpImageUrl, heroLcpVariantUrl, r2PreconnectOrigin } from '@/lib/hero-lcp-url';

type Props = {
  /** Cover / hero image URL from salon record */
  lcpSrc?: string | null;
};

/** Preconnect R2 + preload LCP hero (sidecar WebP when available). */
export function SalonLcpHead({ lcpSrc }: Props) {
  const r2Origin = r2PreconnectOrigin();
  const trimmed = String(lcpSrc ?? '').trim();
  const preloadHref = trimmed
    ? heroLcpVariantUrl(trimmed) ?? heroLcpImageUrl(trimmed)
    : null;

  if (!r2Origin && !preloadHref) return null;

  return (
    <>
      {r2Origin ? (
        <>
          <link rel="dns-prefetch" href={r2Origin} />
          <link rel="preconnect" href={r2Origin} crossOrigin="anonymous" />
        </>
      ) : null}
      {preloadHref ? (
        <link rel="preload" as="image" href={preloadHref} fetchPriority="high" />
      ) : null}
    </>
  );
}
