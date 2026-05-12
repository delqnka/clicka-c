import SalonPublicParity from '@/app/components/SalonPublicParity';
import { getPublicSalonPageData } from '@/lib/public-salon';

export const dynamic = 'force-dynamic';

type Search = { [key: string]: string | string[] | undefined };

export default async function SalonSlugPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Search;
}) {
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

  return (
    <SalonPublicParity
      salonSlug={pageData.salonSlug}
      salon={pageData.salon}
      offers={pageData.offers as never}
      reviews={pageData.reviews as never}
      googleReviews={pageData.googleReviews}
      highlightReviewId={highlightReviewId || null}
      tabParam={tabParam || null}
      staticMapUrl={pageData.staticMapUrl}
    />
  );
}
