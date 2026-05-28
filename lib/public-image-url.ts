import {
  IMAGE_DELIVERY_WIDTHS,
  keyFromR2PublicUrl,
  parseApiImageKey,
  r2PublicObjectUrl,
  snapImageWidth,
} from '@/lib/image-delivery';

/**
 * Build display URLs: direct R2 CDN when possible; /api/image for resized variants.
 */
export function publicImageUrl(
  src: string,
  opts?: { width?: number; format?: 'webp' | 'avif' | 'auto'; quality?: number }
): string {
  const s = (src ?? '').trim();
  if (!s || s.startsWith('data:')) return s;

  const snapped = snapImageWidth(opts?.width ?? 0);
  const key = parseApiImageKey(s) ?? keyFromR2PublicUrl(s);

  if (key) {
    if (snapped > 0) {
      const params = new URLSearchParams({ key, w: String(snapped) });
      if (opts?.quality != null && opts.quality > 0) {
        params.set('q', String(Math.min(100, Math.max(10, Math.round(opts.quality)))));
      }
      return `/api/image?${params.toString()}`;
    }
    const direct = r2PublicObjectUrl(key);
    if (direct) return direct;
    return `/api/image?key=${encodeURIComponent(key)}`;
  }

  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const url = new URL(s);
      if (snapped > 0) url.searchParams.set('w', String(snapped));
      const format = opts?.format ?? 'auto';
      if (format === 'webp') url.searchParams.set('format', 'webp');
      if (format === 'avif') url.searchParams.set('format', 'avif');
      return url.toString();
    } catch {
      return s;
    }
  }

  if (snapped > 0) {
    const params = new URLSearchParams({ w: String(snapped) });
    const format = opts?.format ?? 'auto';
    if (format === 'webp') params.set('format', 'webp');
    if (format === 'avif') params.set('format', 'avif');
    const sep = s.includes('?') ? '&' : '?';
    return `${s}${sep}${params.toString()}`;
  }

  return s;
}

export function publicImageSrcSet(
  src: string,
  widths: readonly number[],
  format?: 'webp' | 'auto',
  quality?: number
): string {
  const s = (src ?? '').trim();
  if (!s || s.startsWith('data:')) return '';
  const unique = [...new Set(widths.map((w) => snapImageWidth(w)).filter((w) => w > 0))];
  if (!unique.length) return '';
  return unique
    .map((w) => `${publicImageUrl(src, { width: w, format, quality })} ${w}w`)
    .join(', ');
}

export { IMAGE_DELIVERY_WIDTHS };
