import type { Metadata } from 'next';
import SalonPublicParity from '@/app/components/SalonPublicParity';
import { SalonHeroLcp } from '@/components/salon/salon-hero-lcp';
import { SalonLcpHead } from '@/components/salon/salon-lcp-head';
import { getPublicSalonPageData } from '@/lib/public-salon';
import { buildSalonJsonLd, buildSalonPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) {
    return buildSalonPageMetadata({}, params.slug, { notFound: true });
  }

  return buildSalonPageMetadata(pageData.salon as Record<string, unknown>, pageData.salonSlug);
}

export default async function SalonSlugPage({ searchParams }: Props) {
  const params = arguments[0].params;
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

  const jsonLd = buildSalonJsonLd(pageData.salon as Record<string, unknown>, pageData.salonSlug);

  const salonRecord = pageData.salon as Record<string, unknown>;
  const coverRaw = String(salonRecord.cover_image_url ?? '').trim();
  const galleryRaw = Array.isArray(salonRecord.gallery_images)
    ? salonRecord.gallery_images.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const salonName = String(salonRecord.name ?? 'Салон');
  const lcpImage = [coverRaw, ...galleryRaw].find((u) => u && !u.startsWith('data:'));

  return (
    <>
      <SalonLcpHead />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SalonPublicParity
        salonSlug={pageData.salonSlug}
        salon={pageData.salon}
        offers={pageData.offers as never}
        reviews={pageData.reviews as never}
        googleReviews={pageData.googleReviews}
        highlightReviewId={highlightReviewId || null}
        tabParam={tabParam || null}
        staticMapUrl={pageData.staticMapUrl}
      >
        {lcpImage ? <SalonHeroLcp src={lcpImage} alt={salonName} /> : null}
      </SalonPublicParity>
    </>
  );
}
