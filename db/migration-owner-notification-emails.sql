-- Additional owner-level recipients for booking/cancellation notifications.
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS owner_notification_emails jsonb NOT NULL DEFAULT '[]'::jsonb;
