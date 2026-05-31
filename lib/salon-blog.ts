import 'server-only';

import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db';
import { renderBlogBodyHtml } from '@/lib/blog-body-html';
import { ensureBlogSchema } from '@/lib/ensure-blog-schema';
import {
  type AdminSalonBlogPost,
  type PublicSalonBlogPost,
  normalizeBlogPostStatus,
} from '@/lib/salon-blog-shared';
import { withAutoBlogSeoMeta } from '@/lib/blog-seo-meta';

export type { AdminSalonBlogPost, BlogPostStatus, PublicSalonBlogPost } from '@/lib/salon-blog-shared';
export {
  DEFAULT_BLOG_SECTION_TITLE,
  newEmptyBlogPost,
  resolveBlogSectionTitle,
} from '@/lib/salon-blog-shared';

export function mapDbBlogRow(row: Record<string, unknown>): AdminSalonBlogPost {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? '').trim(),
    slug: String(row.slug ?? '').trim(),
    excerpt: String(row.excerpt ?? '').trim(),
    bodyMarkdown: String(row.body_md ?? ''),
    coverImageUrl: String(row.cover_image_url ?? '').trim(),
    status: normalizeBlogPostStatus(row.status),
    publishedAt: row.published_at ? String(row.published_at) : null,
    metaTitle: String(row.meta_title ?? '').trim(),
    metaDescription: String(row.meta_description ?? '').trim(),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export function mapAdminBlogToDb(post: AdminSalonBlogPost, salonId: string) {
  const withMeta = withAutoBlogSeoMeta(post);
  const status = normalizeBlogPostStatus(withMeta.status);
  const publishedAt =
    status === 'published'
      ? withMeta.publishedAt || new Date().toISOString()
      : null;

  return {
    id: withMeta.id || undefined,
    salon_id: salonId,
    slug: withMeta.slug.trim(),
    title: withMeta.title.trim(),
    excerpt: withMeta.excerpt.trim() || null,
    body_md: withMeta.bodyMarkdown,
    cover_image_url: withMeta.coverImageUrl.trim() || null,
    status,
    published_at: publishedAt,
    meta_title: withMeta.metaTitle.trim() || null,
    meta_description: withMeta.metaDescription.trim() || null,
  };
}

export function toPublicBlogPost(post: AdminSalonBlogPost): PublicSalonBlogPost {
  return {
    ...post,
    bodyHtml: renderBlogBodyHtml(post.bodyMarkdown, post.title),
  };
}

export async function loadAdminBlogPosts(salonId: string): Promise<AdminSalonBlogPost[]> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT *
    FROM salon_blog_posts
    WHERE salon_id = ${salonId}
    ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapDbBlogRow);
}

async function fetchPublishedBlogPosts(salonId: string): Promise<PublicSalonBlogPost[]> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT *
    FROM salon_blog_posts
    WHERE salon_id = ${salonId} AND status = 'published'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapDbBlogRow).map(toPublicBlogPost);
}

async function fetchBlogPostBySlug(
  salonId: string,
  postSlug: string,
  publishedOnly: boolean,
): Promise<PublicSalonBlogPost | null> {
  await ensureBlogSchema();
  const rows = publishedOnly
    ? await sql`
        SELECT *
        FROM salon_blog_posts
        WHERE salon_id = ${salonId} AND slug = ${postSlug} AND status = 'published'
        LIMIT 1
      `
    : await sql`
        SELECT *
        FROM salon_blog_posts
        WHERE salon_id = ${salonId} AND slug = ${postSlug}
        LIMIT 1
      `;

  if (rows.length === 0) return null;
  return toPublicBlogPost(mapDbBlogRow(rows[0] as Record<string, unknown>));
}

async function fetchPublishedBlogCount(salonId: string): Promise<number> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM salon_blog_posts
    WHERE salon_id = ${salonId} AND status = 'published'
  `;
  return Number((rows[0] as { count?: number }).count ?? 0) || 0;
}

export async function getPublishedBlogPostsForSalon(salonId: string, salonSlug: string) {
  return unstable_cache(
    () => fetchPublishedBlogPosts(salonId),
    ['salon-blog-posts', salonId],
    { revalidate: 60, tags: [`salon-blog-${salonSlug}`] },
  )();
}

export async function getBlogPostBySlugForSalon({
  salonId,
  salonSlug,
  postSlug,
  publishedOnly = true,
}: {
  salonId: string;
  salonSlug: string;
  postSlug: string;
  publishedOnly?: boolean;
}) {
  return unstable_cache(
    () => fetchBlogPostBySlug(salonId, postSlug, publishedOnly),
    ['salon-blog-post', salonId, postSlug, publishedOnly ? 'pub' : 'all'],
    { revalidate: 60, tags: [`salon-blog-${salonSlug}`, `salon-blog-post-${salonSlug}-${postSlug}`] },
  )();
}

export async function getPublishedBlogCountForSalon(salonId: string, salonSlug: string) {
  return unstable_cache(
    () => fetchPublishedBlogCount(salonId),
    ['salon-blog-count', salonId],
    { revalidate: 60, tags: [`salon-blog-${salonSlug}`] },
  )();
}

export async function loadSalonBlogTitle(salonId: string): Promise<string> {
  await ensureBlogSchema();
  const rows = await sql`
    SELECT blog_title
    FROM salons
    WHERE CAST(id AS text) = ${salonId}
    LIMIT 1
  `;
  if (rows.length === 0) return '';
  return String((rows[0] as { blog_title?: unknown }).blog_title ?? '').trim();
}
