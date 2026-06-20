import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

/** Ensures every salons column read by loadAdminSiteDataBySlug exists. */
export async function ensureAdminSiteSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`
        DO $$ BEGIN
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_tour_done boolean DEFAULT false;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_code text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_place_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS telegram_chat_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_bio text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS venue_extras jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_hours jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS portfolio_images jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude double precision;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude double precision;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS legal_info jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS site_status text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS faq_items jsonb NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_info jsonb NOT NULL DEFAULT '{}'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_additional_info text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS brand_domains jsonb NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'solo';
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS ga4_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS meta_pixel_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS clarity_id text;
        END $$
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
