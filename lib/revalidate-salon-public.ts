import { revalidatePath, revalidateTag } from 'next/cache';
import { extractHostname, getPlatformSiteHost, isPlatformApexHost } from '@/lib/domain-routing';
import { adminSiteCacheTag } from '@/lib/revalidate-admin-site';

export type SalonCacheIdentity = {
  slug: string;
  customDomain?: string | null;
};

/** Invalidate unstable_cache + ISR for a salon public page (slug path, subdomain, custom domain /). */
export function revalidateSalonPublicCache({ slug, customDomain }: SalonCacheIdentity) {
  const safeSlug = String(slug ?? '').trim();
  if (!safeSlug) return;

  revalidateTag(`salon-public-${safeSlug}`);
  revalidateTag(`salon-public-${getPlatformSiteHost(safeSlug)}`);
  revalidateTag(`salon-blog-${safeSlug}`);
  revalidateTag(adminSiteCacheTag(safeSlug));
  revalidatePath(`/${safeSlug}`);
  revalidatePath(`/${safeSlug}/blog`);

  const domain = extractHostname(customDomain);
  if (domain) {
    revalidateTag(`salon-public-${domain}`);
    revalidateTag(`salon-blog-${safeSlug}`);
    if (domain.startsWith('www.')) {
      revalidateTag(`salon-public-${domain.slice(4)}`);
    } else {
      revalidateTag(`salon-public-www.${domain}`);
    }
    revalidatePath('/');
    revalidatePath('/blog');
  } else if (!isPlatformApexHost(getPlatformSiteHost(safeSlug))) {
    revalidatePath('/blog');
  }
}
