import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureSalonClientsSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS salon_clients (
          id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
          salon_id text NOT NULL,
          name text NOT NULL,
          phone text,
          email text,
          notes text,
          remind_day_before boolean NOT NULL DEFAULT false,
          remind_hour_before boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (salon_id, name)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS salon_clients_salon_id_idx ON salon_clients(salon_id)
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
