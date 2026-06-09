import { heroLcpNextImagePreloadUrl, r2PreconnectOrigin } from '@/lib/hero-lcp-url';

type Props = {
  /** Cover / hero image URL from salon record */
  lcpSrc?: string | null;
};

/** Preconnect R2 + preload LCP hero via /_next/image (matches what <Image priority> fetches). */
export function SalonLcpHead({ lcpSrc }: Props) {
  const r2Origin = r2PreconnectOrigin();
  const trimmed = String(lcpSrc ?? '').trim();
  const preloadHref = trimmed ? heroLcpNextImagePreloadUrl(trimmed) : null;

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
        <link
          rel="preload"
          as="image"
          href={preloadHref}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — imagesizes/imagesrcset are valid preload attrs, not yet in React types
          imagesizes="(max-width: 768px) 100vw, 640px"
          fetchPriority="high"
        />
      ) : null}
    </>
  );
}
