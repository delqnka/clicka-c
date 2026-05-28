import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureGoogleReviewsSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_reviews_cache jsonb DEFAULT '[]'::jsonb
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_reviews_fetched_at timestamptz
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_reviews_rating numeric(3,2)
      `;
      await sql`
        ALTER TABLE salons
        ADD COLUMN IF NOT EXISTS google_reviews_count integer
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
