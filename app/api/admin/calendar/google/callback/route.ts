import { NextRequest, NextResponse } from 'next/server';
import { getHostAwareSalonPath } from '@/lib/domain-routing';
import {
  connectGoogleCalendarFromCode,
  saveGoogleCalendarConnection,
  verifyCalendarOAuthState,
} from '@/lib/google-calendar';
import { syncAllBookingsToGoogleCalendar } from '@/lib/calendar-sync';
import { runAfterResponse } from '@/lib/run-after-response';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');

  const fallbackRedirect = (params: Record<string, string>) => {
    const host = request.headers.get('host');
    const base = getHostAwareSalonPath({ host, slug: '', path: 'admin' });
    const url = new URL(base, `https://${host ?? 'clicka.bg'}`);
    url.searchParams.set('tab', 'integrations');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url.toString());
  };

  if (oauthError) {
    return fallbackRedirect({ calendar: 'error', reason: oauthError });
  }

  if (!code || !state) {
    return fallbackRedirect({ calendar: 'error', reason: 'missing_code' });
  }

  const parsed = verifyCalendarOAuthState(state);
  if (!parsed) {
    return fallbackRedirect({ calendar: 'error', reason: 'invalid_state' });
  }

  try {
    const tokens = await connectGoogleCalendarFromCode(code);
    if (!tokens.refreshToken) {
      return fallbackRedirect({ calendar: 'error', reason: 'missing_refresh_token' });
    }

    await saveGoogleCalendarConnection(parsed.salonId, tokens.refreshToken);

    const salonRows = await sql`
      SELECT name FROM salons WHERE CAST(id AS text) = ${parsed.salonId} LIMIT 1
    `;
    const salonName = String((salonRows[0] as { name?: string })?.name ?? '');

    runAfterResponse(
      syncAllBookingsToGoogleCalendar(parsed.salonId, salonName).catch((err) =>
        console.error('[calendar callback] initial sync', err),
      ),
    );

    const host = request.headers.get('host');
    const adminUrl = getHostAwareSalonPath({
      host,
      slug: parsed.slug,
      path: 'admin',
    });
    const url = new URL(adminUrl, `https://${host ?? 'clicka.bg'}`);
    url.searchParams.set('tab', 'integrations');
    url.searchParams.set('calendar', 'connected');
    return NextResponse.redirect(url.toString());
  } catch (err) {
    console.error('[calendar callback]', err);
    return fallbackRedirect({ calendar: 'error', reason: 'connect_failed' });
  }
}
