-- Stripe webhook idempotency table.
-- Run once in Neon SQL Editor before deploying.
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id   text        PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
