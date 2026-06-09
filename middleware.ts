import { NextRequest, NextResponse } from 'next/server';
import { getSalonHomeLegalRewritePath, isPlatformApexHost, ROOT_DOMAIN } from '@/lib/domain-routing';
import { isSalonPublicPath } from '@/lib/salon-public-request';

// ─── Bot/scanner path guard (само за salon subdomains) ────────────────────────
// Точни пътища (case-insensitive)
const BOT_EXACT_PATHS = new Set([
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.env.development',
  '/.git/config',
  '/.git/HEAD',
  '/.ds_store',
  '/config.json',
  '/server-status',
  '/server-info',
  '/server',
  '/info.php',
  '/phpinfo.php',
  '/php.ini',
  '/exec',
  '/nodesync',
  '/login.action',
  '/trace.axd',
  '/v2/_catalog',
  '/wp-login.php',
  '/wp-admin',
  '/xmlrpc.php',
  '/.well-known/security.txt',
]);

// Префикси — всичко под тях е блокирано
const BOT_PREFIX_PATHS = [
  '/.git/',
  '/.vscode/',
  '/debug/',
  '/actuator/',
  '/telescope/',
  '/s/',           // Jira path traversal
  '/ecp/',         // Exchange traversal
];

function isBotPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (BOT_EXACT_PATHS.has(lower)) return true;
  return BOT_PREFIX_PATHS.some((prefix) => lower.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  if (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  ) {
    if (isSalonPublicPath(hostname, pathname)) {
      requestHeaders.set('x-clicka-salon-public', '1');
    }

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/marketing-home';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
  if (subdomain && subdomain !== hostname) {
    // Блокирай bot/scanner пътища веднага — без да стигат до Next.js routing
    if (isBotPath(pathname)) {
      return new NextResponse(null, { status: 404 });
    }

    requestHeaders.set('x-salon-slug', subdomain);
    requestHeaders.set('x-clicka-salon-public', '1');

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/salon-home';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    const legalRewrite = getSalonHomeLegalRewritePath(pathname);
    if (legalRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = legalRewrite;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set('x-clicka-salon-public', '1');

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = isPlatformApexHost(hostname) ? '/marketing-home' : '/salon-home';
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  const legalRewrite = getSalonHomeLegalRewritePath(pathname);
  if (legalRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = legalRewrite;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
