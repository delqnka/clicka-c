import { sql } from '@/lib/db';
import { ensureSmsSchema } from '@/lib/ensure-sms-schema';

let ensurePromise: Promise<void> | null = null;

/** Ensures every salons column read by loadAdminSiteDataBySlug exists. */
export async function ensureAdminSiteSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await ensureSmsSchema();

      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_tour_done boolean DEFAULT false`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_code text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_place_id text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS telegram_chat_id text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_bio text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS venue_extras jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_hours jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS portfolio_images jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude double precision`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude double precision`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS legal_info jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS site_status text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS faq_items jsonb NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_info jsonb NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS visitor_additional_info text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS brand_domains jsonb NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'solo'`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS billing_period text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_started_at timestamptz`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_paid_amount integer`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_paid_currency text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_id text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false`;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
