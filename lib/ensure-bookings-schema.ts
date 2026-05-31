import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

/** Ensures `bookings` exists (safe for fresh Neon DBs). */
export async function ensureBookingsSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS bookings (
          id text PRIMARY KEY,
          salon_id text NOT NULL,
          client_name text NOT NULL,
          client_phone text NOT NULL,
          client_email text,
          service_name text NOT NULL,
          service_price numeric,
          service_duration integer,
          date text NOT NULL,
          time text NOT NULL,
          status text NOT NULL DEFAULT 'pending',
          notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          completed_at timestamptz
        )
      `;
      await sql`
        ALTER TABLE bookings
        ALTER COLUMN id SET DEFAULT gen_random_uuid()::text
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS completed_at timestamptz
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS sms_reminder_consent boolean NOT NULL DEFAULT false
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS sms_reminder_consent_at timestamptz
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS offer_id uuid
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS google_review_invite_sent_at timestamptz
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS google_calendar_event_id text
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS bookings_salon_id_idx ON bookings(salon_id)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_unique_idx
        ON bookings(salon_id, date, time)
        WHERE status IN ('pending', 'confirmed')
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
