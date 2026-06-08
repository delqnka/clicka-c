import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SalonPublicPageView } from '@/components/salon/salon-public-page-view';
import { SalonTrackingScripts } from '@/components/analytics/SalonTrackingScripts';
import { CookieConsentBanner } from '@/components/analytics/CookieConsentBanner';
import { extractHostname, getPlatformSubdomain, ROOT_DOMAIN } from '@/lib/domain-routing';
import { getPublicSalonPageData, resolveSlugRedirect } from '@/lib/public-salon';
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
    const subdomain = getPlatformSubdomain(extractHostname(host));
    if (subdomain) {
      const newSlug = await resolveSlugRedirect(subdomain);
      if (newSlug) redirect(`https://${newSlug}.${ROOT_DOMAIN}`);
    }
    redirect(`https://${ROOT_DOMAIN}`);
  }

  const salon = pageData.salon as Record<string, unknown>;
  return (
    <>
      <SalonTrackingScripts
        ga4Id={salon.ga4_id ? String(salon.ga4_id) : null}
        metaPixelId={salon.meta_pixel_id ? String(salon.meta_pixel_id) : null}
        clarityId={salon.clarity_id ? String(salon.clarity_id) : null}
      />
      <CookieConsentBanner />
      <SalonPublicPageView pageData={pageData} />
    </>
  );
}
