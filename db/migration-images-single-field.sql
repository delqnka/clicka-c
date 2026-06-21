-- Consolidate salon image fields into a single `images` column.
-- Custom sites built by the agency don't need cover/logo from Clicka, and
-- gallery vs portfolio is a meaningless semantic split for the owner.
-- Re-run is idempotent.

ALTER TABLE salons DROP COLUMN IF EXISTS cover_image_url;
ALTER TABLE salons DROP COLUMN IF EXISTS logo_image_url;
ALTER TABLE salons DROP COLUMN IF EXISTS portfolio_images;

ALTER TABLE salons RENAME COLUMN gallery_images TO images;
