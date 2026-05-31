import { sql } from '@/lib/db';

let ensurePromise: Promise<void> | null = null;

export async function ensureBlogSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
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
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS salon_blog_posts_salon_slug_idx
        ON salon_blog_posts (salon_id, slug)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS salon_blog_posts_salon_status_published_idx
        ON salon_blog_posts (salon_id, status, published_at DESC)
      `;
      await sql`ALTER TABLE salon_blog_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`;
      await sql`ALTER TABLE salon_blog_posts ADD COLUMN IF NOT EXISTS body_md text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE salon_blog_posts ADD COLUMN IF NOT EXISTS cover_image_url text`;
      await sql`ALTER TABLE salon_blog_posts ADD COLUMN IF NOT EXISTS published_at timestamptz`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS blog_title text`;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}
