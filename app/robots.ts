import type { MetadataRoute } from 'next';
import { ROOT_DOMAIN } from '@/lib/domain-routing';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/create', '/claim'],
      },
    ],
    sitemap: `https://www.${ROOT_DOMAIN}/sitemap.xml`,
  };
}
