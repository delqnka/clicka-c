CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS salon_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body_md text NOT NULL DEFAULT '',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_blog_posts_salon_slug_idx
  ON salon_blog_posts (salon_id, slug);

CREATE INDEX IF NOT EXISTS salon_blog_posts_salon_status_published_idx
  ON salon_blog_posts (salon_id, status, published_at DESC);

ALTER TABLE salons ADD COLUMN IF NOT EXISTS blog_title text;
