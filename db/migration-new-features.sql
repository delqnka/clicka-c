-- Migration: Telegram onboarding, Google Review flow, completed booking status
-- Run once in Neon. All columns use IF NOT EXISTS / DEFAULT so it's safe to re-run.

-- Telegram onboarding code — owner sends /start <code> to the bot
ALTER TABLE salons ADD COLUMN IF NOT EXISTS onboarding_code text;
-- Back-fill: use first 8 chars of slug hash for existing salons
UPDATE salons
SET onboarding_code = upper(substring(md5(slug), 1, 8))
WHERE onboarding_code IS NULL;
-- Unique index so the webhook lookup is fast
CREATE UNIQUE INDEX IF NOT EXISTS salons_onboarding_code_uniq ON salons(onboarding_code)
WHERE onboarding_code IS NOT NULL;

-- Telegram Chat ID saved after owner completes /start onboarding
ALTER TABLE salons ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Google Place ID for the review invitation link (already added in salon-public-schema.sql,
-- included here as IF NOT EXISTS so this file is standalone-safe)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_place_id text;

-- Auto-generate booking id on insert (fixes 500 when client POST omits id)
ALTER TABLE bookings ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- completed_at on bookings — set when status flips to 'completed'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_reminder_consent boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_reminder_consent_at timestamptz;

-- Index for fast lookups of completed bookings
CREATE INDEX IF NOT EXISTS bookings_completed_at_idx ON bookings(completed_at)
WHERE completed_at IS NOT NULL;
