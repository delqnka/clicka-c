import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureOffersSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS salon_offers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          title text NOT NULL,
          description text,
          discount numeric(10,2),
          images jsonb NOT NULL DEFAULT '[]'::jsonb,
          is_active boolean NOT NULL DEFAULT true,
          valid_until timestamptz,
          campaign_valid_from timestamptz,
          campaign_valid_until timestamptz,
          max_claims integer,
          total_claims integer NOT NULL DEFAULT 0,
          duration_min integer NOT NULL DEFAULT 60,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        ALTER TABLE salon_offers
        ADD COLUMN IF NOT EXISTS duration_min integer NOT NULL DEFAULT 60
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS salon_offers_salon_id_idx ON salon_offers(salon_id)
      `;
      await sql`
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS offer_id uuid
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
