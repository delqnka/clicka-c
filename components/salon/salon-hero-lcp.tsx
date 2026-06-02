import Image from 'next/image';
import {
  HERO_LCP_WIDTH,
  heroImageSourceUrl,
  heroLcpVariantUrl,
} from '@/lib/hero-lcp-url';

const HERO_HEIGHT = Math.round((HERO_LCP_WIDTH * 4) / 5);

const HERO_CRITICAL_CSS = `
.salon-hero-lcp{overflow:hidden;border-radius:1rem}
.salon-hero-lcp img,.salon-hero-lcp .salon-hero-lcp-img{aspect-ratio:5/4;width:100%;height:auto;object-fit:cover;display:block}
`.trim();

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Server-rendered LCP hero image via next/image optimizer. */
export function SalonHeroLcp({ src, alt, className }: Props) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const imageSrc = heroImageSourceUrl(trimmed);
  if (!imageSrc) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HERO_CRITICAL_CSS }} />
      <div className={`salon-hero-lcp ${className ?? ''}`.trim()}>
        <Image
          src={imageSrc}
          alt={alt}
          width={HERO_LCP_WIDTH}
          height={HERO_HEIGHT}
          priority
          quality={56}
          sizes="(max-width: 768px) 100vw, 640px"
          className="salon-hero-lcp-img"
        />
      </div>
    </>
  );
}

/** @deprecated Use heroLcpImageUrl from @/lib/hero-lcp-url */
export function salonHeroLcpPreloadUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  return heroLcpVariantUrl(trimmed) ?? heroImageSourceUrl(trimmed);
}
