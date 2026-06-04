CREATE TABLE IF NOT EXISTS plan_grants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  plan_type  text NOT NULL,
  token      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz,
  salon_id   text
);

CREATE INDEX IF NOT EXISTS plan_grants_email_idx ON plan_grants (lower(email));
CREATE INDEX IF NOT EXISTS plan_grants_token_idx ON plan_grants (token);
