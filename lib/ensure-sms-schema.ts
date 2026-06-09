import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureSmsSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

      await sql`
        DO $$ BEGIN
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS sms_balance integer NOT NULL DEFAULT 0;
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS sms_reminder_mode text NOT NULL DEFAULT 'off';
          ALTER TABLE salons ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;
        END $$
      `;

      await sql`
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
        )
      `;
      await sql`
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
        )
      `;

      await Promise.all([
        sql`
          CREATE UNIQUE INDEX IF NOT EXISTS sms_transactions_stripe_session_id_uniq
          ON sms_transactions(stripe_session_id)
          WHERE stripe_session_id IS NOT NULL AND stripe_session_id <> ''
        `,
        sql`
          CREATE INDEX IF NOT EXISTS sms_transactions_salon_id_idx
          ON sms_transactions(salon_id, created_at DESC)
        `,
        sql`
          CREATE INDEX IF NOT EXISTS booking_sms_reminders_pending_idx
          ON booking_sms_reminders(status, send_at)
          WHERE status = 'pending'
        `,
      ]);

      // CHECK constraints — idempotent via pg_constraint lookup
      const [hasReminderStatusCheck, hasReminderKindCheck, hasTransKindCheck] = await Promise.all([
        sql`SELECT 1 FROM pg_constraint WHERE conname='booking_sms_reminders_status_check' AND conrelid='booking_sms_reminders'::regclass`,
        sql`SELECT 1 FROM pg_constraint WHERE conname='booking_sms_reminders_kind_check' AND conrelid='booking_sms_reminders'::regclass`,
        sql`SELECT 1 FROM pg_constraint WHERE conname='sms_transactions_kind_check' AND conrelid='sms_transactions'::regclass`,
      ]);

      await Promise.all([
        !hasReminderStatusCheck.length && sql`
          ALTER TABLE booking_sms_reminders ADD CONSTRAINT booking_sms_reminders_status_check
          CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) NOT VALID
        `,
        !hasReminderKindCheck.length && sql`
          ALTER TABLE booking_sms_reminders ADD CONSTRAINT booking_sms_reminders_kind_check
          CHECK (kind IN ('24h', '1h')) NOT VALID
        `,
        !hasTransKindCheck.length && sql`
          ALTER TABLE sms_transactions ADD CONSTRAINT sms_transactions_kind_check
          CHECK (kind IN ('purchase', 'send', 'skip')) NOT VALID
        `,
      ].filter(Boolean));
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
