-- Scale indexes for bookings table.
--
-- Rationale: at 100+ salons and 3M+ booking rows, the calendar view and
-- occupied-slots endpoint ([app/api/bookings/route.ts:93](app/api/bookings/route.ts))
-- both filter by (salon_id, date). The existing single-column indexes do not
-- combine efficiently; without a compound index Postgres falls back to
-- bitmap-heap scans that grow linearly with the tenants' shared history.
--
-- Uses CONCURRENTLY so this can be run against a production DB without
-- blocking writes. Run each statement independently (Neon serverless does
-- not allow CONCURRENTLY inside a transaction).

-- Primary lookup: occupied slots for a salon on a given day.
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_salon_date_idx
  ON bookings (salon_id, date);

-- Admin dashboards and analytics filter by status too
-- (WHERE salon_id = $1 AND date >= $2 AND status NOT IN ('cancelled')).
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_salon_date_status_idx
  ON bookings (salon_id, date, status);

-- Client history lookups by email within a salon (used by CRM and
-- the returning-client detection in the booking widget).
CREATE INDEX CONCURRENTLY IF NOT EXISTS bookings_salon_client_email_idx
  ON bookings (salon_id, lower(client_email))
  WHERE client_email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Cleanup: duplicate indexes left over from earlier migration rounds.
--
-- These are byte-for-byte duplicates of bookings_salon_date_idx and
-- bookings_salon_id_idx (verified via pg_indexes). Duplicates waste disk,
-- double the write cost on every INSERT/UPDATE, and occasionally confuse
-- the query planner. Safe to drop — the queries continue to use the
-- surviving indexes.
DROP INDEX IF EXISTS idx_bookings_salon_date;
DROP INDEX IF EXISTS idx_bookings_salon_id;
