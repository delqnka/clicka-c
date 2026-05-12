-- White-label public salon page (BOOKA-style parity): run once on Clicka Neon.
-- All new columns are nullable so existing salons keep working.
--
-- salon_id е TEXT без FK, за да няма грешка 42804 ако salons.id не е uuid (text/varchar/bigint и т.н.).
-- Приложението винаги сравнява salon_id с salons.id като низ/параметър.

-- Extra salon profile fields (maps to BOOKA web public payload)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS tiktok_username text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS rating numeric(4,2);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS review_count integer;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS portfolio_images jsonb;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_role text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_photo_url text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS venue_extras jsonb;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_hours jsonb;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_status text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_verified_at timestamptz;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_last_checked_at timestamptz;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_config jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS salons_custom_domain_uniq
ON salons ((lower(custom_domain)))
WHERE custom_domain IS NOT NULL;

-- Offers (replaces tRPC offers.listBySalon for Clicka DB)
CREATE TABLE IF NOT EXISTS salon_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  title text NOT NULL,
  description text,
  discount numeric(10,2),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  campaign_valid_from timestamptz,
  campaign_valid_until timestamptz,
  max_claims integer,
  total_claims integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_offers_salon_id_idx ON salon_offers(salon_id);

-- In-app / imported platform reviews (replaces tRPC reviews.listBySalon)
CREATE TABLE IF NOT EXISTS salon_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_avatar text,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  specialist_comment text,
  team_member_name text,
  owner_reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_reviews_salon_id_idx ON salon_reviews(salon_id);
CREATE INDEX IF NOT EXISTS salon_reviews_created_at_idx ON salon_reviews(created_at DESC);
