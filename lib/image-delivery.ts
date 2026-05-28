/** Shared image width snapping for /api/image and public URLs. */

export const IMAGE_DELIVERY_WIDTHS = [
  128, 240, 320, 480, 640, 768, 960, 1024, 1280,
] as const;

export type ImageDeliveryWidth = (typeof IMAGE_DELIVERY_WIDTHS)[number];

export function snapImageWidth(requested: number): ImageDeliveryWidth | 0 {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  let best: ImageDeliveryWidth = IMAGE_DELIVERY_WIDTHS[0];
  for (const w of IMAGE_DELIVERY_WIDTHS) {
    if (w <= requested) best = w;
    else break;
  }
  return best;
}

export function parseApiImageKey(src: string): string | null {
  const s = (src ?? '').trim();
  if (!s) return null;
  try {
    const url = s.startsWith('http://') || s.startsWith('https://')
      ? new URL(s)
      : new URL(s, 'https://local.invalid');
    if (!url.pathname.endsWith('/api/image')) return null;
    const key = url.searchParams.get('key');
    return key?.trim() ? key : null;
  } catch {
    return null;
  }
}

/** Normalize R2 public origin — Vercel often stores `pub-xxx.r2.dev` without scheme. */
export function normalizeR2PublicBase(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function r2PublicBase(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_R2_PUBLIC_URL) ||
    (typeof process !== 'undefined' && process.env.R2_PUBLIC_URL) ||
    (typeof process !== 'undefined' && process.env.CLOUDFLARE_R2_PUBLIC_URL) ||
    '';
  return normalizeR2PublicBase(raw);
}

export function r2PublicObjectUrl(key: string): string | null {
  const base = r2PublicBase();
  if (!base || !key.trim()) return null;
  const encoded = key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${base}/${encoded}`;
}

export function keyFromR2PublicUrl(src: string): string | null {
  const normalized = r2PublicBase();
  if (!normalized || !src.startsWith(`${normalized}/`)) return null;
  try {
    const path = src.slice(normalized.length + 1).split('?')[0] ?? '';
    const key = decodeURIComponent(path);
    return key.trim() ? key : null;
  } catch {
    return null;
  }
}
