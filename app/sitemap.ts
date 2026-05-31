import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { getPrimaryPublicUrl, ROOT_DOMAIN } from '@/lib/domain-routing';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `https://www.${ROOT_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const salons = await sql`
    SELECT slug, custom_domain, domain_status, updated_at
    FROM salons
    WHERE is_active = true AND site_status = 'active'
    ORDER BY updated_at DESC
    LIMIT 500
  `;

  const salonsWithBlog = await sql`
    SELECT DISTINCT s.slug
    FROM salon_blog_posts p
    JOIN salons s ON CAST(s.id AS text) = p.salon_id
    WHERE p.status = 'published'
      AND s.is_active = true
      AND s.site_status = 'active'
  `.catch(() => [] as { slug: string }[]);

  const blogSalonSlugs = new Set(
    (salonsWithBlog as { slug?: string }[]).map((r) => String(r.slug ?? '')),
  );

  for (const row of salons) {
    const s = row as Record<string, unknown>;
    const slug = String(s.slug ?? '');
    const baseUrl = getPrimaryPublicUrl({
      slug,
      customDomain: String(s.custom_domain ?? ''),
      domainStatus: String(s.domain_status ?? ''),
    });
    entries.push({
      url: baseUrl,
      lastModified: s.updated_at ? new Date(String(s.updated_at)) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    if (blogSalonSlugs.has(slug)) {
      entries.push({
        url: `${baseUrl}/blog`,
        lastModified: s.updated_at ? new Date(String(s.updated_at)) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.65,
      });
    }
  }

  const blogPosts = await sql`
    SELECT s.slug, s.custom_domain, s.domain_status, p.slug AS post_slug, p.updated_at
    FROM salon_blog_posts p
    JOIN salons s ON CAST(s.id AS text) = p.salon_id
    WHERE p.status = 'published'
      AND s.is_active = true
      AND s.site_status = 'active'
    ORDER BY p.updated_at DESC
    LIMIT 5000
  `.catch(() => [] as Record<string, unknown>[]);

  for (const row of blogPosts) {
    const s = row as Record<string, unknown>;
    const postSlug = String(s.post_slug ?? '').trim();
    if (!postSlug) continue;
    const baseUrl = getPrimaryPublicUrl({
      slug: String(s.slug ?? ''),
      customDomain: String(s.custom_domain ?? ''),
      domainStatus: String(s.domain_status ?? ''),
    });
    entries.push({
      url: `${baseUrl}/blog/${encodeURIComponent(postSlug)}`,
      lastModified: s.updated_at ? new Date(String(s.updated_at)) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  }

  return entries;
}
