import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import {
  ROOT_DOMAIN,
  extractHostname,
  getOriginForHost,
  getPrimaryPublicUrl,
  isPlatformApexHost,
} from '@/lib/domain-routing';
import { buildSalonSitemapEntries } from '@/lib/salon-sitemap';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get('host');
  const hostname = extractHostname(host);

  const salon = await resolveSalonBySlugOrHost({ host: hostname }).catch(() => null);

  if (salon) {
    const salonRows = await sql`
      SELECT custom_domain, domain_status, updated_at
      FROM salons
      WHERE CAST(id AS text) = ${salon.salonId}
      LIMIT 1
    `;
    const row = (salonRows[0] ?? {}) as Record<string, unknown>;
    return buildSalonSitemapEntries(
      salon.salonId,
      salon.slug,
      String(row.custom_domain ?? salon.customDomain ?? ''),
      String(row.domain_status ?? salon.domainStatus ?? ''),
      row.updated_at ? new Date(String(row.updated_at)) : null,
    );
  }

  const entries: MetadataRoute.Sitemap = [
    {
      url: `https://www.${ROOT_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  if (!isPlatformApexHost(hostname)) {
    return entries;
  }

  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, slug, custom_domain, domain_status, updated_at
    FROM salons
    WHERE is_active = true
      AND site_status = 'active'
      AND slug !~* '(test|demo|smoke|sandbox)'
    ORDER BY updated_at DESC
    LIMIT 500
  `;

  for (const row of salons) {
    const s = row as Record<string, unknown>;
    const slug = String(s.slug ?? '');
    const salonId = String(s.salon_id ?? '');
    // Force clicka.bg URLs in the platform sitemap — custom-domain URLs belong
    // in the sitemap served from the custom domain itself, not here.
    const salonEntries = await buildSalonSitemapEntries(
      salonId,
      slug,
      '',
      '',
      s.updated_at ? new Date(String(s.updated_at)) : null,
    );
    entries.push(...salonEntries);
  }

  return entries;
}
