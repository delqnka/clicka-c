-- Booking payments: payment_type per service, payment tracking per booking
-- Run once in Neon Console after migration-stripe-connect.sql

-- bookings: payment tracking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status       text NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid          integer; -- cents

CREATE INDEX IF NOT EXISTS bookings_stripe_session_idx
  ON bookings(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
