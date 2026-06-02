ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS salons_stripe_account_id_uniq ON salons(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS salons_stripe_account_id_idx ON salons(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
