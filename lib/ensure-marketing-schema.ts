import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureMarketingSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS ga4_id text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS meta_pixel_id text
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS clarity_id text
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
