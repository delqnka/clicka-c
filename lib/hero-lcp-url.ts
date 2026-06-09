import { keyFromR2PublicUrl, parseApiImageKey, r2PublicBase, r2PublicObjectUrl } from '@/lib/image-delivery';
import { publicImageUrl } from '@/lib/public-image-url';

/** ~2× mobile hero width for crisp LCP without overserving (Lighthouse ~721px displayed). */
export const HERO_LCP_WIDTH = 640;
export const HERO_LCP_QUALITY = 56;

/** Original image URL for `next/image` optimizer (resize + WebP + edge cache). */
export function heroImageSourceUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.split('?')[0] ?? trimmed;
  }

  if (trimmed.startsWith('/')) return trimmed;

  const key = parseApiImageKey(trimmed);
  if (key && r2PublicBase()) {
    const direct = r2PublicObjectUrl(key);
    if (direct) return direct;
  }

  return trimmed;
}

/**
 * Sized WebP URL for manual preload / legacy img.
 * Prefer `next/image` with `heroImageSourceUrl` — Vercel caches `/_next/image`.
 */
export function heroLcpImageUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  return publicImageUrl(trimmed, {
    width: HERO_LCP_WIDTH,
    format: 'webp',
    quality: HERO_LCP_QUALITY,
  });
}

export function r2PreconnectOrigin(): string | null {
  const base = r2PublicBase();
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/** Sidecar key for a pre-generated hero variant (upload pipeline). */
export function heroLcpVariantKey(key: string): string {
  if (/-lcp-640\.webp$/i.test(key)) return key;
  return key.replace(/\.(webp|jpe?g|png|gif)$/i, '-lcp-640.webp');
}

/**
 * Returns the /_next/image URL that <Image priority width={640} quality={56}> will actually fetch.
 * Using this for <link rel="preload"> ensures the preload hits the browser cache.
 */
export function heroLcpNextImagePreloadUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  const originalUrl = heroImageSourceUrl(trimmed);
  if (!originalUrl) return null;
  return `/_next/image?url=${encodeURIComponent(originalUrl)}&w=${HERO_LCP_WIDTH}&q=${HERO_LCP_QUALITY}`;
}

export function heroLcpVariantUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  const key = parseApiImageKey(trimmed) ?? keyFromR2PublicUrl(trimmed);
  if (!key || !r2PublicBase()) return null;
  return r2PublicObjectUrl(heroLcpVariantKey(key));
}
