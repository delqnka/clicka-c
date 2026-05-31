import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { renderBlogPostPage } from '@/lib/blog-document-page';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { getBlogPostBySlugForSalon } from '@/lib/salon-blog';
import { buildBlogPostMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string; postSlug: string };
}): Promise<Metadata> {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ slug: params.slug, host });
  if (!pageData) return { title: 'Статия' };

  const post = await getBlogPostBySlugForSalon({
    salonId: String(pageData.salon.id ?? ''),
    salonSlug: pageData.salonSlug,
    postSlug: params.postSlug,
    publishedOnly: true,
  });
  if (!post) return { title: 'Статия не е намерена', robots: { index: false, follow: false } };

  return buildBlogPostMetadata(
    post,
    pageData.salon as Record<string, unknown>,
    pageData.salonSlug,
  );
}

export default function SalonBlogPostPage({
  params,
}: {
  params: { slug: string; postSlug: string };
}) {
  return renderBlogPostPage({ slug: params.slug, postSlug: params.postSlug });
}
