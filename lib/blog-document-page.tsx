import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { BlogPostView } from '@/components/salon/blog-post-view';
import { BlogIndexView } from '@/components/salon/blog-index-view';
import { getPrimaryPublicUrl } from '@/lib/domain-routing';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { resolveBlogSectionTitle } from '@/lib/salon-blog-shared';
import { buildBlogBreadcrumbJsonLd, buildBlogIndexJsonLd, buildBlogPostingJsonLd } from '@/lib/seo';
import {
  getBlogPostBySlugForSalon,
  getPublishedBlogPostsForSalon,
  type PublicSalonBlogPost,
} from '@/lib/salon-blog';

export type BlogPageContext = {
  salonSlug: string;
  salon: Record<string, unknown>;
  homeUrl: string;
  blogIndexUrl: string;
  primaryColor: string;
  blogSectionTitle: string;
};

async function resolveBlogContext(slugParam?: string): Promise<BlogPageContext | null> {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ slug: slugParam, host });
  if (!pageData) return null;

  const salon = pageData.salon as Record<string, unknown>;
  const homeUrl = getPrimaryPublicUrl({
    slug: pageData.salonSlug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });

  return {
    salonSlug: pageData.salonSlug,
    salon,
    homeUrl,
    blogIndexUrl: `${homeUrl}/blog`,
    primaryColor:
      typeof salon.primary_color === 'string' && salon.primary_color
        ? salon.primary_color
        : '#5B21B6',
    blogSectionTitle: resolveBlogSectionTitle(salon.blog_title),
  };
}

export async function renderBlogIndexPage({ slug: slugParam }: { slug?: string }) {
  const ctx = await resolveBlogContext(slugParam);
  if (!ctx) return notFound();

  const salonId = String(ctx.salon.id ?? '');
  const posts = await getPublishedBlogPostsForSalon(salonId, ctx.salonSlug);

  return (
    <>
      <BlogIndexJsonLd salon={ctx.salon} slug={ctx.salonSlug} posts={posts} />
      <BlogIndexView
        salonName={String(ctx.salon.name ?? 'Салон')}
        homeUrl={ctx.homeUrl}
        blogIndexUrl={ctx.blogIndexUrl}
        primaryColor={ctx.primaryColor}
        blogSectionTitle={ctx.blogSectionTitle}
        posts={posts}
      />
    </>
  );
}

function BlogIndexJsonLd({
  salon,
  slug,
  posts,
}: {
  salon: Record<string, unknown>;
  slug: string;
  posts: PublicSalonBlogPost[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildBlogIndexJsonLd(salon, slug, posts)),
      }}
    />
  );
}

export async function renderBlogPostPage({
  slug: slugParam,
  postSlug,
}: {
  slug?: string;
  postSlug: string;
}) {
  const ctx = await resolveBlogContext(slugParam);
  if (!ctx) return notFound();

  const salonId = String(ctx.salon.id ?? '');
  const post = await getBlogPostBySlugForSalon({
    salonId,
    salonSlug: ctx.salonSlug,
    postSlug,
    publishedOnly: true,
  });
  if (!post) return notFound();

  let related: PublicSalonBlogPost[] = [];
  const all = await getPublishedBlogPostsForSalon(salonId, ctx.salonSlug);
  related = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBlogPostingJsonLd(post, ctx.salon, ctx.salonSlug)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBlogBreadcrumbJsonLd(post, ctx.salon, ctx.salonSlug)),
        }}
      />
      <BlogPostView
        salonName={String(ctx.salon.name ?? 'Салон')}
        homeUrl={ctx.homeUrl}
        blogIndexUrl={ctx.blogIndexUrl}
        primaryColor={ctx.primaryColor}
        blogSectionTitle={ctx.blogSectionTitle}
        post={post}
        related={related}
      />
    </>
  );
}
