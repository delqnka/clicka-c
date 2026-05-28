/**
 * Build display URLs with optional width + modern format hints for CDNs that support query params.
 */
export function publicImageUrl(
  src: string,
  opts?: { width?: number; format?: 'webp' | 'avif' | 'auto' }
): string {
  const s = (src ?? '').trim();
  if (!s || s.startsWith('data:')) return s;

  const width = opts?.width;
  const format = opts?.format ?? 'auto';

  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const url = new URL(s);
      if (width && width > 0) url.searchParams.set('w', String(width));
      if (format === 'webp') url.searchParams.set('format', 'webp');
      if (format === 'avif') url.searchParams.set('format', 'avif');
      return url.toString();
    } catch {
      return s;
    }
  }

  const params = new URLSearchParams();
  if (width && width > 0) params.set('w', String(width));
  if (format === 'webp') params.set('format', 'webp');
  if (format === 'avif') params.set('format', 'avif');
  const q = params.toString();
  if (!q) return s;
  const sep = s.includes('?') ? '&' : '?';
  return `${s}${sep}${q}`;
}

export function publicImageSrcSet(src: string, widths: readonly number[], format?: 'webp' | 'auto'): string {
  const s = (src ?? '').trim();
  if (!s || s.startsWith('data:')) return '';
  return widths.map((w) => `${publicImageUrl(src, { width: w, format })} ${w}w`).join(', ');
}
