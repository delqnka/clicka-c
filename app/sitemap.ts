import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import {
  ROOT_DOMAIN,
  extractHostname,
  isPlatformApexHost,
} from '@/lib/domain-routing';
import { buildSalonSitemapEntries } from '@/lib/salon-sitemap';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Marketing pages that belong on clicka.bg — excluded: /claim, /create, /cookies, /success, /create/preview
const PLATFORM_PAGES: MetadataRoute.Sitemap = [
  { url: `https://www.${ROOT_DOMAIN}`, changeFrequency: 'weekly', priority: 1 },
  { url: `https://www.${ROOT_DOMAIN}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `https://www.${ROOT_DOMAIN}/features`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `https://www.${ROOT_DOMAIN}/faq`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `https://www.${ROOT_DOMAIN}/za-frizyorski-salon`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `https://www.${ROOT_DOMAIN}/za-manikyurist`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `https://www.${ROOT_DOMAIN}/demo`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `https://www.${ROOT_DOMAIN}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `https://www.${ROOT_DOMAIN}/terms`, changeFrequency: 'yearly', priority: 0.3 },
];

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

  if (!isPlatformApexHost(hostname)) {
    return [{ url: `https://www.${ROOT_DOMAIN}`, changeFrequency: 'weekly', priority: 1 }];
  }

  const now = new Date();
  return PLATFORM_PAGES.map((entry) => ({ ...entry, lastModified: now }));
}
