import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

const AUTO_MIGRATE =
  process.env.NODE_ENV !== 'production' ||
  process.env.ADMIN_AUTO_MIGRATE === '1';

/**
 * Ensures every salons column read by loadAdminSiteDataBySlug exists.
 *
 * In production this is a no-op — the canonical migration lives at
 * `db/migration-admin-site-schema.sql` and must be applied during deploy.
 * In dev/preview (or when ADMIN_AUTO_MIGRATE=1) we keep auto-migrating so
 * local schemas don't drift.
 */
export async function ensureAdminSiteSchema() {
  if (!AUTO_MIGRATE) return;
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
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude double precision;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude double precision;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS legal_info jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS site_status text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS faq_items jsonb NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_info jsonb NOT NULL DEFAULT '{}'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_additional_info text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS brand_domains jsonb NOT NULL DEFAULT '[]'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS ga4_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS meta_pixel_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS clarity_id text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from_name text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_domain text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_verified_at timestamptz;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS site_content jsonb NOT NULL DEFAULT '{}'::jsonb;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS hero_title text;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS hero_subtitle text;
        END $$
      `;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
