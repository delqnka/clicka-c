import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const serverDsn = process.env.SENTRY_DSN ?? '';
  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';
  const effectiveDsn = serverDsn || publicDsn;
  const dsnPresent = effectiveDsn.length > 0;

  if (dsnPresent) {
    Sentry.captureMessage('Sentry test — /api/pa/sentry-test fired', 'info');
  }

  return NextResponse.json({
    sentryDsnPresent: dsnPresent,
    sentryDsnSource: serverDsn ? 'SENTRY_DSN' : publicDsn ? 'NEXT_PUBLIC_SENTRY_DSN' : 'none',
    // partial DSN for verification — shows project ID without the secret key
    dsnPreview: effectiveDsn
      ? effectiveDsn.replace(/^(https:\/\/)[^@]+(@.+)$/, '$1***$2')
      : null,
    note: dsnPresent
      ? 'captureMessage fired — проверете Sentry Issues за тест събитие'
      : 'DSN липсва — задайте SENTRY_DSN или NEXT_PUBLIC_SENTRY_DSN в Vercel Environment Variables и направете redeploy',
    instructions: [
      '1. sentry.io → Settings → Projects → вашия проект → Client Keys (DSN)',
      '2. Vercel → Settings → Environment Variables',
      '3. Добавете SENTRY_DSN (server) и NEXT_PUBLIC_SENTRY_DSN (client) — стойността е една и съща DSN',
      '4. Redeploy',
      '5. Извикайте /api/pa/sentry-test отново — трябва да видите събитие в Sentry',
    ],
  });
}
