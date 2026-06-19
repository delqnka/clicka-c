import { NextRequest, NextResponse } from 'next/server';

console.error('[MW-STEP1] module init OK');

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  const pathname = request.nextUrl.pathname;
  console.error('[MW-STEP2] fn entered', hostname, pathname);

  const controlSlug =
    hostname === 'barber-jet-kappa-92.vercel.app' ||
    hostname.startsWith('barber-') ||
    hostname === 'salon-paradise.vercel.app' ||
    hostname.startsWith('salon-paradise-')
      ? hostname.startsWith('salon-paradise')
        ? 'salon-paradise'
        : 'salon-suhaib'
      : undefined;

  if (controlSlug) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${controlSlug}` : `/${controlSlug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/salon-home';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.png).*)'],
};
