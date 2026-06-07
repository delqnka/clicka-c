import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureCalendarSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS calendar_feed_token text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS external_ics_url text
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
