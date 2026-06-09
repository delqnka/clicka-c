-- Plan lifecycle: scheduled downgrade + payment history
-- Run once — all statements are idempotent

-- Scheduled downgrade fields
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS pending_plan          text,          -- 'solo' | null
  ADD COLUMN IF NOT EXISTS pending_plan_type     text,          -- raw type
  ADD COLUMN IF NOT EXISTS pending_billing_period text;         -- '6m' | '12m'

-- Full payment history (plan_paid_amount stays for quick reads, this adds audit trail)
CREATE TABLE IF NOT EXISTS salon_plan_payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id         text        NOT NULL,
  stripe_session_id text       NOT NULL UNIQUE,
  flow             text        NOT NULL,   -- 'new_plan' | 'plan_renew' | 'plan_upgrade'
  plan             text        NOT NULL,   -- 'solo' | 'team'
  billing_period   text        NOT NULL,   -- '6m' | '12m'
  amount_cents     integer     NOT NULL,
  currency         text        NOT NULL DEFAULT 'EUR',
  paid_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_plan_payments_salon_id_idx ON salon_plan_payments (salon_id);
