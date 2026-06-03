-- Migration: Plan billing — billing_period and plan_expires_at
-- Run once in Neon. Safe to re-run.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS billing_period text;       -- '6m' | '12m'
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- Back-fill existing active salons: treat them as 12-month, expires 12 months from now.
-- (Manual review recommended before running in production.)
-- UPDATE salons
-- SET billing_period = '12m', plan_expires_at = now() + interval '12 months'
-- WHERE is_active = true AND plan_expires_at IS NULL;
