import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { getPrimaryPublicUrl } from '@/lib/domain-routing';

export async function buildSalonSitemapEntries(
  salonId: string,
  slug: string,
  customDomain: string,
  domainStatus: string,
  updatedAt?: Date | null,
): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPrimaryPublicUrl({ slug, customDomain, domainStatus });
  const lastModified = updatedAt ?? new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const blogCount = await sql`
    SELECT COUNT(*)::int AS count
    FROM salon_blog_posts
    WHERE salon_id = ${salonId} AND status = 'published'
  `.catch(() => [{ count: 0 }]);

  const hasBlog = Number((blogCount[0] as { count?: number })?.count ?? 0) > 0;
  if (hasBlog) {
    entries.push({
      url: `${baseUrl}/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.75,
    });
  }

  const posts = await sql`
    SELECT slug AS post_slug, updated_at, published_at
    FROM salon_blog_posts
    WHERE salon_id = ${salonId} AND status = 'published'
    ORDER BY published_at DESC NULLS LAST
    LIMIT 500
  `.catch(() => [] as Record<string, unknown>[]);

  for (const row of posts) {
    const postSlug = String((row as { post_slug?: string }).post_slug ?? '').trim();
    if (!postSlug) continue;
    const postUpdated = (row as { updated_at?: string; published_at?: string }).updated_at
      ?? (row as { published_at?: string }).published_at;
    entries.push({
      url: `${baseUrl}/blog/${encodeURIComponent(postSlug)}`,
      lastModified: postUpdated ? new Date(String(postUpdated)) : lastModified,
      changeFrequency: 'monthly',
      priority: 0.65,
    });
  }

  return entries;
}
