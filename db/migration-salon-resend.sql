-- Per-salon Resend configuration (white-label email sender)
-- API key is stored encrypted at rest via lib/encryption.ts (AES-256-GCM).
-- Fallback to platform RESEND_API_KEY / brand sender when columns are NULL.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_api_key_encrypted text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS email_from_name text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS resend_verified_at timestamptz;
