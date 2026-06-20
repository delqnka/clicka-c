-- Adds a UNIQUE INDEX on lower(email) for salons to close the race condition
-- in /api/pa/salons provisioning (two concurrent POSTs with the same email
-- could both pass the duplicate-check before either INSERT).
--
-- ⚠ This will fail with SQLSTATE 23505 if the table already contains
-- duplicate emails. Run db/find-duplicate-salon-emails.sql first, decide
-- which row to keep, then NULL out or update the email on the duplicates,
-- THEN run this migration.
--
-- Quick cleanup pattern (only if you trust "keep the oldest" — review
-- before running):
--
--   UPDATE salons SET email = NULL
--   WHERE id IN (
--     SELECT id FROM (
--       SELECT id,
--              row_number() OVER (PARTITION BY lower(email) ORDER BY created_at) AS rn
--       FROM salons
--       WHERE email IS NOT NULL AND email <> ''
--     ) t WHERE rn > 1
--   );

CREATE UNIQUE INDEX IF NOT EXISTS idx_salons_email_lower
  ON salons (lower(email))
  WHERE email IS NOT NULL AND email <> '';
