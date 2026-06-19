import { NextRequest, NextResponse } from 'next/server';

console.error('[MW-STEP1] module init OK');

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.error('[MW-STEP1] fn entered', pathname);

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
