-- Drops all SMS-related schema after SMSAPI integration removal.
-- Run after deploying the engine version that no longer references these columns.
-- Idempotent (IF EXISTS).

DROP TABLE IF EXISTS sms_transactions;
DROP TABLE IF EXISTS sms_reminders;

ALTER TABLE salons   DROP COLUMN IF EXISTS sms_balance;
ALTER TABLE salons   DROP COLUMN IF EXISTS sms_enabled;
ALTER TABLE salons   DROP COLUMN IF EXISTS sms_reminder_mode;

ALTER TABLE bookings DROP COLUMN IF EXISTS sms_reminder_consent;
ALTER TABLE bookings DROP COLUMN IF EXISTS sms_reminder_consent_at;
