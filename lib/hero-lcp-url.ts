import { keyFromR2PublicUrl, parseApiImageKey, r2PublicBase, r2PublicObjectUrl } from '@/lib/image-delivery';
import { publicImageUrl } from '@/lib/public-image-url';

const HERO_WIDTH = 480;
const HERO_QUALITY = 58;

/**
 * Fast LCP delivery: use R2 CDN directly when possible (uploads are WebP ≤2048px).
 * Avoids /api/image serverless + Sharp on the critical path.
 */
export function heroLcpImageUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  if (keyFromR2PublicUrl(trimmed)) {
    return trimmed.split('?')[0] ?? trimmed;
  }

  const key = parseApiImageKey(trimmed);
  if (key && r2PublicBase()) {
    const direct = r2PublicObjectUrl(key);
    if (direct) return direct;
  }

  return publicImageUrl(trimmed, { width: HERO_WIDTH, format: 'webp', quality: HERO_QUALITY });
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
