import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveSalonBySlugOrHost } from '@/lib/admin-auth';
import { ROOT_DOMAIN, extractHostname, getOriginForHost } from '@/lib/domain-routing';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = headers().get('host');
  const hostname = extractHostname(host);
  const salon = await resolveSalonBySlugOrHost({ host: hostname }).catch(() => null);

  const sitemap = salon
    ? `${getOriginForHost(hostname)}/sitemap.xml`
    : `https://www.${ROOT_DOMAIN}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/create', '/claim'],
      },
    ],
    sitemap,
  };
}
