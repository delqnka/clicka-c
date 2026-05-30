import Image from 'next/image';
import { HERO_LCP_WIDTH, heroImageSourceUrl } from '@/lib/hero-lcp-url';
import './salon-critical.css';

const HERO_HEIGHT = Math.round((HERO_LCP_WIDTH * 4) / 5);

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Server-rendered LCP hero — `next/image` priority + WebP resize via Vercel CDN. */
export function SalonHeroLcp({ src, alt, className }: Props) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const imageSrc = heroImageSourceUrl(trimmed);
  if (!imageSrc) return null;

  return (
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
  );
}

/** @deprecated Use heroLcpImageUrl from @/lib/hero-lcp-url */
export function salonHeroLcpPreloadUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  return heroImageSourceUrl(trimmed);
}
