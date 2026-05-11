import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ROOT_DOMAIN = 'clicka.bg';
const ADMIN_COOKIE = 'clicka_admin_session';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function isAdminPath(pathname: string) {
  if (pathname === '/admin') return true;
  if (pathname === '/admin/sign-in') return true;
  if (pathname.startsWith('/api/admin/')) return false;
  // Protect both: /{slug}/admin and /{slug}/admin/* and /admin/*
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.endsWith('/admin') || pathname.includes('/admin/');
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];

  const { pathname } = request.nextUrl;

  if (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  ) {
    // Root domain / localhost: enforce admin protection for path-based admin routes.
    if (isAdminPath(pathname)) {
      // allow sign-in
      if (pathname === '/admin/sign-in') return NextResponse.next();
      // If this is /{slug}/admin/sign-in allow
      if (pathname.endsWith('/admin/sign-in')) return NextResponse.next();

      const sessionId = request.cookies.get(ADMIN_COOKIE)?.value;
      if (!sessionId) {
        const segments = pathname.split('/').filter(Boolean);
        const slug = segments[0];
        const signIn = slug ? `/${slug}/admin/sign-in` : '/admin/sign-in';
        return NextResponse.redirect(new URL(signIn, request.url));
      }

      // Lightweight check: cookie format only. Real session validation happens in API/admin pages.
      // (We can't query DB from middleware reliably across runtimes without extra wiring.)
      if (sha256(sessionId).length !== 64) {
        return NextResponse.redirect(new URL('/admin/sign-in', request.url));
      }
    }

    return NextResponse.next();
  }

  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
  if (subdomain && subdomain !== hostname) {
    // Forward x-salon-slug on the *request* so route handlers can read it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-salon-slug', subdomain);

    // Protect admin on subdomains too (/admin, /{slug}/admin, etc.)
    if (isAdminPath(pathname)) {
      if (pathname === '/admin/sign-in' || pathname.endsWith('/admin/sign-in')) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
      const sessionId = request.cookies.get(ADMIN_COOKIE)?.value;
      if (!sessionId) {
        return NextResponse.redirect(new URL('/admin/sign-in', request.url));
      }
      if (sha256(sessionId).length !== 64) {
        return NextResponse.redirect(new URL('/admin/sign-in', request.url));
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
