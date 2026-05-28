import { publicImageSrcSet, publicImageUrl } from '@/lib/public-image-url';

const HERO_WIDTHS = [480, 768] as const;
const HERO_QUALITY = 64;

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Server-rendered LCP hero — in initial HTML before client JS (mobile). */
export function SalonHeroLcp({ src, alt, className }: Props) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  const href = publicImageUrl(trimmed, { width: 480, format: 'webp', quality: HERO_QUALITY });
  const srcSet = publicImageSrcSet(trimmed, HERO_WIDTHS, 'webp', HERO_QUALITY);

  return (
    <div className={className ?? 'overflow-hidden rounded-2xl'}>
      <img
        src={href}
        srcSet={srcSet || undefined}
        sizes="100vw"
        alt={alt}
        width={480}
        height={384}
        className="aspect-[5/4] w-full object-cover"
        fetchPriority="high"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
