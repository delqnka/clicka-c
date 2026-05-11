-- Admin auth tables for magic-link login
-- Run once in Neon (same database).

CREATE TABLE IF NOT EXISTS admin_login_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_tokens_salon_id_idx ON admin_login_tokens(salon_id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_login_tokens_token_hash_uniq ON admin_login_tokens(token_hash);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  session_hash text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_salon_id_idx ON admin_sessions(salon_id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_session_hash_uniq ON admin_sessions(session_hash);

