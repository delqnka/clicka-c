import { NextRequest, NextResponse } from 'next/server';
import { ROOT_DOMAIN } from '@/lib/domain-routing';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];

  if (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  ) {
    return NextResponse.next();
  }

  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
  if (subdomain && subdomain !== hostname) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-salon-slug', subdomain);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
