import SalonPublicParity from '@/app/components/SalonPublicParity';
import { SalonHeroLcp } from '@/components/salon/salon-hero-lcp';
import { SalonLcpHead } from '@/components/salon/salon-lcp-head';
import { isCustomSiteBlogEnabled, isCustomSiteBrandsEnabled } from '@/lib/custom-site-features';
import { buildSalonJsonLd } from '@/lib/seo';
import type { getPublicSalonPageData } from '@/lib/public-salon';
import { parseSalonServices } from '@/lib/salon-services';
import { enrichServiceCategories, buildServiceCategoryTabs } from '@/lib/salon-service-categories';
import { normalizeSalonFaqItems, normalizeSalonVisitorInfo, normalizeVisitorAdditionalInfo } from '@/lib/salon-visitor-info';
import { resolveBlogSectionTitle } from '@/lib/salon-blog-shared';
import { getBrandsByIds } from '@/lib/brands';
import { mergeOpeningHours } from '@/lib/salon-opening-hours';
import { normalizeBookingBlocks } from '@/lib/booking-blocks';
import { getStaffMembers } from '@/lib/staff-members';
import { normalizeSiteContent } from '@/lib/site-content';

type SalonPageData = NonNullable<Awaited<ReturnType<typeof getPublicSalonPageData>>>;

type Props = {
  pageData: SalonPageData;
  highlightReviewId?: string | null;
  tabParam?: string | null;
};

const CUSTOM_PREFIX = 'custom|';

function resolveBrandNames(ids: string[]): { id: string; name: string }[] {
  const predefined = getBrandsByIds(ids.filter((id) => !id.startsWith(CUSTOM_PREFIX)));
  const custom = ids
    .filter((id) => id.startsWith(CUSTOM_PREFIX))
    .map((raw) => {
      const rest = raw.slice(CUSTOM_PREFIX.length);
      const idx = rest.indexOf('|');
      if (idx === -1) return null;
      return { id: raw, name: rest.slice(0, idx) };
    })
    .filter(Boolean) as { id: string; name: string }[];
  return [...predefined.map((b) => ({ id: b.id, name: b.name })), ...custom];
}

function pickLcpImage(salon: Record<string, unknown>): { src: string; alt: string } | null {
  const imagesRaw = Array.isArray(salon.images)
    ? salon.images.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const salonName = String(salon.name ?? 'Салон');
  const lcpImage = imagesRaw.find((u) => u && !u.startsWith('data:'));
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

export async function SalonPublicPageView({ pageData, highlightReviewId, tabParam }: Props) {
  const salonRecord = pageData.salon as Record<string, unknown>;
  const googlePlaceId = (salonRecord.google_place_id as string | null | undefined) ?? null;
  const ratingOptions = computeGoogleRating(pageData.googleReviews, googlePlaceId) ?? undefined;
  const jsonLd = buildSalonJsonLd(salonRecord, pageData.salonSlug, ratingOptions);
  const lcp = pickLcpImage(salonRecord);

  // Pre-process data server-side — keeps these libs out of the client JS bundle
  const servicesEnriched = enrichServiceCategories(parseSalonServices(salonRecord.services));
  const serviceCategories = buildServiceCategoryTabs(servicesEnriched);
  const faqItems = normalizeSalonFaqItems(salonRecord.faq_items);
  const visitorInfo = normalizeSalonVisitorInfo(salonRecord.visitor_info);
  const visitorAdditionalInfo = normalizeVisitorAdditionalInfo(salonRecord.visitor_additional_info);
  const blogEnabled = isCustomSiteBlogEnabled();
  const brandsEnabled = isCustomSiteBrandsEnabled();
  const blogSectionTitle = blogEnabled ? resolveBlogSectionTitle(salonRecord.blog_title) : '';
  const brandIds = brandsEnabled && Array.isArray(salonRecord.brand_domains) ? salonRecord.brand_domains.map(String) : [];
  const brandNames = brandsEnabled ? resolveBrandNames(brandIds) : [];
  const workingHours = salonRecord.working_hours as
    | Record<string, { open?: string; close?: string; closed?: boolean }>
    | undefined;
  const openingHoursMerged = mergeOpeningHours(workingHours, salonRecord.opening_hours);
  const bookingBlocks = normalizeBookingBlocks(
    salonRecord.opening_hours && typeof salonRecord.opening_hours === 'object'
      ? (salonRecord.opening_hours as Record<string, unknown>).booking_blocks
      : null,
  );
  const ownerName = String(salonRecord.owner_name ?? '').trim();
  const salonName = String(salonRecord.name ?? 'Салон');
  const ownerRole = String(salonRecord.owner_public_role ?? '').trim();
  const ownerPhoto = String(salonRecord.owner_public_photo_url ?? '').trim();
  const ownerBio = String(salonRecord.owner_public_bio ?? '').trim();
  const siteContent = normalizeSiteContent(
    salonRecord.site_content,
    String(salonRecord.language ?? 'bg').startsWith('en') ? 'en' : 'bg',
  );

  // Load active staff members from staff_members table
  const salonId = String(salonRecord.id ?? '');
  const staffRows = salonId ? await getStaffMembers(salonId).catch(() => []) : [];
  const activeStaff = staffRows.filter((s) => s.isActive);

  // If owner is already a staff member (is_owner=true) don't duplicate them
  const ownerAlreadyInStaff = activeStaff.some((s) => s.isOwner);
  const ownerEntry = (ownerName || salonName) && !ownerAlreadyInStaff
    ? [{ id: 'owner', name: ownerName || salonName, role: ownerRole, bio: ownerBio, photoUrl: ownerPhoto }]
    : [];

  const staffEntries = activeStaff.map((s) => ({
    id: s.id,
    name: s.name,
    role: '',
    bio: s.bio ?? '',
    photoUrl: s.avatarUrl ?? '',
  }));

  // Owner first, then staff members — always show both when staff exist
  const publicTeamMembers =
    activeStaff.length > 0
      ? [...ownerEntry, ...staffEntries]
      : ownerEntry.length > 0
        ? ownerEntry
        : [];

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
        publishedBlogCount={blogEnabled ? pageData.publishedBlogCount : 0}
        hasPublishedBlogPosts={blogEnabled ? pageData.hasPublishedBlogPosts : false}
        servicesEnriched={servicesEnriched}
        serviceCategories={serviceCategories}
        faqItems={faqItems}
        visitorInfo={visitorInfo}
        visitorAdditionalInfo={visitorAdditionalInfo}
        blogSectionTitle={blogSectionTitle}
        brandNames={brandNames}
        openingHoursMerged={openingHoursMerged}
        bookingBlocks={bookingBlocks}
        publicTeamMembers={publicTeamMembers}
        siteContent={siteContent}
      >
        {lcp ? <SalonHeroLcp src={lcp.src} alt={lcp.alt} /> : null}
      </SalonPublicParity>
    </>
  );
}
