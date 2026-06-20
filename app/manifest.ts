import type { MetadataRoute } from 'next';
import { isEngineOnlyMode } from '@/lib/engine-mode';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: isEngineOnlyMode() ? 'Booking Engine' : 'Booking Platform',
    short_name: 'Admin',
    description: 'Private booking and administration workspace.',
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
