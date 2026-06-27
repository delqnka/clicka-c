import { NextRequest } from 'next/server';
import { ROOT_DOMAIN, isAdminSubdomainHost, stripAdminSubdomain } from '@/lib/domain-routing';
import { sql } from '@/lib/db';

/**
 * Verify the Origin header on state-mutating requests.
 * Returns null when the origin is allowed, or an error string to return 403.
 *
 * Allowed origins:
 *   - https://*.<ROOT_DOMAIN>  (BRAND apex + subdomains)
 *   - http://localhost:*       (local dev)
 *   - http://*.localhost   (local dev with subdomains)
 *   - any salon custom_domain saved in the DB
 *
 * Requests with no Origin header are allowed only when they also have no
 * Cookie header (server-to-server calls like Stripe webhooks).
 */
export async function checkCsrfOrigin(request: NextRequest): Promise<string | null> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const origin = request.headers.get('origin');
  const hasCookie = !!request.headers.get('cookie');

  if (!origin) {
    // No Origin — only safe if there's also no cookie (server-to-server).
    return hasCookie ? 'Липсва Origin хедър.' : null;
  }

  if (isAllowedOrigin(origin)) return null;

  // Check if origin is a verified custom domain
  if (await isVerifiedCustomDomain(origin)) return null;

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

async function isVerifiedCustomDomain(origin: string): Promise<boolean> {
  try {
    const hostname = new URL(origin).hostname;
    if (!hostname) return false;
    // Try the hostname as-is, then admin-stripped, then www-stripped. DB
    // stores bare domains (e.g. salonurban.online) but the browser Origin
    // can be www.salonurban.online or admin.salonurban.online.
    const candidates = new Set<string>([hostname]);
    if (isAdminSubdomainHost(hostname)) candidates.add(stripAdminSubdomain(hostname));
    if (hostname.startsWith('www.')) candidates.add(hostname.slice(4));

    for (const candidate of candidates) {
      const rows = await sql`
        SELECT 1 FROM salons
        WHERE lower(custom_domain) = lower(${candidate})
        LIMIT 1
      `;
      if (rows.length > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}
