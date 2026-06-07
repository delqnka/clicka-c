-- Migration: Plan billing — billing_period and plan_expires_at
-- Run once in Neon. Safe to re-run.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS billing_period text;       -- '6m' | '12m'
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- Back-fill existing active salons: treat them as 12-month, expires 12 months from now.
-- (Manual review recommended before running in production.)
-- UPDATE salons
-- SET billing_period = '12m', plan_expires_at = now() + interval '12 months'
-- WHERE is_active = true AND plan_expires_at IS NULL;

-- Migration: track when the current plan period started
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;

-- Migration: track how much was paid for the current plan period
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_paid_amount integer;   -- amount in minor units (стотинки/cents)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_paid_currency text;    -- e.g. 'BGN', 'EUR'
