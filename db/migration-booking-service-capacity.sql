ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_quantity integer NOT NULL DEFAULT 1;

UPDATE bookings
SET booking_quantity = 1
WHERE booking_quantity IS NULL OR booking_quantity < 1;

DROP INDEX IF EXISTS bookings_active_slot_unique_idx;

CREATE INDEX IF NOT EXISTS bookings_active_slot_lookup_idx
  ON bookings(salon_id, date, time)
  WHERE status IN ('pending', 'confirmed');
