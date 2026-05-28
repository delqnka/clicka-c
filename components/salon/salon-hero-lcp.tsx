import { publicImageUrl } from '@/lib/public-image-url';
import './salon-critical.css';

/** LCP hero: one fixed 480px WebP — no srcset (avoids 768w on 2x DPR and wasted preload). */
const HERO_WIDTH = 480;
const HERO_QUALITY = 58;

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Server-rendered LCP hero — in initial HTML before client JS (mobile). */
export function SalonHeroLcp({ src, alt, className }: Props) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const href = publicImageUrl(trimmed, { width: HERO_WIDTH, format: 'webp', quality: HERO_QUALITY });

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

export function salonHeroLcpPreloadUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  return publicImageUrl(trimmed, { width: HERO_WIDTH, format: 'webp', quality: HERO_QUALITY });
}
