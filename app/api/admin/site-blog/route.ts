import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureUniqueBlogSlug, toBlogSlug } from '@/lib/blog-slug';
import { ensureBlogSchema } from '@/lib/ensure-blog-schema';
import { revalidateSalonPublicCache } from '@/lib/revalidate-salon-public';
import {
  loadAdminBlogPosts,
  loadSalonBlogTitle,
  mapAdminBlogToDb,
  newEmptyBlogPost,
  resolveBlogSectionTitle,
  type AdminSalonBlogPost,
  type BlogPostStatus,
} from '@/lib/salon-blog';

function normalizeStatus(raw: unknown): BlogPostStatus {
  return String(raw ?? '').trim().toLowerCase() === 'published' ? 'published' : 'draft';
}

function normalizePostsInput(raw: unknown): AdminSalonBlogPost[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const base = newEmptyBlogPost();
    return {
      id: String(row.id ?? '').trim(),
      title: String(row.title ?? '').trim() || `Статия ${index + 1}`,
      slug: String(row.slug ?? '').trim(),
      excerpt: String(row.excerpt ?? '').trim(),
      bodyMarkdown: String(row.bodyMarkdown ?? row.body_md ?? '').trim(),
      coverImageUrl: String(row.coverImageUrl ?? row.cover_image_url ?? '').trim(),
      status: normalizeStatus(row.status),
      publishedAt: row.publishedAt
        ? String(row.publishedAt)
        : row.published_at
          ? String(row.published_at)
          : null,
      metaTitle: String(row.metaTitle ?? row.meta_title ?? '').trim(),
      metaDescription: String(row.metaDescription ?? row.meta_description ?? '').trim(),
      createdAt: row.createdAt ? String(row.createdAt) : row.created_at ? String(row.created_at) : null,
      updatedAt: row.updatedAt ? String(row.updatedAt) : row.updated_at ? String(row.updated_at) : null,
    };
  });
}

function assignSlugs(posts: AdminSalonBlogPost[]): AdminSalonBlogPost[] {
  const used = new Set<string>();
  return posts.map((post) => {
    const base = post.slug.trim() || toBlogSlug(post.title);
    const slug = ensureUniqueBlogSlug(base, used);
    used.add(slug);
    return { ...post, slug };
  });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const [posts, blogTitle] = await Promise.all([
    loadAdminBlogPosts(auth.salon.salonId),
    loadSalonBlogTitle(auth.salon.salonId),
  ]);
  return NextResponse.json({ posts, blogTitle });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { posts?: unknown; blogTitle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const posts = assignSlugs(normalizePostsInput(body.posts));
  const blogTitleRaw =
    typeof body.blogTitle === 'string' ? body.blogTitle.trim().slice(0, 60) : undefined;
  await ensureBlogSchema();

  if (blogTitleRaw !== undefined) {
    await sql`
      UPDATE salons
      SET blog_title = ${blogTitleRaw || null}, updated_at = now()
      WHERE CAST(id AS text) = ${auth.salon.salonId}
    `;
  }

  const existing = await sql`
    SELECT id::text AS id, published_at
    FROM salon_blog_posts
    WHERE salon_id = ${auth.salon.salonId}
  `;
  const publishedAtById = new Map(
    (existing as { id: string; published_at: string | null }[]).map((r) => [
      r.id,
      r.published_at ? String(r.published_at) : null,
    ]),
  );

  const keepIds: string[] = [];

  for (const post of posts) {
    const mapped = mapAdminBlogToDb(post, auth.salon.salonId);
    const preservedPublishedAt =
      post.status === 'published'
        ? post.publishedAt || publishedAtById.get(post.id) || mapped.published_at
        : null;

    if (post.id && publishedAtById.has(post.id)) {
      await sql`
        UPDATE salon_blog_posts
        SET
          slug = ${mapped.slug},
          title = ${mapped.title},
          excerpt = ${mapped.excerpt},
          body_md = ${mapped.body_md},
          cover_image_url = ${mapped.cover_image_url},
          status = ${mapped.status},
          published_at = ${preservedPublishedAt},
          meta_title = ${mapped.meta_title},
          meta_description = ${mapped.meta_description},
          updated_at = now()
        WHERE id = ${post.id}::uuid AND salon_id = ${auth.salon.salonId}
      `;
      keepIds.push(post.id);
    } else {
      const inserted = await sql`
        INSERT INTO salon_blog_posts (
          salon_id, slug, title, excerpt, body_md, cover_image_url,
          status, published_at, meta_title, meta_description
        )
        VALUES (
          ${mapped.salon_id},
          ${mapped.slug},
          ${mapped.title},
          ${mapped.excerpt},
          ${mapped.body_md},
          ${mapped.cover_image_url},
          ${mapped.status},
          ${preservedPublishedAt},
          ${mapped.meta_title},
          ${mapped.meta_description}
        )
        RETURNING id::text AS id
      `;
      const newId = String((inserted[0] as { id: string }).id ?? '');
      if (newId) keepIds.push(newId);
    }
  }

  if (keepIds.length > 0) {
    await sql`
      DELETE FROM salon_blog_posts
      WHERE salon_id = ${auth.salon.salonId}
        AND NOT (id::text = ANY(${keepIds}))
    `;
  } else {
    await sql`DELETE FROM salon_blog_posts WHERE salon_id = ${auth.salon.salonId}`;
  }

  const [saved, blogTitle] = await Promise.all([
    loadAdminBlogPosts(auth.salon.salonId),
    loadSalonBlogTitle(auth.salon.salonId),
  ]);

  revalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({
    success: true,
    posts: saved,
    blogTitle,
  });
}
