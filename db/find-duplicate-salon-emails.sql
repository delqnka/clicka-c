-- Run this BEFORE migration-public-api-keys.sql if the UNIQUE INDEX fails with
-- SQLSTATE 23505. Lists salons whose lower(email) collides with another row.
--
-- Once you decide which row to keep, NULL out the email on the others
-- (or merge them) — then re-run the migration.

SELECT
  lower(email)                            AS norm_email,
  COUNT(*)                                AS n,
  array_agg(CAST(id AS text) ORDER BY created_at) AS salon_ids,
  array_agg(slug ORDER BY created_at)     AS slugs,
  array_agg(name ORDER BY created_at)     AS names,
  array_agg(created_at ORDER BY created_at) AS created_ats,
  array_agg(is_active ORDER BY created_at)  AS is_actives
FROM salons
WHERE email IS NOT NULL AND email <> ''
GROUP BY lower(email)
HAVING COUNT(*) > 1
ORDER BY n DESC, norm_email;
