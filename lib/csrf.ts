import { NextRequest } from 'next/server';
import { ROOT_DOMAIN } from '@/lib/domain-routing';

/**
 * Verify the Origin header on state-mutating requests.
 * Returns null when the origin is allowed, or an error string to return 403.
 *
 * Allowed origins:
 *   - https://*.clicka.bg  (production subdomains + apex)
 *   - http://localhost:*   (local dev)
 *   - http://*.localhost   (local dev with subdomains)
 *
 * Requests with no Origin header are allowed only when they also have no
 * Cookie header (server-to-server calls like Stripe webhooks).
 */
export function checkCsrfOrigin(request: NextRequest): string | null {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const origin = request.headers.get('origin');
  const hasCookie = !!request.headers.get('cookie');

  if (!origin) {
    // No Origin — only safe if there's also no cookie (server-to-server).
    return hasCookie ? 'Липсва Origin хедър.' : null;
  }

  if (isAllowedOrigin(origin)) return null;

  return 'Невалиден Origin.';
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // localhost dev
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;

    // production: apex or any subdomain of ROOT_DOMAIN
    if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) return true;

    return false;
  } catch {
    return false;
  }
}
