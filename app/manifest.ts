import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { extractHostname, isPlatformApexHost } from '@/lib/domain-routing';
import { isEngineOnlyMode } from '@/lib/engine-mode';

export default function manifest(): MetadataRoute.Manifest {
  if (isEngineOnlyMode()) {
    return {
      name: 'Booking Engine',
      short_name: 'Admin',
      description: 'Private booking and administration engine.',
      start_url: '/admin',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#111111',
      icons: [
        {
          src: '/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
    };
  }

  const host = headers().get('host');
  const hostname = extractHostname(host);
  const slugFromSubdomain = headers().get('x-salon-slug');

  const isMarketingApex = isPlatformApexHost(hostname);

  const description =
    'Лична резервационна система и собствен сайт за салона ти — независимо от чужди платформи.';

  const icons: MetadataRoute.Manifest['icons'] = [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/clicka-logo.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/clicka-logo.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
  ];

  if (isMarketingApex) {
    return {
      name: 'Clicka.bg',
      short_name: 'Clicka',
      description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#7c3aed',
      icons,
    };
  }

  const salonSuffix = slugFromSubdomain ? ` — ${slugFromSubdomain}` : '';

  return {
    name: `Clicka${salonSuffix}`,
    short_name: 'Админ',
    description,
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7c3aed',
    icons,
  };
}
