import { heroLcpImageUrl } from '@/lib/hero-lcp-url';
import './salon-critical.css';

/** LCP hero: direct R2 CDN when available — avoids /api/image on critical path. */
const HERO_WIDTH = 480;

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Server-rendered LCP hero — in initial HTML before client JS (mobile). */
export function SalonHeroLcp({ src, alt, className }: Props) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const href = heroLcpImageUrl(trimmed);
  if (!href) return null;

  return (
    <div className={`salon-hero-lcp ${className ?? ''}`.trim()}>
      <img
        src={href}
        alt={alt}
        width={HERO_WIDTH}
        height={384}
        fetchPriority="high"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

/** @deprecated Use heroLcpImageUrl from @/lib/hero-lcp-url */
export function salonHeroLcpPreloadUrl(src: string): string | null {
  return heroLcpImageUrl(src);
}
