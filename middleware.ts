import { NextRequest, NextResponse } from 'next/server';
import { isPlatformApexHost, ROOT_DOMAIN } from '@/lib/domain-routing';
import { isSalonPublicPath } from '@/lib/salon-public-request';

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
    requestHeaders.set('x-salon-slug', subdomain);
    requestHeaders.set('x-clicka-salon-public', '1');

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/salon-home';
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

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
