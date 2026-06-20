-- Phase 5C: drop legacy SaaS schema after engine refactor.
-- Safe to run when: code is on the white-label engine (Clicka.bg or branded).
-- Code no longer reads any of these. Re-run is idempotent.

-- Tables ────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS plan_grants;
DROP TABLE IF EXISTS promo_campaigns;
DROP TABLE IF EXISTS promo_campaign_redemptions;
DROP TABLE IF EXISTS salon_plan_payments;

-- Legacy SaaS billing/lifecycle columns on salons ───────────────────────────
ALTER TABLE salons DROP COLUMN IF EXISTS billing_period;
ALTER TABLE salons DROP COLUMN IF EXISTS plan_started_at;
ALTER TABLE salons DROP COLUMN IF EXISTS plan_expires_at;
ALTER TABLE salons DROP COLUMN IF EXISTS plan_paid_amount;
ALTER TABLE salons DROP COLUMN IF EXISTS plan_paid_currency;
ALTER TABLE salons DROP COLUMN IF EXISTS pending_plan;
ALTER TABLE salons DROP COLUMN IF EXISTS pending_billing_period;

-- Kept on purpose:
--   plan          — used for staff/feature limits (solo|team)
--   plan_type     — legacy SaaS bonus marker, still surfaced in PA dashboard
--   stripe_*      — Connect onboarding fields, still in use
