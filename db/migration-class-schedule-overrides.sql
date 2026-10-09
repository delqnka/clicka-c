CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS class_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  original_date text NOT NULL,
  original_time text NOT NULL,
  original_class_name text NOT NULL DEFAULT '',
  original_trainer text NOT NULL DEFAULT '',
  date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  service_id text,
  class_name text,
  trainer text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  price numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS class_schedule_overrides_occurrence_uniq
ON class_schedule_overrides(salon_id, original_date, original_time, original_class_name, original_trainer);

CREATE INDEX IF NOT EXISTS class_schedule_overrides_salon_date_idx
ON class_schedule_overrides(salon_id, date);

CREATE INDEX IF NOT EXISTS class_schedule_overrides_salon_original_date_idx
ON class_schedule_overrides(salon_id, original_date);
