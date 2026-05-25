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

  for (const row of salons) {
    const s = row as Record<string, unknown>;
    entries.push({
      url: getPrimaryPublicUrl({
        slug: String(s.slug ?? ''),
        customDomain: String(s.custom_domain ?? ''),
        domainStatus: String(s.domain_status ?? ''),
      }),
      lastModified: s.updated_at ? new Date(String(s.updated_at)) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}
