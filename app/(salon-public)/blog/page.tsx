import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { renderBlogIndexPage } from '@/lib/blog-document-page';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { buildBlogIndexMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ host });
  if (!pageData) return { title: 'Блог' };
  return buildBlogIndexMetadata(pageData.salon as Record<string, unknown>, pageData.salonSlug);
}

export default function SalonBlogIndexHostPage() {
  return renderBlogIndexPage({});
}
