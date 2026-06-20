-- Owner auth + claim tables
-- Run once in Neon (same database).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_login_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    text NOT NULL,
  token_hash  text NOT NULL,
  email_norm  text,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_tokens_salon_id_idx ON admin_login_tokens(salon_id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_login_tokens_token_hash_uniq ON admin_login_tokens(token_hash);

CREATE TABLE IF NOT EXISTS site_owners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  email_norm  text NOT NULL,
  display_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_owners_email_norm_uniq ON site_owners(email_norm);

CREATE TABLE IF NOT EXISTS salon_owner_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    text NOT NULL,
  owner_id    uuid NOT NULL REFERENCES site_owners(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'owner',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_owner_memberships_salon_owner_uniq
ON salon_owner_memberships(salon_id, owner_id);

CREATE TABLE IF NOT EXISTS salon_claim_otp (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    text NOT NULL,
  email_norm  text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_claim_otp_salon_email_uniq
ON salon_claim_otp(salon_id, email_norm);

CREATE TABLE IF NOT EXISTS owner_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     text NOT NULL,
  owner_id     uuid NOT NULL REFERENCES site_owners(id) ON DELETE CASCADE,
  session_hash text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_sessions_owner_id_idx ON owner_sessions(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS owner_sessions_session_hash_uniq ON owner_sessions(session_hash);
CREATE INDEX IF NOT EXISTS owner_sessions_expires_at_idx ON owner_sessions(expires_at);

ALTER TABLE site_owners ADD COLUMN IF NOT EXISTS display_name text;
