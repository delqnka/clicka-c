-- Admin site schema — columns read by loadAdminSiteDataBySlug.
-- Run once per environment (idempotent). Replaces the runtime
-- ensureAdminSiteSchema() call that previously executed on every cold start.
--
-- Usage:
--   psql "$DATABASE_URL" -f db/migration-admin-site-schema.sql

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
  ALTER TABLE salons ADD COLUMN IF NOT EXISTS hero_title text;
  ALTER TABLE salons ADD COLUMN IF NOT EXISTS hero_subtitle text;
END $$;
