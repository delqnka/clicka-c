import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SalonPublicPageView } from '@/components/salon/salon-public-page-view';
import { ROOT_DOMAIN } from '@/lib/domain-routing';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { buildSalonPageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ host });
  if (!pageData) {
    return { title: 'Салонът не е намерен' };
  }
  return buildSalonPageMetadata(pageData.salon as Record<string, unknown>, pageData.salonSlug);
}

export default async function SalonCustomDomainHomePage() {
  const host = headers().get('host');
  const pageData = await getPublicSalonPageData({ host });

  if (!pageData) {
    redirect(`https://${ROOT_DOMAIN}`);
  }

  return <SalonPublicPageView pageData={pageData} />;
}
