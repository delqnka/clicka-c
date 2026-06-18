import { NextRequest, NextResponse } from 'next/server';
import { getSalonHomeLegalRewritePath, isPlatformApexHost, ROOT_DOMAIN } from './lib/domain-routing';
import { isSalonPublicPath } from './lib/salon-public-request';

// ─── Bot/scanner path guard ───────────────────────────────────────────────────
const BOT_EXACT_PATHS = new Set([
  '/.env', '/.env.local', '/.env.production', '/.env.development',
  '/.git/config', '/.git/HEAD', '/.ds_store', '/config.json',
  '/server-status', '/server-info', '/server', '/info.php',
  '/phpinfo.php', '/php.ini', '/exec', '/nodesync', '/login.action',
  '/trace.axd', '/v2/_catalog', '/wp-login.php', '/wp-admin',
  '/xmlrpc.php', '/.well-known/security.txt',
]);

const BOT_PREFIX_PATHS = [
  '/.git/', '/.vscode/', '/debug/', '/actuator/', '/telescope/',
  '/s/', '/ecp/',
];

function isBotPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (BOT_EXACT_PATHS.has(lower)) return true;
  return BOT_PREFIX_PATHS.some((prefix) => lower.startsWith(prefix));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // ── Custom client sites ──────────────────────────────────────────────────
  const CUSTOM_SITE_SLUG: string | undefined =
    hostname === 'barber-jet-kappa-92.vercel.app' ||
    (process.env.SUHAIB_DOMAIN && hostname === process.env.SUHAIB_DOMAIN)
      ? 'salon-suhaib'
      : undefined;

  if (CUSTOM_SITE_SLUG) {
    if (isBotPath(pathname)) return new NextResponse(null, { status: 404 });
    requestHeaders.set('x-salon-slug', CUSTOM_SITE_SLUG);
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${CUSTOM_SITE_SLUG}` : `/${CUSTOM_SITE_SLUG}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── Platform apex / localhost ─────────────────────────────────────────────
  if (isPlatformApexHost(hostname)) {
    if (isSalonPublicPath(hostname, pathname)) {
      requestHeaders.set('x-clicka-salon-public', '1');
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Platform subdomains (slug.clicka.bg) ──────────────────────────────────
  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
  if (subdomain && subdomain !== hostname) {
    if (isBotPath(pathname)) return new NextResponse(null, { status: 404 });

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

  // ── Custom domains ────────────────────────────────────────────────────────
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
