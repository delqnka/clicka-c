import { NextResponse } from 'next/server';

console.error('[MW-MIN] module init OK');

export function middleware() {
  console.error('[MW-MIN] fn entered');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
