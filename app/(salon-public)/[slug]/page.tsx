import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SalonPublicPageView } from '@/components/salon/salon-public-page-view';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { buildSalonPageMetadata } from '@/lib/seo';
import { SalonTrackingScripts } from '@/components/analytics/SalonTrackingScripts';
import { CookieConsentBanner } from '@/components/analytics/CookieConsentBanner';

export const revalidate = 60;

const STATIC_ASSETS = new Set(['favicon.ico', 'robots.txt', 'sitemap.xml', 'apple-touch-icon.png']);

type Props = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (STATIC_ASSETS.has(params.slug)) return {};
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) {
    return buildSalonPageMetadata({}, params.slug, { notFound: true });
  }

  return buildSalonPageMetadata(pageData.salon as Record<string, unknown>, pageData.salonSlug);
}

export default async function SalonSlugPage({ params, searchParams }: Props) {
  if (STATIC_ASSETS.has(params.slug)) notFound();
  const pageData = await getPublicSalonPageData({ slug: params.slug });

  if (!pageData) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Салонът не е намерен</h1>
        <p style={{ color: '#1a1a1a' }}>Проверете адреса и опитайте отново.</p>
      </main>
    );
  }

  const reviewIdRaw = searchParams?.reviewId;
  const highlightReviewId =
    typeof reviewIdRaw === 'string' ? reviewIdRaw.trim() : Array.isArray(reviewIdRaw) ? (reviewIdRaw[0] ?? '').trim() : '';
  const tabRaw = searchParams?.tab;
  const tabParam =
    typeof tabRaw === 'string' ? tabRaw.trim() : Array.isArray(tabRaw) ? (tabRaw[0] ?? '').trim() : '';

  const salon = pageData.salon as Record<string, unknown>;

  return (
    <>
      <SalonTrackingScripts
        ga4Id={salon.ga4_id ? String(salon.ga4_id) : null}
        metaPixelId={salon.meta_pixel_id ? String(salon.meta_pixel_id) : null}
        clarityId={salon.clarity_id ? String(salon.clarity_id) : null}
      />
      <CookieConsentBanner cookiesPath={`/${params.slug}/cookies`} />
      <SalonPublicPageView
        pageData={pageData}
        highlightReviewId={highlightReviewId || null}
        tabParam={tabParam || null}
      />
    </>
  );
}
