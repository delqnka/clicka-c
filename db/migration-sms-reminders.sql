-- SMS reminder packs & scheduling (run once on Neon or via ensureSmsSchema at runtime)

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS sms_balance integer NOT NULL DEFAULT 0;

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS sms_reminder_mode text NOT NULL DEFAULT 'off';

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS sms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  kind text NOT NULL,
  delta integer NOT NULL,
  balance_after integer,
  booking_id text,
  reminder_id uuid,
  client_phone text,
  stripe_session_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sms_transactions_stripe_session_id_uniq
  ON sms_transactions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL AND stripe_session_id <> '';

CREATE INDEX IF NOT EXISTS sms_transactions_salon_id_idx
  ON sms_transactions(salon_id, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_sms_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  booking_id text NOT NULL,
  kind text NOT NULL,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, kind)
);

CREATE INDEX IF NOT EXISTS booking_sms_reminders_pending_idx
  ON booking_sms_reminders(status, send_at)
  WHERE status = 'pending';
