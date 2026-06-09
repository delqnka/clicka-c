import SalonPublicParity from '@/app/components/SalonPublicParity';
import { SalonHeroLcp } from '@/components/salon/salon-hero-lcp';
import { SalonLcpHead } from '@/components/salon/salon-lcp-head';
import { buildSalonJsonLd } from '@/lib/seo';
import type { getPublicSalonPageData } from '@/lib/public-salon';

type SalonPageData = NonNullable<Awaited<ReturnType<typeof getPublicSalonPageData>>>;

type Props = {
  pageData: SalonPageData;
  highlightReviewId?: string | null;
  tabParam?: string | null;
};

function pickLcpImage(salon: Record<string, unknown>): { src: string; alt: string } | null {
  const coverRaw = String(salon.cover_image_url ?? '').trim();
  const galleryRaw = Array.isArray(salon.gallery_images)
    ? salon.gallery_images.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const salonName = String(salon.name ?? 'Салон');
  const lcpImage = [coverRaw, ...galleryRaw].find((u) => u && !u.startsWith('data:'));
  if (!lcpImage) return null;
  return { src: lcpImage, alt: salonName };
}

function computeGoogleRating(
  googleReviews: { rating: number }[],
  googlePlaceId: string | null | undefined,
): { reviewCount: number; averageRating: number } | null {
  if (!googlePlaceId || googleReviews.length === 0) return null;
  const ratings = googleReviews
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (ratings.length === 0) return null;
  const avg = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
  return { reviewCount: ratings.length, averageRating: avg };
}

export function SalonPublicPageView({ pageData, highlightReviewId, tabParam }: Props) {
  const salonRecord = pageData.salon as Record<string, unknown>;
  const googlePlaceId = (salonRecord.google_place_id as string | null | undefined) ?? null;
  const ratingOptions = computeGoogleRating(pageData.googleReviews, googlePlaceId) ?? undefined;
  const jsonLd = buildSalonJsonLd(salonRecord, pageData.salonSlug, ratingOptions);
  const lcp = pickLcpImage(salonRecord);

  return (
    <>
      <SalonLcpHead lcpSrc={lcp?.src ?? null} />
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
        highlightReviewId={highlightReviewId ?? null}
        tabParam={tabParam ?? null}
        staticMapUrl={pageData.staticMapUrl}
        publishedBlogCount={pageData.publishedBlogCount}
        hasPublishedBlogPosts={pageData.hasPublishedBlogPosts}
      >
        {lcp ? <SalonHeroLcp src={lcp.src} alt={lcp.alt} /> : null}
      </SalonPublicParity>
    </>
  );
}
