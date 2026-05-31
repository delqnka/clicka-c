import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureCalendarSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_calendar_id text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_calendar_connected_at timestamptz
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS calendar_feed_token text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS external_ics_url text
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS google_calendar_event_id text
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
