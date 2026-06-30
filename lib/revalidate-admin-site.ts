import { revalidateTag } from 'next/cache';

/** Cache tag key used by `loadAdminSiteDataBySlug` (unstable_cache). */
export function adminSiteCacheTag(slug: string): string {
  return `admin-site:${slug}`;
}

/** Invalidate the cached admin site payload for one salon. */
export function revalidateAdminSiteCache(slug: string) {
  const safeSlug = String(slug ?? '').trim();
  if (!safeSlug) return;
  revalidateTag(adminSiteCacheTag(safeSlug));
}
