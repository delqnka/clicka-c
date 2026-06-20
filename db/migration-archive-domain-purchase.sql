-- Archive the domain purchase request table.
-- After 2026-06: domain billing was removed entirely (owner handles registration
-- + DNS manually outside the app, then uses /api/domain-connect to attach the
-- domain to a salon via Vercel). The data is preserved as `_archive` in case
-- old records need to be audited; nothing in the app reads or writes it.
--
-- After confirming the archive is empty / no longer needed, drop with:
--   DROP TABLE IF EXISTS domain_purchase_requests_archive;

ALTER TABLE IF EXISTS domain_purchase_requests
  RENAME TO domain_purchase_requests_archive;
