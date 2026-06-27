-- Drop legacy DNS-verification columns from salons.
--
-- Clicka is a white-label engine, not a SaaS. The agency sets up DNS
-- manually in Vercel, so there is no automated verification step and no
-- meaningful status to track. App code has been updated to stop reading
-- these columns; running this migration removes them from the schema.
--
-- Safe to re-run (IF EXISTS).

ALTER TABLE salons DROP COLUMN IF EXISTS domain_status;
ALTER TABLE salons DROP COLUMN IF EXISTS domain_verified_at;
ALTER TABLE salons DROP COLUMN IF EXISTS domain_last_checked_at;
ALTER TABLE salons DROP COLUMN IF EXISTS domain_config;
