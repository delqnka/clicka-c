-- Public API keys for white-label engine clients.
-- Each salon can have one or more API keys used by external custom frontends
-- (e.g. paradise.bg, hairandart.bg) to call /api/public/* endpoints.

CREATE TABLE IF NOT EXISTS public_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      text NOT NULL,
  key_prefix    text NOT NULL,          -- first 8 chars, shown in UI for identification
  key_hash      text NOT NULL UNIQUE,   -- sha256(api_key) — never store the plaintext
  label         text,                   -- e.g. "paradise.bg production"
  scopes        text[] DEFAULT ARRAY['read','book']::text[],
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_public_api_keys_salon  ON public_api_keys(salon_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_public_api_keys_hash   ON public_api_keys(key_hash) WHERE revoked_at IS NULL;

-- NOTE: the UNIQUE INDEX on lower(email) for salons was moved to
-- db/migration-salons-email-unique.sql because it depends on duplicate-email
-- cleanup that has to happen first. See that file for details.
