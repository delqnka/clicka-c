import crypto from 'crypto';
import { sql } from '@/lib/db';
import { ensureCalendarSchema } from '@/lib/ensure-calendar-schema';
import { bookingDescription, type CalendarBookingRow } from '@/lib/calendar-ics';
import { parseSofiaAppointment } from '@/lib/sms-shared';

const SOFIA_TZ = 'Europe/Sofia';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export type GoogleCalendarConnection = {
  salonId: string;
  refreshToken: string;
  calendarId: string;
};

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://clicka.bg').replace(/\/+$/, '');
}

function oauthClientId(): string | null {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ||
    null
  );
}

function oauthClientSecret(): string | null {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ||
    null
  );
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(oauthClientId() && oauthClientSecret());
}

export function googleCalendarRedirectUri(): string {
  return `${appBaseUrl()}/api/admin/calendar/google/callback`;
}

function stateSecret(): string {
  return (
    process.env.CALENDAR_OAUTH_STATE_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    'clicka-calendar-oauth'
  );
}

export function signCalendarOAuthState(payload: { salonId: string; slug: string }): string {
  const body = Buffer.from(JSON.stringify({ ...payload, n: crypto.randomBytes(8).toString('hex') })).toString(
    'base64url',
  );
  const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyCalendarOAuthState(state: string): { salonId: string; slug: string } | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      salonId?: string;
      slug?: string;
    };
    if (!parsed.salonId || !parsed.slug) return null;
    return { salonId: parsed.salonId, slug: parsed.slug };
  } catch {
    return null;
  }
}

export function buildGoogleCalendarConnectUrl(salonId: string, slug: string): string {
  const clientId = oauthClientId();
  if (!clientId) throw new Error('Google Calendar OAuth не е конфигуриран.');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCalendarRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: signCalendarOAuthState({ salonId, slug }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeGoogleCode(code: string): Promise<{ refreshToken: string; accessToken: string }> {
  const clientId = oauthClientId();
  const clientSecret = oauthClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar OAuth не е конфигуриран.');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleCalendarRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
  };
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = oauthClientId();
  const clientSecret = oauthClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar OAuth не е конфигуриран.');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || 'Google token refresh failed');
  }
  return data.access_token;
}

export async function saveGoogleCalendarConnection(
  salonId: string,
  refreshToken: string,
  calendarId = 'primary',
): Promise<void> {
  await ensureCalendarSchema();
  await sql`
    UPDATE salons
    SET
      google_calendar_refresh_token = ${refreshToken},
      google_calendar_id = ${calendarId},
      google_calendar_connected_at = now(),
      updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
}

export async function clearGoogleCalendarConnection(salonId: string): Promise<void> {
  await ensureCalendarSchema();
  await sql`
    UPDATE salons
    SET
      google_calendar_refresh_token = NULL,
      google_calendar_id = NULL,
      google_calendar_connected_at = NULL,
      updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
}

export async function loadGoogleCalendarConnection(
  salonId: string,
): Promise<GoogleCalendarConnection | null> {
  await ensureCalendarSchema();
  const rows = await sql`
    SELECT
      google_calendar_refresh_token,
      google_calendar_id
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;
  const row = rows[0] as { google_calendar_refresh_token?: string | null; google_calendar_id?: string | null };
  const refreshToken = String(row?.google_calendar_refresh_token ?? '').trim();
  if (!refreshToken) return null;
  return {
    salonId,
    refreshToken,
    calendarId: String(row?.google_calendar_id ?? 'primary').trim() || 'primary',
  };
}

export async function connectGoogleCalendarFromCode(
  code: string,
): Promise<{ refreshToken: string; accessToken: string }> {
  return exchangeGoogleCode(code);
}

function formatGoogleLocalDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function eventBody(booking: CalendarBookingRow, salonName: string) {
  const start = parseSofiaAppointment(booking.date, booking.time);
  const durationMin = Math.max(5, Number(booking.service_duration ?? 30) || 30);
  const end = new Date(start.getTime() + durationMin * 60_000);

  return {
    summary: `${booking.client_name} – ${booking.service_name}`,
    description: bookingDescription(booking),
    location: salonName,
    start: { dateTime: formatGoogleLocalDateTime(start), timeZone: SOFIA_TZ },
    end: { dateTime: formatGoogleLocalDateTime(end), timeZone: SOFIA_TZ },
  };
}

async function googleCalendarFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function createGoogleCalendarEvent(
  connection: GoogleCalendarConnection,
  booking: CalendarBookingRow,
  salonName: string,
): Promise<string | null> {
  const accessToken = await refreshGoogleAccessToken(connection.refreshToken);
  const res = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(eventBody(booking, salonName)),
    },
  );
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    console.error('[google-calendar] create event', data.error?.message ?? res.status);
    return null;
  }
  return data.id;
}

export async function updateGoogleCalendarEvent(
  connection: GoogleCalendarConnection,
  eventId: string,
  booking: CalendarBookingRow,
  salonName: string,
): Promise<boolean> {
  const accessToken = await refreshGoogleAccessToken(connection.refreshToken);
  const res = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(eventBody(booking, salonName)),
    },
  );
  if (!res.ok) {
    const data = (await res.json()) as { error?: { message?: string } };
    console.error('[google-calendar] update event', data.error?.message ?? res.status);
    return false;
  }
  return true;
}

export async function deleteGoogleCalendarEvent(
  connection: GoogleCalendarConnection,
  eventId: string,
): Promise<boolean> {
  const accessToken = await refreshGoogleAccessToken(connection.refreshToken);
  const res = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  );
  return res.ok || res.status === 404 || res.status === 410;
}

export async function ensureCalendarFeedToken(salonId: string): Promise<string> {
  await ensureCalendarSchema();
  const existing = await sql`
    SELECT calendar_feed_token
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;
  const token = String((existing[0] as { calendar_feed_token?: string })?.calendar_feed_token ?? '').trim();
  if (token) return token;

  const created = crypto.randomBytes(24).toString('hex');
  await sql`
    UPDATE salons
    SET calendar_feed_token = ${created}, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
  return created;
}

export async function resolveSalonByFeedToken(token: string): Promise<{
  salonId: string;
  salonName: string;
} | null> {
  await ensureCalendarSchema();
  const rows = await sql`
    SELECT CAST(id AS text) AS salon_id, name
    FROM salons
    WHERE calendar_feed_token = ${token}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as { salon_id: string; name: string };
  return { salonId: row.salon_id, salonName: String(row.name ?? '') };
}

export type GoogleCalendarListedEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  source: 'google';
};

function googleEventToListed(ev: {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
}): GoogleCalendarListedEvent | null {
  const id = String(ev.id ?? '').trim();
  if (!id) return null;
  const title = String(ev.summary ?? 'Събитие').trim() || 'Събитие';
  const startRaw = ev.start?.dateTime || ev.start?.date;
  const endRaw = ev.end?.dateTime || ev.end?.date || startRaw;
  if (!startRaw) return null;

  const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
  const start = allDay
    ? parseSofiaAppointment(String(startRaw).slice(0, 10), '12:00')
    : new Date(startRaw);
  const end = allDay
    ? parseSofiaAppointment(String(endRaw).slice(0, 10), '12:00')
    : new Date(String(endRaw));

  if (Number.isNaN(start.getTime())) return null;
  const endDate = Number.isNaN(end.getTime()) ? new Date(start.getTime() + 60 * 60_000) : end;

  return {
    id,
    title,
    date: toYmdSofia(start),
    startTime: allDay ? '00:00' : toHmSofia(start),
    endTime: allDay ? '23:59' : toHmSofia(endDate),
    allDay,
    source: 'google',
  };
}

function toYmdSofia(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOFIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toHmSofia(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SOFIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

export async function listGoogleCalendarEvents(
  connection: GoogleCalendarConnection,
  fromYmd: string,
  toYmd: string,
): Promise<GoogleCalendarListedEvent[]> {
  const accessToken = await refreshGoogleAccessToken(connection.refreshToken);
  const timeMin = parseSofiaAppointment(fromYmd, '00:00').toISOString();
  const timeMax = parseSofiaAppointment(toYmd, '23:59').toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events?${params.toString()}`,
  );
  const data = (await res.json()) as { items?: unknown[]; error?: { message?: string } };
  if (!res.ok) {
    console.error('[google-calendar] list events', data.error?.message ?? res.status);
    return [];
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .map((item) => googleEventToListed(item as Parameters<typeof googleEventToListed>[0]))
    .filter((ev): ev is GoogleCalendarListedEvent => ev != null);
}

export async function loadSalonExternalIcsUrl(salonId: string): Promise<string> {
  await ensureCalendarSchema();
  const rows = await sql`
    SELECT external_ics_url FROM salons WHERE CAST(id AS text) = ${salonId} LIMIT 1
  `;
  return String((rows[0] as { external_ics_url?: string })?.external_ics_url ?? '').trim();
}

export async function saveSalonExternalIcsUrl(salonId: string, url: string): Promise<void> {
  await ensureCalendarSchema();
  const normalized = url.trim().replace(/^webcal:\/\//i, 'https://');
  await sql`
    UPDATE salons
    SET external_ics_url = ${normalized || null}, updated_at = now()
    WHERE CAST(id AS text) = ${salonId}
  `;
}
