import { heroLcpImageUrl, r2PreconnectOrigin } from '@/lib/hero-lcp-url';

type Props = {
  imageSrc: string | null | undefined;
};

/** Preconnect + LCP image preload — render early in salon page HTML. */
export function SalonLcpHead({ imageSrc }: Props) {
  const r2Origin = r2PreconnectOrigin();
  const lcpHref = imageSrc ? heroLcpImageUrl(imageSrc) : null;
  const isWebp = Boolean(lcpHref?.includes('.webp'));

  return (
    <>
      {r2Origin ? (
        <>
          <link rel="dns-prefetch" href={r2Origin} />
          <link rel="preconnect" href={r2Origin} crossOrigin="anonymous" />
        </>
      ) : null}
      {lcpHref ? (
        <link
          rel="preload"
          as="image"
          href={lcpHref}
          fetchPriority="high"
          {...(isWebp ? { type: 'image/webp' } : {})}
        />
      ) : null}
    </>
  );
}
