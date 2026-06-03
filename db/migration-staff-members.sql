-- Migration: Staff members, staff services, plan enforcement, direct booking pages
-- Run once in Neon. All statements use IF NOT EXISTS / DROP IF EXISTS so re-running is safe.

-- ─── 1. Plan column on salons ─────────────────────────────────────────────────
ALTER TABLE salons ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'solo';

-- ─── 2. staff_members table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id                        text        NOT NULL,
  name                            text        NOT NULL,
  slug                            text        NOT NULL,       -- URL handle: 'maria' → /book/maria
  email                           text,                       -- booking notifications
  bio                             text,
  avatar_url                      text,
  is_owner                        boolean     NOT NULL DEFAULT false,
  telegram_chat_id                text        UNIQUE,
  google_calendar_id              text,
  google_calendar_refresh_token   text,
  google_calendar_connected_at    timestamptz,
  calendar_feed_token             text,
  onboarding_code                 text UNIQUE,   -- for Telegram /start <code> linking
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX  IF NOT EXISTS staff_members_salon_id_idx
  ON staff_members(salon_id);

-- slug is unique per salon (two salons can both have 'maria')
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_salon_slug_uniq
  ON staff_members(salon_id, slug);

-- ─── 3. staff_services junction table ────────────────────────────────────────
-- service_id matches the `id` field inside salons.services jsonb array
CREATE TABLE IF NOT EXISTS staff_services (
  staff_member_id uuid  NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  service_id      text  NOT NULL,
  PRIMARY KEY (staff_member_id, service_id)
);

CREATE INDEX IF NOT EXISTS staff_services_service_id_idx
  ON staff_services(service_id);

-- ─── 4. staff_member_id on bookings ──────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_member_id uuid
  REFERENCES staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_staff_member_id_idx
  ON bookings(staff_member_id);

-- Drop the old single-staff slot uniqueness index and replace it with a
-- per-staff version so two staff members can have the same time slot.
DROP INDEX IF EXISTS bookings_active_slot_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_per_staff_uniq
  ON bookings(salon_id, COALESCE(staff_member_id::text, ''), date, time)
  WHERE status IN ('pending', 'confirmed');

-- ─── 5. Ensure calendar columns exist on salons before the data migration ────
-- These are normally added by ensure-calendar-schema.ts at runtime.
-- Adding them here makes this .sql file safe to run on a fresh database.
ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_calendar_connected_at timestamptz;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS calendar_feed_token text;

-- ─── 6. Migrate existing salons → owner staff_member row ─────────────────────
-- Creates one is_owner=true staff_member for every salon that doesn't have one yet.
-- Copies telegram_chat_id and calendar credentials from the salon row.
-- Safe to re-run: the WHERE NOT EXISTS guard skips already-migrated salons.
INSERT INTO staff_members (
  salon_id,
  name,
  slug,
  email,
  is_owner,
  telegram_chat_id,
  google_calendar_id,
  google_calendar_refresh_token,
  google_calendar_connected_at,
  calendar_feed_token
)
SELECT
  CAST(s.id AS text),
  s.name,
  'owner',                             -- default slug; owner can rename later
  s.email,
  true,
  s.telegram_chat_id,
  s.google_calendar_id,
  s.google_calendar_refresh_token,
  s.google_calendar_connected_at,
  s.calendar_feed_token
FROM salons s
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm
  WHERE sm.salon_id = CAST(s.id AS text) AND sm.is_owner = true
);
