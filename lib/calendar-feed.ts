import crypto from 'crypto';
import { sql } from '@/lib/db';
import { ensureCalendarSchema } from '@/lib/ensure-calendar-schema';

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
