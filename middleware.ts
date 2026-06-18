import { NextResponse } from 'next/server';
import { isPlatformApexHost } from '@/lib/domain-routing';

void isPlatformApexHost; // import-only test

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
