import { extractHostname, isPlatformApexHost } from '@/lib/domain-routing';

const PLATFORM_RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'claim',
  'cookies',
  'create',
  'demo',
  'privacy',
  'review',
  'success',
  'terms',
]);

/** True for custom domains, platform subdomains, and /{slug} public salon routes. */
export function isSalonPublicPath(hostname: string, pathname: string): boolean {
  const host = extractHostname(hostname);
  if (!isPlatformApexHost(host)) return true;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  if (PLATFORM_RESERVED_SEGMENTS.has(segments[0]!)) return false;
  return true;
}

export function isSalonPublicRequest(headers: Headers): boolean {
  return headers.get('x-clicka-salon-public') === '1';
}
