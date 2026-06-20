-- Per-salon Resend configuration (white-label email sender)
-- One central Resend account can verify many client domains.
-- Each salon stores only the sender identity used for its emails.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_api_key_encrypted text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from_name text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_domain text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_verified_at timestamptz;
