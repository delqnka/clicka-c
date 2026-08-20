'use client';

/**
 * White-label публична салон страница — структура и UX по образец на BOOKA уеб (`web/.../salon/[id]`),
 * данни само от Clicka (props + Neon). Без маркетинг бранд на BOOKA в копито.
 */

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Share2,
  Star,
  User,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { formatDualEurText } from '@/lib/salon-currency';
import { DeferredSection } from '@/components/salon/deferred-section';
import { SalonServiceCategoryTabs } from '@/components/salon/service-category-tabs';
import { publicImageSrcSet, publicImageUrl } from '@/lib/public-image-url';
import { extractCoordinatesFromGoogleMapsUrl, isGoogleMapsUrl } from '@/lib/address-search';

import {
  offerHasSpotsLeft,
  offerVisibleToClient,
  normalizeOfferImages,
  offerSpotsLeft,
  type SalonOfferRow,
} from '@/lib/salon-offers';
import { formatDistanceFromUserToSalon, getDistanceKm } from '@/lib/geo';
import {
  DAY_LABELS_BG,
  DAY_NAMES_EN,
  getCurrentStatusString,
  getEffectiveHours,
  type OpeningDayRecord,
} from '@/lib/salon-opening-hours';
import { isDateBlockedAllDay, isBlockedForStartTime, type BookingBlock } from '@/lib/booking-blocks';
import type { SalonFaqItem, SalonVisitorInfo } from '@/lib/salon-visitor-info';
import { serviceMatchesCategory, type ServiceCategoryTab } from '@/lib/salon-service-categories';
import { GOOGLE_REVIEWS_INITIAL_VISIBLE } from '@/lib/google-reviews-limits';
import { trackBookingStarted, trackBookingCompleted } from '@/lib/tracking-events';
import { I18nProvider } from '@/lib/i18n-react';
import { resolveSalonLocale, toLocaleTag } from '@/lib/salon-locale';
import type { SiteContent } from '@/lib/site-content';

const SalonAiBotWidget = dynamic(
  () => import('@/components/salon/salon-ai-bot-widget').then((m) => ({ default: m.SalonAiBotWidget })),
  { ssr: false },
);

const PublicVisitorFaq = dynamic(
  () => import('@/components/salon/public-visitor-faq').then((m) => m.PublicVisitorFaq),
  { ssr: false }
);

const SalonBookingModal = dynamic(
  () => import('@/components/salon/SalonBookingModal').then((m) => m.SalonBookingModal),
  { ssr: false }
);

const SalonOfferBookingModal = dynamic(
  () => import('@/components/salon/SalonOfferBookingModal').then((m) => m.SalonOfferBookingModal),
  { ssr: false }
);

/** Salon link blue (maps, address, cookies). */
const SALON_LINK_COLOR = '#155DFC';

const SALON_TABS = [
  { id: 'offers' as const, label: 'Оферти' },
  { id: 'services' as const, label: 'Услуги' },
  { id: 'portfolio' as const, label: 'Снимки' },
  { id: 'team' as const, label: 'Екип' },
  { id: 'reviews' as const, label: 'Отзиви' },
  { id: 'about' as const, label: 'Относно' },
];

type TabId = (typeof SALON_TABS)[number]['id'];
const SCROLL_SPY_TAB_ORDER: TabId[] = ['about', 'offers', 'services', 'portfolio', 'team', 'reviews'];

const DESCRIPTION_PREVIEW_LEN = 120;
const PUBLIC_SITE_MAX_WIDTH = 'max-w-[min(100%,1100px)]';

export type { SalonOfferRow };

export type SalonReviewRow = {
  id: string;
  client_name: string;
  client_email?: string | null;
  client_avatar?: string | null;
  rating: number;
  comment?: string | null;
  specialist_comment?: string | null;
  team_member_name?: string | null;
  owner_reply?: string | null;
  created_at: string;
};

export type GoogleReviewLite = { author_name: string; rating: number; text: string };

export type SalonPublicParityProps = {
  salonSlug: string;
  salon: Record<string, unknown>;
  offers: SalonOfferRow[];
  reviews: SalonReviewRow[];
  googleReviews: GoogleReviewLite[];
  highlightReviewId?: string | null;
  tabParam?: string | null;
  /** @deprecated no longer rendered — kept for caller compat */
  staticMapUrl?: string | null;
  disableStickySectionTabs?: boolean;
  /** @deprecated use hasPublishedBlogPosts — kept for caller compat */
  publishedBlogCount?: number;
  hasPublishedBlogPosts?: boolean;
  // Pre-processed server-side — removed from client bundle
  servicesEnriched: ServiceRow[];
  serviceCategories: ServiceCategoryTab[];
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
  blogSectionTitle: string;
  brandNames: { id: string; name: string }[];
  openingHoursMerged: OpeningDayRecord;
  bookingBlocks: BookingBlock[];
  publicTeamMembers: Array<{ id: string; name: string; role: string; bio: string; photoUrl: string }>;
  siteContent: SiteContent;
};

function wireMediaUri(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return s;
}

function optimizedSrc(src: string, w: number, quality = 68): string {
  return publicImageUrl(src, { width: w, format: 'webp', quality });
}

const HERO_SRCSET_WIDTHS = [480, 768, 1280] as const;

function heroSrcSet(src: string, quality = 68): string {
  return publicImageSrcSet(src, HERO_SRCSET_WIDTHS, 'webp', quality);
}

function salonPublicInstagramUrl(handle: string | null | undefined): string | null {
  const h = (handle ?? '').trim().replace(/^@/, '');
  if (!h) return null;
  return `https://www.instagram.com/${encodeURIComponent(h)}/`;
}

function salonPublicTikTokUrl(handle: string | null | undefined): string | null {
  const h = (handle ?? '').trim().replace(/^@/, '');
  if (!h) return null;
  return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const SOCIAL_BRAND_STYLES: Record<string, { color?: string; background?: string }> = {
  Instagram: { background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' },
  Facebook: { color: '#1877F2' },
  TikTok: { color: '#00f2ea' },
};

function SalonFooterSocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const brand = SOCIAL_BRAND_STYLES[label];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110 hover:opacity-80"
      style={{ color: brand?.color, background: brand?.background }}
    >
      {children}
    </a>
  );
}

function salonPublicFacebookUrl(stored: string | null | undefined): string | null {
  const s = (stored ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.facebook.com/${s.replace(/^\//, '')}`;
}

function offerImagesList(images: unknown): string[] {
  return normalizeOfferImages(images);
}

type ServiceRow = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  capacity?: number;
  price?: number;
  original_price?: number;
  category?: string;
  images?: string[];
  variants?: { label: string; price: number; duration?: number }[];
  payment_type?: 'none' | 'deposit' | 'full';
  deposit_amount?: number;
  cancel_policy_hours?: number;
  cancel_policy_action?: 'full_refund' | 'keep_deposit' | 'keep_full';
};

type ServiceVariant = NonNullable<ServiceRow['variants']>[number];

function SalonBrandsSection({ brandNames }: { brandNames: { id: string; name: string }[] }) {
  const brands = brandNames;
  if (brands.length === 0) return null;
  return (
    <div className="pt-10">
      <h2 className="mb-5 text-lg font-semibold text-[#1a1a1a]">Работим с</h2>
      <div className="flex flex-wrap gap-2">
        {brands.map((b) => (
          <span key={b.id} className="inline-flex items-center rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
            {b.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function SalonGalleryMosaic({
  uris,
  onOpenGallery,
  ringClass,
  salonName = 'Салон',
}: {
  uris: string[];
  salonName?: string;
  onOpenGallery: (index: number) => void;
  ringClass: string;
}) {
  if (uris.length === 0) {
    return (
      <div
        className={`flex h-44 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm salon-text-muted md:h-56`}
      >
        Галерия
      </div>
    );
  }
  const [a, b, c] = uris;
  if (uris.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpenGallery(0)}
        className={`group relative block w-full overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 ${ringClass}`}
      >
        <img
          src={optimizedSrc(a, 768)}
          srcSet={heroSrcSet(a)}
          sizes="(max-width: 768px) 100vw, 768px"
          alt={salonName}
          className="aspect-[5/4] w-full object-cover transition duration-300 group-hover:opacity-95 md:aspect-[2/1]"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          width={768}
          height={614}
        />
      </button>
    );
  }
  if (uris.length === 2) {
    return (
      <div className="overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => onOpenGallery(0)}
          className={`group relative block w-full overflow-hidden md:hidden focus:outline-none focus-visible:ring-2 ${ringClass}`}
        >
          <img src={optimizedSrc(a, 768)} srcSet={heroSrcSet(a)} sizes="100vw" alt={salonName} className="aspect-[5/4] w-full object-cover transition duration-300 group-hover:opacity-95" fetchPriority="high" loading="eager" decoding="async" width={768} height={614} />
          <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow-md">
            Виж снимки
          </span>
        </button>
        <div className="hidden min-h-[300px] grid-cols-[3fr_2fr] gap-2 md:grid">
          <button
            type="button"
            onClick={() => onOpenGallery(0)}
            className={`relative min-h-[200px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
          >
            <img src={optimizedSrc(a, 768)} srcSet={heroSrcSet(a)} sizes="60vw" alt={salonName} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" loading="eager" decoding="async" />
          </button>
          <button
            type="button"
            onClick={() => onOpenGallery(1)}
            className={`relative min-h-[200px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
          >
            <img src={optimizedSrc(b, 480)} alt={salonName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => onOpenGallery(0)}
        className={`group relative block w-full overflow-hidden md:hidden focus:outline-none focus-visible:ring-2 ${ringClass}`}
      >
        <img src={optimizedSrc(a, 768)} srcSet={heroSrcSet(a)} sizes="100vw" alt={salonName} className="aspect-[5/4] w-full object-cover transition duration-300 group-hover:opacity-95" fetchPriority="high" loading="eager" decoding="async" width={768} height={614} />
        <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow-md">
          Преглед на всички изображения
        </span>
      </button>
      <div className="hidden min-h-[380px] grid-cols-[2fr_1fr] grid-rows-2 gap-2 md:grid">
        <button
          type="button"
          onClick={() => onOpenGallery(0)}
          className={`relative min-h-[200px] overflow-hidden md:row-span-2 md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
        >
          <img src={optimizedSrc(a, 768)} srcSet={heroSrcSet(a)} sizes="65vw" alt={salonName} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" loading="eager" decoding="async" />
        </button>
        <button
          type="button"
          onClick={() => onOpenGallery(1)}
          className={`relative min-h-[120px] overflow-hidden md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
        >
          <img src={optimizedSrc(b, 480)} alt={salonName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        </button>
        <button
          type="button"
          onClick={() => onOpenGallery(2)}
          className={`relative min-h-[120px] overflow-hidden md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
        >
          <img src={optimizedSrc(c!, 480)} alt={salonName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
          <span className="absolute bottom-2 right-2 max-w-[min(100%,220px)] rounded-full bg-white/95 px-3 py-2 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs">
            Преглед на всички изображения
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─── Team members row + profile modal ──────────────────────────────── */
type TeamMember = { id: string; name: string; role: string; bio: string; photoUrl: string };

function TeamMembersRow({
  members,
  optimizedSrc,
}: {
  members: TeamMember[];
  optimizedSrc: (src: string, w: number) => string;
}) {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <>
      <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'center', flexShrink: 0, width: 80 }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', margin: '0 auto' }}>
              {m.photoUrl ? (
                <img
                  src={optimizedSrc(m.photoUrl, 128)}
                  alt={m.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  decoding="async"
                  width={64}
                  height={64}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                  <User style={{ width: 28, height: 28, color: 'rgba(0,0,0,0.25)' }} aria-hidden />
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.name}</p>
            {m.role ? <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(0,0,0,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.role}</p> : null}
          </button>
        ))}
      </div>

      {/* Profile modal */}
      {selected ? (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
          onClick={() => setSelected(null)}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

          {/* Sheet */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              padding: '32px 24px 48px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', padding: 4, cursor: 'pointer', lineHeight: 1, color: '#1a1a1a' }}
              aria-label="Затвори"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>

            {/* Handle */}
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.12)' }} />

            {/* Large avatar */}
            <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              {selected.photoUrl ? (
                <img
                  src={optimizedSrc(selected.photoUrl, 192)}
                  alt={selected.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  width={96}
                  height={96}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                  <User style={{ width: 40, height: 40, color: 'rgba(0,0,0,0.25)' }} aria-hidden />
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{selected.name}</p>
              {selected.role ? <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{selected.role}</p> : null}
            </div>

            {selected.bio ? (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'rgba(0,0,0,0.65)', textAlign: 'center', maxWidth: 360 }}>
                {selected.bio}
              </p>
            ) : null}

          </div>
        </div>
      ) : null}
    </>
  );
}

export default function SalonPublicParity({
  salonSlug,
  salon: rawSalon,
  offers: offersProp,
  reviews: _reviews,
  googleReviews,
  highlightReviewId: highlightReviewIdProp,
  tabParam: tabParamProp,
  staticMapUrl,
  disableStickySectionTabs = false,
  publishedBlogCount = 0,
  hasPublishedBlogPosts = publishedBlogCount > 0,
  servicesEnriched,
  serviceCategories,
  faqItems,
  visitorInfo,
  visitorAdditionalInfo,
  blogSectionTitle,
  brandNames,
  openingHoursMerged,
  bookingBlocks,
  publicTeamMembers,
  siteContent,
  children,
}: SalonPublicParityProps & { children?: ReactNode }) {
  const highlightReviewId = (highlightReviewIdProp ?? '').trim() || null;
  const tabParam = (tabParamProp ?? '').trim();

  const [basePath, setBasePath] = useState(`/${salonSlug}`);

  useEffect(() => {
    const path = window.location.pathname;
    setBasePath(path.startsWith(`/${salonSlug}`) ? `/${salonSlug}` : '');
  }, [salonSlug]);

  const primary =
    typeof rawSalon.primary_color === 'string' && rawSalon.primary_color
      ? rawSalon.primary_color
      : '#5B21B6';
  const ringClass = 'focus-visible:ring-[color:var(--salon-primary)]';

  const salonId = String(rawSalon.id ?? '').trim();
  const name = String(rawSalon.name ?? 'Салон');
  const salonLocale = resolveSalonLocale(typeof rawSalon.language === 'string' ? rawSalon.language : 'bg');
  const bookingLocale = toLocaleTag(salonLocale);
  const heroTitle = String(salonLocale === 'en' ? rawSalon.hero_title_en ?? rawSalon.hero_title : rawSalon.hero_title ?? '').trim() || name;
  const heroSubtitle = String(salonLocale === 'en' ? rawSalon.hero_subtitle_en ?? rawSalon.hero_subtitle : rawSalon.hero_subtitle ?? '').trim();
  const description = String(salonLocale === 'en' ? rawSalon.about_en ?? rawSalon.about : rawSalon.about ?? '').trim() || siteContent.reformer.body;
  const phone = String(rawSalon.phone ?? '').trim();
  const city = String(rawSalon.city ?? '').trim();
  const address = String(rawSalon.address ?? '').trim();
  const imagesDb = rawSalon.images;
  const instagram = rawSalon.instagram_username as string | null | undefined;
  const facebook = rawSalon.facebook_username as string | null | undefined;
  const tiktok = (rawSalon.tiktok_username as string | null | undefined) ?? undefined;

  const footerSocial = useMemo(() => {
    const links: { href: string; label: string; node: ReactNode }[] = [];
    const igUrl = salonPublicInstagramUrl(instagram);
    const ttUrl = salonPublicTikTokUrl(tiktok);
    const fbUrl = salonPublicFacebookUrl(facebook);
    if (igUrl) {
      links.push({
        href: igUrl,
        label: 'Instagram',
        node: <Instagram className="h-4 w-4" strokeWidth={2} aria-hidden />,
      });
    }
    if (ttUrl) {
      links.push({
        href: ttUrl,
        label: 'TikTok',
        node: <TikTokIcon className="h-4 w-4" />,
      });
    }
    if (fbUrl) {
      links.push({
        href: fbUrl,
        label: 'Facebook',
        node: <Facebook className="h-4 w-4" strokeWidth={2} aria-hidden />,
      });
    }
    return links;
  }, [instagram, tiktok, facebook]);
  const googlePlaceId = (rawSalon.google_place_id as string | null | undefined) ?? null;
  const googleMapsUrl = String(rawSalon.google_maps_url ?? '').trim();
  const parsedGoogleMapsCoords = isGoogleMapsUrl(googleMapsUrl)
    ? extractCoordinatesFromGoogleMapsUrl(googleMapsUrl)
    : null;
  const lat = rawSalon.latitude != null ? Number(rawSalon.latitude) : parsedGoogleMapsCoords?.lat ?? null;
  const lng = rawSalon.longitude != null ? Number(rawSalon.longitude) : parsedGoogleMapsCoords?.lng ?? null;
  const hasPreciseLocation = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const addressQuery = [address, city].filter(Boolean).join(', ');
  const locationLabel = addressQuery || (googleMapsUrl ? 'Отвори локацията в Google Maps' : '');
  const fallbackMapQuery = addressQuery;
  const fallbackMapEmbedUrl = fallbackMapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(fallbackMapQuery)}&output=embed&z=16`
    : null;
  const mapEmbedUrl = hasPreciseLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`
    : fallbackMapEmbedUrl;
  const verified = rawSalon.verified === true;
  const [currentStatusLabel, setCurrentStatusLabel] = useState('');
  const currentStatusIsOpen = currentStatusLabel.startsWith('Отворено');

  useEffect(() => {
    setCurrentStatusLabel(getCurrentStatusString(openingHoursMerged));
  }, [openingHoursMerged]);

  const sectionRefs = useRef<Partial<Record<TabId, HTMLElement | null>>>({});
  const scrollSpySuppressUntilRef = useRef(0);
  const showStickySectionTabsRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const [revealedSections, setRevealedSections] = useState<Set<TabId>>(
    () => new Set<TabId>(['offers', 'services']),
  );
  const [activeTab, setActiveTab] = useState<TabId>('about');

  const revealSection = useCallback((tabId: TabId) => {
    setRevealedSections((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  }, []);
  const [showStickySectionTabs, setShowStickySectionTabs] = useState(false);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);
  const [serviceSort, setServiceSort] = useState<'default' | 'price_asc' | 'price_desc' | 'duration_asc'>('default');
  const [selectedVariantByServiceId, setSelectedVariantByServiceId] = useState<Record<string, string>>({});
  const [variantDropdownOpenForServiceId, setVariantDropdownOpenForServiceId] = useState<string | null>(null);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [galleryModal, setGalleryModal] = useState<{ uris: string[]; index: number } | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [offerBookingOpen, setOfferBookingOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<SalonOfferRow | null>(null);
  const [bookingServiceIdxs, setBookingServiceIdxs] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [occupiedSlotsByDate, setOccupiedSlotsByDate] = useState<Record<string, Array<{ time: string; duration: number; quantity?: number; blocksAll?: boolean }>>>({});
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingSuccessDetails, setBookingSuccessDetails] = useState<{
    serviceName: string;
    dateLabel: string;
    time: string;
    quantity?: number;
    totalPrice?: number;
  } | null>(null);

  // TEAM plan: staff members fetched once when the booking modal first opens.
  type PublicStaffMember = { id: string; name: string; slug: string; bio: string | null; avatarUrl: string | null; serviceIds: string[] };
  const [staffMembers, setStaffMembers] = useState<PublicStaffMember[]>([]);
  const [selectedStaffMemberId, setSelectedStaffMemberId] = useState<string | null>(null);
  const staffFetchedRef = useRef(false);
  useEffect(() => {
    if (!bookingOpen || staffFetchedRef.current) return;
    staffFetchedRef.current = true;
    fetch(`/api/staff?slug=${encodeURIComponent(salonSlug)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { staff?: PublicStaffMember[] }) => { if (Array.isArray(d.staff)) setStaffMembers(d.staff); })
      .catch(() => {});
  }, [bookingOpen, salonSlug]);

  const isValidImageUri = useCallback((uri: string | null | undefined) => uri != null && String(uri).trim().length > 0, []);

  const salonGalleryPhotos = useMemo(() => {
    if (!Array.isArray(imagesDb)) return [] as string[];
    const seen = new Set<string>();
    return imagesDb
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((u) => wireMediaUri(u.trim()))
      .filter((u) => {
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      });
  }, [imagesDb]);

  const portfolioPhotos = salonGalleryPhotos;

  const hasSalonGallery = salonGalleryPhotos.length > 0;
  const hasPortfolio = portfolioPhotos.length > 0;

  const heroUris = useMemo(() => [...salonGalleryPhotos], [salonGalleryPhotos]);

  const portfolioDisplay = useMemo(() => {
    if (portfolioPhotos.length === 0) return salonGalleryPhotos;
    const inPortfolio = new Set(portfolioPhotos);
    const missingFromGallery = salonGalleryPhotos.filter((url) => !inPortfolio.has(url));
    if (missingFromGallery.length > 0 && portfolioPhotos.length < salonGalleryPhotos.length) {
      return [...portfolioPhotos, ...missingFromGallery];
    }
    return portfolioPhotos;
  }, [portfolioPhotos, salonGalleryPhotos]);

  const servicesWithImages = useMemo(
    () =>
      servicesEnriched.map((s) => ({
        ...s,
        images: Array.isArray(s.images) ? s.images : [],
      })),
    [servicesEnriched]
  );

  const activeOffers = useMemo(() => {
    const now = Date.now();
    return offersProp.filter((o) => offerVisibleToClient(o, now));
  }, [offersProp]);

  const headerGoogleRating = useMemo(() => {
    if (!googlePlaceId) return null;
    const dbRatingRaw = Number(rawSalon.google_reviews_rating);
    const dbCountRaw = Number(rawSalon.google_reviews_count);
    const dbRating = Number.isFinite(dbRatingRaw) ? Math.round(dbRatingRaw * 10) / 10 : null;
    const dbCount = Number.isFinite(dbCountRaw) ? Math.max(0, Math.floor(dbCountRaw)) : null;
    if (dbRating != null && dbCount != null && dbCount > 0) return { rating: dbRating, count: dbCount };
    return null;
  }, [googlePlaceId, rawSalon.google_reviews_rating, rawSalon.google_reviews_count]);

  const addressDistanceLabel = useMemo(() => {
    if (!userLocation || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const km = getDistanceKm(userLocation.latitude, userLocation.longitude, lat, lng);
    if (!Number.isFinite(km)) return null;
    return formatDistanceFromUserToSalon(km);
  }, [userLocation, lat, lng]);

  const mapsHref =
    googleMapsUrl
      ? googleMapsUrl
      : hasPreciseLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
      : addressQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
      : null;

  const publicTeamSectionLabel = publicTeamMembers.length > 1 ? 'Екип' : 'Вашият специалист';
  const salonTabsWithTeamLabel = useMemo(
    () =>
      SALON_TABS.filter((t) => (t.id !== 'portfolio' || hasPortfolio) && (t.id !== 'offers' || activeOffers.length > 0)).map((t) =>
        t.id === 'team' ? { ...t, label: publicTeamSectionLabel } : t
      ),
    [publicTeamSectionLabel, hasPortfolio]
  );

  const scrollSpyTabOrder = useMemo(
    () => SCROLL_SPY_TAB_ORDER.filter((id) => (id !== 'portfolio' || hasPortfolio) && (id !== 'offers' || activeOffers.length > 0)),
    [hasPortfolio, activeOffers.length]
  );

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    if (userLocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [userLocation]);

  useEffect(() => {
    const d = new Date();
    const idx = (d.getDay() + 6) % 7;
    setTodayDayName(DAY_NAMES_EN[idx]);
  }, []);

  useEffect(() => {
    setServicesExpanded(false);
  }, [selectedServiceCategory]);

  useEffect(() => {
    if (tabParam === 'reviews' || highlightReviewId) {
      revealSection('reviews');
      setActiveTab('reviews');
      scrollSpySuppressUntilRef.current = Date.now() + 900;
      setTimeout(() => {
        sectionRefs.current.reviews?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [tabParam, highlightReviewId, revealSection]);

  useEffect(() => {
    if (typeof window === 'undefined' || !salonId) return;

    const STICKY_SHOW_BELOW = 56;
    const STICKY_HIDE_BELOW = 88;
    const SCROLL_SPY_OFFSET = 12;

    const activationLine = () => {
      if (showStickySectionTabsRef.current) return 92;
      return Math.min(200, Math.round(window.innerHeight * 0.16) + 72);
    };

    const updateFromScroll = () => {
      if (Date.now() < scrollSpySuppressUntilRef.current) return;

      if (!disableStickySectionTabs) {
        const aboutEl = sectionRefs.current.about;
        if (aboutEl) {
          const aboutBottom = aboutEl.getBoundingClientRect().bottom;
          const hasScrolled = window.scrollY > 48;
          const prevSticky = showStickySectionTabsRef.current;
          let nextSticky = prevSticky;
          if (!prevSticky && hasScrolled && aboutBottom <= STICKY_SHOW_BELOW) {
            nextSticky = true;
          } else if (prevSticky && (!hasScrolled || aboutBottom > STICKY_HIDE_BELOW)) {
            nextSticky = false;
          }
          if (nextSticky !== prevSticky) {
            showStickySectionTabsRef.current = nextSticky;
            setShowStickySectionTabs(nextSticky);
          }
        }
      } else if (showStickySectionTabsRef.current) {
        showStickySectionTabsRef.current = false;
        setShowStickySectionTabs(false);
      }

      const scrollY = window.scrollY;
      const scrollingDown = scrollY >= lastScrollYRef.current;
      lastScrollYRef.current = scrollY;

      const line = activationLine() + (scrollingDown ? 0 : SCROLL_SPY_OFFSET);
      let next: TabId = scrollSpyTabOrder[0] ?? 'offers';
      for (let i = scrollSpyTabOrder.length - 1; i >= 0; i--) {
        const id = scrollSpyTabOrder[i];
        const el = sectionRefs.current[id];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) {
          next = id;
          break;
        }
      }

      setActiveTab((prev) => {
        if (prev === next) return prev;
        revealSection(next);
        return next;
      });
    };

    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateFromScroll();
      });
    };

    lastScrollYRef.current = window.scrollY;
    updateFromScroll();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [salonId, disableStickySectionTabs, scrollSpyTabOrder, revealSection]);

  const scrollToSection = useCallback((tabId: TabId) => {
    revealSection(tabId);
    setActiveTab(tabId);
    scrollSpySuppressUntilRef.current = Date.now() + 800;
    requestAnimationFrame(() => {
      sectionRefs.current[tabId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [revealSection]);

  const servicesFilteredByCategory = useMemo(() => {
    if (!selectedServiceCategory) return servicesWithImages;
    return servicesWithImages.filter((s) => serviceMatchesCategory(s, selectedServiceCategory));
  }, [servicesWithImages, selectedServiceCategory]);

  const displayListRaw = useMemo(() => {
    const list = [...servicesFilteredByCategory];
    if (serviceSort === 'price_asc') list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (serviceSort === 'price_desc') list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (serviceSort === 'duration_asc') list.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));
    return list;
  }, [servicesFilteredByCategory, serviceSort]);
  const showAllServices = servicesExpanded || displayListRaw.length <= 5;
  const displayServices = showAllServices ? displayListRaw : displayListRaw.slice(0, 5);

  const getEffectiveServiceCb = useCallback((service: ServiceRow, variant: ServiceVariant | null) => {
    if (!variant) return service;
    return {
      ...service,
      id: `${service.id}::${variant.label}`,
      name: `${service.name} – ${variant.label}`,
      price: variant.price,
      original_price: undefined,
      duration: variant.duration ?? service.duration,
    };
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const showHint = (msg: string) => {
      setShareHint(msg);
      window.setTimeout(() => setShareHint(null), 2200);
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: name, text: name, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showHint('Линкът е копиран');
        return;
      }
    } catch {
      /* fallback below */
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showHint('Линкът е копиран');
    } catch {
      showHint('Копирай линка от адресната лента');
    } finally {
      document.body.removeChild(textarea);
    }
  }, [name]);

  const galleryGoPrev = useCallback(() => {
    setGalleryModal((m) => {
      if (!m || m.index <= 0) return m;
      return { ...m, index: m.index - 1 };
    });
  }, []);

  const galleryGoNext = useCallback(() => {
    setGalleryModal((m) => {
      if (!m || m.index >= m.uris.length - 1) return m;
      return { ...m, index: m.index + 1 };
    });
  }, []);

  const galleryOpen = galleryModal != null;
  useEffect(() => {
    if (!galleryOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [galleryOpen]);

  useEffect(() => {
    if (!galleryOpen || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setGalleryModal((m) => (m && m.index > 0 ? { ...m, index: m.index - 1 } : m));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setGalleryModal((m) => (m && m.index < m.uris.length - 1 ? { ...m, index: m.index + 1 } : m));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setGalleryModal(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#rezerviraj') {
      openBookingModal();
      window.history.replaceState(null, '', window.location.pathname);
    }
    function onHash() {
      if (window.location.hash === '#rezerviraj') {
        openBookingModal();
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open booking modal with pre-selected service when URL has ?service=<id>.
  // Allows external sites to deep-link straight into a specific service.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const sid = url.searchParams.get('service');
    if (!sid) return;
    openBookingModal(sid);
    url.searchParams.delete('service');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openBookingModal(serviceId?: string) {
    setBookingError('');
    setBookingSuccess('');
    if (serviceId) {
      const idx = bookingModalServices.findIndex((service) => service.id === serviceId);
      setBookingServiceIdxs(idx >= 0 ? [idx] : []);
    } else {
      setBookingServiceIdxs([]);
    }
    setSelectedDate('');
    setSelectedTime('');
    setBookingQuantity(1);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setBookingOpen(true);
    trackBookingStarted();
  }

  function closeBookingModal() {
    setBookingOpen(false);
    setBookingSuccessDetails(null);
    setSelectedStaffMemberId(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookingQuantity(1);
  }

  function openOfferBooking(offer: SalonOfferRow) {
    if (!offerHasSpotsLeft(offer)) return;
    setSelectedOffer(offer);
    setBookingError('');
    setBookingSuccess('');
    setBookingSuccessDetails(null);
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setOfferBookingOpen(true);
  }

  function closeOfferBooking() {
    setOfferBookingOpen(false);
    setSelectedOffer(null);
    setBookingSuccessDetails(null);
  }

  const offerDurationMin = Math.max(15, Number(selectedOffer?.duration_min ?? 60) || 60);

  const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const slotIntervalMin = (() => {
    const oh = rawSalon?.opening_hours;
    if (oh && typeof oh === 'object') {
      const v = Number((oh as Record<string, unknown>).slot_interval_min);
      if ([15, 20, 30, 45, 60].includes(v)) return v;
    }
    return 30;
  })();
  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  const wh = openingHoursMerged ?? {};
  const bookingModalServices = useMemo(() => {
    const out: ServiceRow[] = [];
    for (const service of servicesEnriched) {
      const variants = Array.isArray(service.variants) ? service.variants : [];
      if (variants.length === 0) {
        out.push(service);
        continue;
      }
      for (const variant of variants) {
        out.push({
          ...service,
          id: `${service.id}::${variant.label}`,
          name: `${service.name} – ${variant.label}`,
          price: Number(variant.price ?? service.price ?? 0) || 0,
          duration: Math.max(5, Number(variant.duration ?? service.duration ?? 30) || 30),
          variants: undefined,
        });
      }
    }
    return out;
  }, [servicesEnriched]);
  const selectedBookingServices = useMemo(
    () =>
      bookingServiceIdxs
        .map((idx) => bookingModalServices[idx])
        .filter((svc): svc is ServiceRow => Boolean(svc)),
    [bookingServiceIdxs, bookingModalServices]
  );
  const bookingTotalDuration = useMemo(
    () => selectedBookingServices.reduce((sum, svc) => sum + (Number(svc.duration) || 0), 0),
    [selectedBookingServices]
  );
  const bookingTotalPrice = useMemo(
    () => selectedBookingServices.reduce((sum, svc) => sum + (Number(svc.price) || 0), 0),
    [selectedBookingServices]
  );
  const bookingFinalPrice = useMemo(
    () => bookingTotalPrice * Math.max(1, bookingQuantity),
    [bookingQuantity, bookingTotalPrice],
  );
  const bookingSelectedCapacity = useMemo(() => {
    if (selectedBookingServices.length === 0) return 1;
    return Math.max(
      1,
      Math.min(...selectedBookingServices.map((svc) => Math.max(1, Math.round(Number(svc.capacity ?? 1) || 1)))),
    );
  }, [selectedBookingServices]);
  const usedQuantityForSlot = useCallback((date: string, time: string, durationMin: number): number | null => {
    if (!date || !time) return null;
    const slotCacheKey = selectedStaffMemberId ? `${date}:${selectedStaffMemberId}` : date;
    const occupied = occupiedSlotsByDate[slotCacheKey] ?? [];
    const [hh, mm] = time.split(':').map(Number);
    const slotStart = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
    const slotEnd = slotStart + Math.max(5, durationMin || 30);
    let used = 0;
    for (const booking of occupied) {
      const [bh, bm] = booking.time.split(':').map(Number);
      const bookingStart = (Number.isFinite(bh) ? bh : 0) * 60 + (Number.isFinite(bm) ? bm : 0);
      const bookingEnd = bookingStart + Math.max(5, Number(booking.duration) || 30);
      if (bookingStart < slotEnd && bookingEnd > slotStart) {
        if (booking.blocksAll === true) return bookingSelectedCapacity;
        used += Math.max(1, Math.round(Number(booking.quantity ?? 1) || 1));
      }
    }
    return used;
  }, [bookingSelectedCapacity, occupiedSlotsByDate, selectedStaffMemberId]);
  const selectedTimeRemaining = useMemo(() => {
    if (!selectedDate || !selectedTime || selectedBookingServices.length === 0) return null;
    const used = usedQuantityForSlot(selectedDate, selectedTime, bookingTotalDuration || 30);
    if (used == null) return null;
    return Math.max(0, bookingSelectedCapacity - used);
  }, [bookingSelectedCapacity, bookingTotalDuration, selectedBookingServices.length, selectedDate, selectedTime, usedQuantityForSlot]);
  useEffect(() => {
    const max = selectedTimeRemaining ?? bookingSelectedCapacity;
    setBookingQuantity((current) => Math.max(1, Math.min(Math.max(1, max), current)));
  }, [bookingSelectedCapacity, selectedTimeRemaining]);
  const handleBookingQuantityChange = useCallback((quantity: number) => {
    const max = selectedTimeRemaining ?? bookingSelectedCapacity;
    setBookingQuantity(Math.max(1, Math.min(Math.max(1, max), Math.round(Number(quantity) || 1))));
  }, [bookingSelectedCapacity, selectedTimeRemaining]);
  const handleBookingDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setBookingQuantity(1);
  }, []);
  const handleBookingTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
    setBookingQuantity(1);
  }, []);
  function slotsForDate(date: string, durationMin: number): string[] | 'closed' | null {
    if (!date) return null;
    const d = new Date(date + 'T12:00:00');
    const dayKey = DAY_KEYS[d.getDay()];
    const h = wh[dayKey] as { open?: string; close?: string } | null | undefined;
    if (!h) return 'closed';
    if (isDateBlockedAllDay(bookingBlocks, date)) return 'closed';
    if (!h.open || !h.close) return [];
    const totalDuration = Math.max(5, durationMin || 30);
    const slotCacheKey = selectedStaffMemberId ? `${date}:${selectedStaffMemberId}` : date;
    const occupied = occupiedSlotsByDate[slotCacheKey] ?? [];
    const [oh, om] = h.open.split(':').map(Number);
    const [ch, cm] = h.close.split(':').map(Number);
    const start = oh * 60 + om;
    const latestStart = ch * 60 + cm - totalDuration;
    const slots: string[] = [];
    for (let t = start; t <= latestStart; t += slotIntervalMin) {
      const slot = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      const slotStart = t;
      const slotEnd = t + totalDuration;
      const overlappingBookings = occupied.filter((b) => {
        const [bh, bm] = b.time.split(':').map(Number);
        const existingStart = (Number.isFinite(bh) ? bh : 0) * 60 + (Number.isFinite(bm) ? bm : 0);
        const existingEnd = existingStart + Math.max(5, Number(b.duration) || 30);
        return existingStart < slotEnd && existingEnd > slotStart;
      });
      if (overlappingBookings.some((booking) => booking.blocksAll === true)) continue;
      const usedQuantity = overlappingBookings.reduce(
        (sum, booking) => sum + Math.max(1, Math.round(Number(booking.quantity ?? 1) || 1)),
        0,
      );
      if (usedQuantity >= bookingSelectedCapacity) continue;
      if (!isBlockedForStartTime(bookingBlocks, date, slot, totalDuration)) {
        slots.push(slot);
      }
    }
    return slots;
  }

  const timeSlots: string[] | 'closed' | null =
    bookingServiceIdxs.length === 0 ? null : slotsForDate(selectedDate, bookingTotalDuration || 30);

  const offerTimeSlots: string[] | 'closed' | null =
    offerBookingOpen && selectedOffer ? slotsForDate(selectedDate, offerDurationMin) : null;

  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    (async () => {
      try {
        const staffParam = selectedStaffMemberId ? `&staffMemberId=${encodeURIComponent(selectedStaffMemberId)}` : '';
        const res = await fetch(
          `/api/bookings?public=1&slug=${encodeURIComponent(salonSlug)}&date=${encodeURIComponent(selectedDate)}${staffParam}`,
          { cache: 'no-store' },
        );
        const data = (await res.json().catch(() => ({}))) as {
          occupied?: Array<{ time?: string; duration?: number; quantity?: number; blocksAll?: boolean }>;
        };
        if (!res.ok || cancelled) return;
        const occupied = Array.isArray(data.occupied)
          ? data.occupied
              .map((x) => ({
                time: String(x?.time ?? ''),
                duration: Math.max(5, Number(x?.duration ?? 30) || 30),
                quantity: Math.max(1, Math.round(Number(x?.quantity ?? 1) || 1)),
                ...(x?.blocksAll === true ? { blocksAll: true } : {}),
              }))
              .filter((x) => x.time.length >= 4)
          : [];
        const cacheKey = selectedStaffMemberId ? `${selectedDate}:${selectedStaffMemberId}` : selectedDate;
        if (!cancelled) setOccupiedSlotsByDate((prev) => ({ ...prev, [cacheKey]: occupied }));
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salonSlug, selectedDate, selectedStaffMemberId]);

  useEffect(() => {
    const toLocalISODate = (date: Date) => {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().split('T')[0];
    };
    const today = new Date();
    setMinDate(toLocalISODate(today));
    const oh = rawSalon?.opening_hours;
    const advanceDays = (oh && typeof oh === 'object' && Number.isFinite(Number((oh as Record<string, unknown>).booking_advance_days)) && Number((oh as Record<string, unknown>).booking_advance_days) >= 1)
      ? Math.round(Number((oh as Record<string, unknown>).booking_advance_days))
      : 60;
    setMaxDate(
      toLocalISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + advanceDays))
    );
  }, []);

  const markDateSlotOccupied = useCallback((date: string, time: string, duration: number, quantity = 1) => {
    if (!date || !time) return;
    const normalizedDuration = Math.max(5, Number(duration) || 30);
    const normalizedQuantity = Math.max(1, Math.round(Number(quantity) || 1));
    setOccupiedSlotsByDate((prev) => {
      const cacheKey = selectedStaffMemberId ? `${date}:${selectedStaffMemberId}` : date;
      const day = prev[cacheKey] ?? [];
      return {
        ...prev,
        [cacheKey]: [...day, { time, duration: normalizedDuration, quantity: normalizedQuantity }],
      };
    });
  }, [selectedStaffMemberId]);

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    if (bookingServiceIdxs.length === 0) return setBookingError('Моля, изберете поне една услуга.');
    if (!clientName.trim()) return setBookingError('Моля, въведете вашето ime.');
    if (!clientPhone.trim()) return setBookingError('Моля, въведете телефонен номер.');
    if (!clientEmail.trim()) return setBookingError('Моля, въведете имейл.');
    if (!selectedDate) return setBookingError('Моля, изберете дата.');
    if (!selectedTime) return setBookingError('Моля, изберете час.');
    if (selectedBookingServices.length === 0) return setBookingError('Невалидна услуга.');

    const combinedServiceName = selectedBookingServices.map((s) => s.name).join(' + ');
    const combinedDuration = bookingTotalDuration || 30;

    // Determine payment requirement from the first selected service
    const firstService = selectedBookingServices[0];
    const paymentType = firstService?.payment_type ?? 'none';
    const depositAmount = firstService?.deposit_amount ?? 0;
    const amountEuros =
      paymentType === 'deposit' ? depositAmount :
      paymentType === 'full' ? (bookingFinalPrice ?? 0) : 0;
    const requiresPayment = paymentType !== 'none' && amountEuros > 0;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          serviceName: combinedServiceName,
          servicePrice: bookingFinalPrice,
          serviceDuration: combinedDuration,
          bookingQuantity,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
          requiresPayment,
          staffMemberId: selectedStaffMemberId ?? undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string; bookingId?: string };
      if (!res.ok) {
        const fallback =
          res.status === 500
            ? 'Резервацията не можа да бъде записана. Моля опитайте отново или се обадете по телефона.'
            : `Грешка ${res.status}`;
        throw new Error(json.error || fallback);
      }

      const createdBookingId = json.bookingId ?? json.id;
      if (requiresPayment && createdBookingId) {
        // Redirect to Stripe Checkout
        const payRes = await fetch('/api/stripe/booking-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: createdBookingId,
            salonSlug,
            serviceName: combinedServiceName,
            amountEuros,
            paymentType,
          }),
        });
        const payJson = (await payRes.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
        if (!payRes.ok || !payJson.checkoutUrl) {
          throw new Error(payJson.error ?? 'Грешка при инициализиране на плащането.');
        }
        window.location.href = payJson.checkoutUrl;
        return; // stop — page will redirect
      }

      const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('bg-BG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      markDateSlotOccupied(selectedDate, selectedTime, combinedDuration, bookingQuantity);
      setBookingSuccessDetails({
        serviceName: combinedServiceName,
        dateLabel,
        time: selectedTime,
        quantity: bookingQuantity,
        totalPrice: bookingFinalPrice,
      });
      setBookingSuccess(`${combinedServiceName} — ${dateLabel} в ${selectedTime} ч.`);
      trackBookingCompleted({
        serviceName: combinedServiceName,
        value: bookingFinalPrice && bookingFinalPrice > 0 ? bookingFinalPrice : undefined,
      });
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Грешка при резервация.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitOfferBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOffer) return;
    setBookingError('');
    setBookingSuccess('');
    if (!clientName.trim()) return setBookingError('Моля, въведете вашето име.');
    if (!clientPhone.trim()) return setBookingError('Моля, въведете телефонен номер.');
    if (!clientEmail.trim()) return setBookingError('Моля, въведете имейл.');
    if (!selectedDate) return setBookingError('Моля, изберете дата.');
    if (!selectedTime) return setBookingError('Моля, изберете час.');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          serviceName: selectedOffer.title,
          servicePrice: 0,
          serviceDuration: offerDurationMin,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Грешка при резервация на офертата.');
      }
      const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('bg-BG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      markDateSlotOccupied(selectedDate, selectedTime, offerDurationMin);
      setBookingSuccessDetails({ serviceName: selectedOffer.title, dateLabel, time: selectedTime, quantity: 1 });
      setBookingSuccess(
        json.message || `${selectedOffer.title} — ${dateLabel} в ${selectedTime} ч.`,
      );
      trackBookingCompleted({ serviceName: selectedOffer.title });
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Грешка при резервация.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const [showAllGoogleReviews, setShowAllGoogleReviews] = useState(false);
  const [todayDayName, setTodayDayName] = useState<string | null>(null);

  const googleRatingAvg = headerGoogleRating?.rating ?? null;

  return (
    <div
      className={`client-site min-h-screen [overflow-x:clip] bg-white text-[#1a1a1a] pb-20 lg:pb-10`}
      style={{ ['--salon-primary' as string]: primary } as React.CSSProperties}
    >
      <div className={`relative mx-auto w-full ${PUBLIC_SITE_MAX_WIDTH} px-0 pb-3 pt-3 md:px-6 md:pt-4`}>
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          {shareHint ? (
            <span
              role="status"
              className="rounded-full bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white shadow-lg"
            >
              {shareHint}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#1a1a1a] shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-sm active:scale-95"
            aria-label="Сподели"
          >
            <Share2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children ? <div className="md:hidden">{children}</div> : null}
        {heroUris.length > 0 ? (
          <div className={children ? 'hidden md:block' : undefined}>
            <SalonGalleryMosaic
              uris={heroUris}
              onOpenGallery={(i) => setGalleryModal({ uris: heroUris, index: i })}
              ringClass={ringClass}
              salonName={name}
            />
          </div>
        ) : !children ? (
          <div className="salon-text-muted flex h-44 items-center justify-center rounded-2xl border border-black/10 bg-[#fafafa] text-sm md:h-56">
            Няма снимки
          </div>
        ) : null}
      </div>

      {!disableStickySectionTabs ? (
        <div
          className={`fixed inset-x-0 top-0 z-20 border-b border-black/10 bg-white/95 px-4 py-2 backdrop-blur-sm shadow-[0_6px_24px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-150 lg:hidden ${
            showStickySectionTabs
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-full opacity-0'
          }`}
          aria-hidden={!showStickySectionTabs}
        >
          <div className={`relative mx-auto w-full ${PUBLIC_SITE_MAX_WIDTH}`}>
            <div className="flex gap-5 overflow-x-auto scrollbar-none">
              {salonTabsWithTeamLabel.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`sticky-${tab.id}`}
                    type="button"
                    tabIndex={showStickySectionTabs ? 0 : -1}
                    onClick={() => scrollToSection(tab.id)}
                    className={`relative shrink-0 whitespace-nowrap border-b-2 px-0 py-2 text-[15px] font-medium ${
                      isActive ? 'border-black text-[#1a1a1a]' : 'border-transparent text-[#1a1a1a] hover:text-[#1a1a1a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {hasPublishedBlogPosts ? (
                <a
                  href={`${basePath}/blog`}
                  className="relative shrink-0 whitespace-nowrap border-b-2 border-transparent px-0 py-2 text-[15px] font-medium text-[#404040] hover:text-[#1a1a1a]"
                >
                  {blogSectionTitle}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <main className={`mx-auto w-full ${PUBLIC_SITE_MAX_WIDTH} px-4 md:px-6`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(330px,360px)] lg:items-start lg:gap-x-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 lg:pb-0">
              <div className="min-w-0 flex-1">
                <h1 className="max-w-[12ch] text-balance text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[#171717] md:text-[2.3rem] lg:text-[2.65rem]">
                  {heroTitle}
                </h1>
                {heroSubtitle ? (
                  <p className="salon-text-light mt-2 max-w-[44ch] text-[0.96rem] leading-relaxed lg:mt-3">
                    {heroSubtitle}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm salon-text-muted">
                  {headerGoogleRating != null && (
                    <button
                      type="button"
                      className="inline-flex flex-wrap items-center gap-2 text-left"
                      onClick={() => scrollToSection('reviews')}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                        <span className="font-medium text-[#1a1a1a]">
                          {headerGoogleRating.rating.toFixed(1).replace('.', ',')}
                        </span>
                        <span className="salon-text-muted">({headerGoogleRating.count} Google)</span>
                      </span>
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${currentStatusIsOpen ? 'bg-emerald-500' : 'bg-black/25'}`} aria-hidden />
                    {currentStatusLabel}
                  </span>
                </div>
                {mapsHref || locationLabel ? (
                  <a
                    href={
                      mapsHref ??
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={requestGeolocation}
                    className="mt-2 inline-flex max-w-full items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: SALON_LINK_COLOR }}
                  >
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{locationLabel}</span>
                  </a>
                ) : null}
                {addressDistanceLabel ? <p className="salon-text-muted mt-1 text-xs">{addressDistanceLabel}</p> : null}
              </div>
            </div>

            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="salon-text-muted mt-3 inline-flex items-center gap-2 text-sm lg:hidden"
              >
                <Phone className="h-4 w-4" aria-hidden />
                {phone}
              </a>
            ) : null}

            <section
              ref={(el) => {
                sectionRefs.current.about = el;
              }}
              className="scroll-mt-24 pt-8 lg:pt-10"
            >
              <h2 className="max-w-[16ch] text-balance text-[1.32rem] font-semibold tracking-[-0.03em] text-[#171717] md:text-[1.55rem]">
                {siteContent.reformer.title}
              </h2>
              {siteContent.reformer.subtitle ? (
                <p className="mt-3 max-w-[60ch] text-[0.96rem] leading-relaxed text-[#4a4a4a]">{siteContent.reformer.subtitle}</p>
              ) : null}
              <p className="mt-3 max-w-[68ch] whitespace-pre-wrap text-[0.98rem] leading-[1.8] text-[#242424]">
                {descriptionExpanded
                  ? description || 'Няма добавено описание.'
                  : (description || 'Няма добавено описание.').slice(0, DESCRIPTION_PREVIEW_LEN)}
                {description.length > DESCRIPTION_PREVIEW_LEN && !descriptionExpanded ? '…' : ''}
              </p>
              {description.length > DESCRIPTION_PREVIEW_LEN ? (
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold text-[color:var(--salon-primary)]"
                  onClick={() => setDescriptionExpanded((e) => !e)}
                >
                  {descriptionExpanded ? 'Свий' : 'Прочети още'}
                </button>
              ) : null}

              <div className="mt-8 grid gap-8 lg:gap-10">
                <div>
                  <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#171717]">{siteContent.benefits.title}</h3>
                  {siteContent.benefits.intro ? (
                    <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.benefits.intro}</p>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {siteContent.benefits.items.map((item) => (
                      <article key={item.id} className="rounded-[1.35rem] border border-black/8 bg-[#f7f7f5] p-5">
                        <p className="text-[0.95rem] font-semibold text-[#171717]">{item.title}</p>
                        {item.text ? (
                          <p className="mt-2 text-[0.94rem] leading-relaxed text-[#4a4a4a]">{item.text}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#171717]">{siteContent.audience.title}</h3>
                  {siteContent.audience.intro ? (
                    <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.audience.intro}</p>
                  ) : null}
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {siteContent.audience.items.map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-[#1a1a1a]">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {siteContent.audience.outro ? (
                    <p className="mt-3 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.audience.outro}</p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#171717]">{siteContent.whyChooseUs.title}</h3>
                  {siteContent.whyChooseUs.intro ? (
                    <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.whyChooseUs.intro}</p>
                  ) : null}
                  <ul className="mt-3 grid gap-2">
                    {siteContent.whyChooseUs.items.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[#1a1a1a]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--salon-primary)]" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {siteContent.whyChooseUs.outro ? (
                    <p className="mt-3 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.whyChooseUs.outro}</p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#171717]">{siteContent.pricing.title}</h3>
                  {siteContent.pricing.intro ? (
                    <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.pricing.intro}</p>
                  ) : null}
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {siteContent.pricing.items.map((item) => (
                      <article key={item.id} className="rounded-[1.35rem] border border-black/8 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1a1a1a]">{item.name}</p>
                          {item.price ? <span className="text-sm text-[color:var(--salon-primary)]">{item.price}</span> : null}
                        </div>
                        {item.text ? (
                          <p className="mt-2 text-sm leading-relaxed text-[#404040]">{item.text}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                  {siteContent.pricing.note ? (
                    <p className="mt-3 text-xs leading-relaxed text-[#666]">{siteContent.pricing.note}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="-mx-4 mt-8 border-b border-black/10 bg-white px-4 py-1 lg:static lg:z-0 lg:mx-0 lg:border-b lg:border-t lg:border-black/10 lg:bg-transparent lg:px-0 lg:py-2">
              <div className="flex gap-5 overflow-x-auto border-black/10 scrollbar-none">
                {salonTabsWithTeamLabel.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => scrollToSection(tab.id)}
                      className={`relative shrink-0 whitespace-nowrap border-b-2 px-0 py-3 text-[15px] font-medium ${
                        isActive
                          ? 'border-black text-[#1a1a1a]'
                          : 'border-transparent text-[#404040] hover:text-[#1a1a1a]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
                {hasPublishedBlogPosts ? (
                  <a
                    href={`${basePath}/blog`}
                    className="relative shrink-0 whitespace-nowrap border-b-2 border-transparent px-0 py-3 text-[15px] font-medium text-[#404040] hover:text-[#1a1a1a]"
                  >
                    {blogSectionTitle}
                  </a>
                ) : null}
              </div>
            </div>

            {activeOffers.length > 0 ? <DeferredSection
              className="scroll-mt-36 pt-10 lg:pt-12"
              minHeight={240}
              eager={revealedSections.has('offers')}
              sectionRef={(el) => {
                sectionRefs.current.offers = el;
              }}
            >
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">Оферти на салона</h2>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {activeOffers.map((o) => {
                    const spots = offerSpotsLeft(o);
                    const soldOut = spots === 0;
                    return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => openOfferBooking(o)}
                      className={`relative w-[min(92vw,340px)] shrink-0 overflow-hidden rounded-2xl bg-black text-left ${soldOut ? 'opacity-60' : ''}`}
                      style={{ minHeight: 200 }}
                    >
                      {o.discount != null && o.discount > 0 ? (
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.45)]">
                          −{o.discount}%
                        </span>
                      ) : null}
                      {spots != null ? (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                          {soldOut ? 'Изчерпана' : `Остават ${spots}`}
                        </span>
                      ) : null}
                      {offerImagesList(o.images)[0] ? (
                        <img
                          src={optimizedSrc(wireMediaUri(offerImagesList(o.images)[0]), 320, 62)}
                          srcSet={`${optimizedSrc(wireMediaUri(offerImagesList(o.images)[0]), 320, 62)} 320w, ${optimizedSrc(wireMediaUri(offerImagesList(o.images)[0]), 480, 62)} 480w`}
                          sizes="(max-width: 768px) 340px, 340px"
                          alt={name}
                          className="absolute inset-0 h-full w-full object-cover opacity-90"
                          loading="lazy"
                          decoding="async"
                          width={340}
                          height={200}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-black" />
                      )}
                      <div className="relative flex min-h-[200px] flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">Специална оферта</p>
                        <p className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">{o.title}</p>
                        {o.description ? <p className="mt-1 line-clamp-2 text-sm text-white/85">{o.description}</p> : null}
                        <span className="mt-3 inline-flex w-fit items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                          {soldOut ? 'Изчерпана' : 'Резервирай офертата'}
                        </span>
                      </div>
                    </button>
                  );
                  })}
                </div>
            </DeferredSection> : null}

            <DeferredSection
              className="scroll-mt-36 pt-14"
              minHeight={280}
              eager={revealedSections.has('services')}
              sectionRef={(el) => {
                sectionRefs.current.services = el;
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">Услуги</h2>
                <select
                  value={serviceSort}
                  onChange={(e) => setServiceSort(e.target.value as typeof serviceSort)}
                  className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-medium text-[#1a1a1a] shadow-sm outline-none transition hover:border-black/30"
                  aria-label="Сортиране на услуги"
                >
                  <option value="default">По подразбиране</option>
                  <option value="price_asc">Цена: ниска → висока</option>
                  <option value="price_desc">Цена: висока → ниска</option>
                  <option value="duration_asc">Продължителност</option>
                </select>
              </div>
              {serviceCategories.length > 1 ? (
                <div className="mt-3">
                  <SalonServiceCategoryTabs
                    categories={serviceCategories}
                    selectedId={selectedServiceCategory}
                    onSelect={setSelectedServiceCategory}
                    className="-mx-4 px-4"
                  />
                </div>
              ) : null}
              <ul className="mt-3 space-y-2">
                {displayServices.map((service, idxInPage) => {
                  const variants = service.variants && service.variants.length > 0 ? service.variants : null;
                  const selectedVariantLabel = variants
                    ? selectedVariantByServiceId[service.id] ?? variants[0].label
                    : null;
                  const selectedVariant = variants
                    ? variants.find((v) => v.label === selectedVariantLabel) ?? variants[0]
                    : null;
                  const effective = getEffectiveServiceCb(service, selectedVariant);
                  return (
                    <li
                      key={`${service.id}-${idxInPage}`}
                      className="rounded-2xl border border-black/10 bg-white px-3.5 py-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                    >
                      <div className="flex flex-row items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium leading-snug text-[#1a1a1a]">{service.name}</p>
                          {variants && variants.length > 0 ? (
                            <div className="relative mt-1.5 max-w-full sm:max-w-md">
                              <button
                                type="button"
                                onClick={() =>
                                  setVariantDropdownOpenForServiceId((prev) => (prev === service.id ? null : service.id))
                                }
                                className="flex w-full items-center justify-between rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-left text-xs transition hover:border-black/30"
                              >
                                <span className="truncate">{selectedVariantLabel ?? 'Изберете вариант'}</span>
                                <ChevronDown
                                  className={`ml-2 h-4 w-4 shrink-0 transition ${variantDropdownOpenForServiceId === service.id ? 'rotate-180' : ''}`}
                                  aria-hidden
                                />
                              </button>
                              {variantDropdownOpenForServiceId === service.id ? (
                                <ul className="absolute z-30 mt-1 max-h-48 w-full max-w-[min(100%,20rem)] overflow-auto rounded-2xl border border-black/15 bg-white py-1 shadow-xl">
                                  {variants.map((v, idx) => (
                                    <li key={v.label}>
                                      <button
                                        type="button"
                                        className={`w-full px-3 py-2 text-left text-sm hover:text-[color:var(--salon-primary)] ${idx > 0 ? 'border-t border-black/10' : ''}`}
                                        onClick={() => {
                                          setSelectedVariantByServiceId((prev) => ({ ...prev, [service.id]: v.label }));
                                          setVariantDropdownOpenForServiceId(null);
                                        }}
                                      >
                                        <span className="block truncate">{v.label}</span>
                                        <span className="text-xs salon-text-muted">
                                          {v.duration ?? service.duration} мин · {formatDualEurText(String(v.price))}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-1.5 text-xs salon-text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" aria-hidden />
                              {effective.duration} мин
                            </span>
                        {effective.price != null ? (
                          <>
                            <span className="mx-1.5 text-black/35">·</span>
                                <span className="inline-flex items-baseline gap-2">
                                  {effective.original_price != null && effective.original_price > effective.price ? (
                                    <span className="text-xs text-[#666] line-through">
                                      {formatDualEurText(String(effective.original_price))}
                                    </span>
                                  ) : null}
                                  <span className="font-medium text-[#1a1a1a]">{formatDualEurText(String(effective.price))}</span>
                                </span>
                          </>
                        ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-center gap-1.5 self-center">
                          <button
                            type="button"
                            onClick={() => openBookingModal(effective.id)}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-black px-3.5 py-1.5 text-xs font-medium text-white sm:px-4 sm:text-sm"
                          >
                            Резервирай
                          </button>
                          {service.payment_type === 'deposit' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-black/40">
                              <svg viewBox="0 0 60 60" className="h-3 w-3 shrink-0" fill="none" aria-hidden>
                                <rect width="60" height="60" rx="8" fill="#635BFF"/>
                                <path d="M27.5 22.5c0-1.7 1.4-2.4 3.6-2.4 3.2 0 7.3 1 10.4 2.7v-9.8c-3.5-1.4-7-2-10.4-2C23.1 11 18 15.2 18 22.9c0 12.1 16.6 10.2 16.6 15.4 0 2-1.7 2.7-4.1 2.7-3.5 0-8-1.5-11.5-3.5v9.9c3.9 1.7 7.9 2.4 11.5 2.4 8.8 0 14.8-4.3 14.8-12.2C45.3 25.4 27.5 27.6 27.5 22.5z" fill="white"/>
                              </svg>
                              Изисква се депозит
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!showAllServices && displayListRaw.length > 5 ? (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    className="text-sm font-semibold text-[color:var(--salon-primary)]"
                    onClick={() => setServicesExpanded(true)}
                  >
                    Виж още ({displayListRaw.length - 5})
                  </button>
                </div>
              ) : null}
            </DeferredSection>

            {hasPortfolio ? (
              <DeferredSection
                className="scroll-mt-36 pt-14"
                minHeight={280}
                eager={revealedSections.has('portfolio')}
                sectionRef={(el) => {
                  sectionRefs.current.portfolio = el;
                }}
              >
                <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">{siteContent.gallery.title}</h2>
                {siteContent.gallery.subtitle ? (
                  <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.gallery.subtitle}</p>
                ) : null}
                {siteContent.gallery.body ? (
                  <p className="mt-3 max-w-[64ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.gallery.body}</p>
                ) : null}
                <div className="mt-5 grid gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {portfolioDisplay.slice(0, 2).map((uri, idx) => (
                      <button
                        key={`hero-${uri}-${idx}`}
                        type="button"
                        onClick={() => setGalleryModal({ uris: portfolioDisplay, index: idx })}
                        className="relative h-48 overflow-hidden rounded-2xl sm:h-64"
                      >
                        <img
                          src={optimizedSrc(uri, 960)}
                          srcSet={`${optimizedSrc(uri, 480)} 480w, ${optimizedSrc(uri, 960)} 960w`}
                          sizes="(max-width: 640px) 50vw, 40vw"
                          alt={name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={560}
                          height={420}
                        />
                      </button>
                    ))}
                  </div>
                  {portfolioDisplay.length > 2 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {portfolioDisplay.slice(2).map((uri, idx) => (
                        <button
                          key={`thumb-${uri}-${idx}`}
                          type="button"
                          onClick={() => setGalleryModal({ uris: portfolioDisplay, index: idx + 2 })}
                          className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-32"
                        >
                          <img
                            src={optimizedSrc(uri, 320)}
                            srcSet={`${optimizedSrc(uri, 240)} 240w, ${optimizedSrc(uri, 320)} 320w`}
                            sizes="112px"
                            alt={name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={128}
                            height={96}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </DeferredSection>
            ) : null}

            <DeferredSection
              className="scroll-mt-36 pt-14"
              minHeight={120}
              eager={revealedSections.has('team')}
              sectionRef={(el) => {
                sectionRefs.current.team = el;
              }}
            >
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">{siteContent.instructors.title || publicTeamSectionLabel}</h2>
              {siteContent.instructors.subtitle ? (
                <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.instructors.subtitle}</p>
              ) : null}
              {siteContent.instructors.body ? (
                <p className="mt-3 max-w-[62ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.instructors.body}</p>
              ) : null}
              {publicTeamMembers.length > 0 ? (
                <TeamMembersRow members={publicTeamMembers} optimizedSrc={optimizedSrc} />
              ) : (
                <p className="mt-3 text-sm salon-text-muted">Няма добавени специалисти.</p>
              )}
            </DeferredSection>

            <DeferredSection
              className="scroll-mt-36 pt-14"
              minHeight={200}
              eager={revealedSections.has('reviews')}
              sectionRef={(el) => {
                sectionRefs.current.reviews = el;
              }}
            >
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[1.2rem] font-medium tracking-[-0.03em] text-[#171717]">Ревюта от Google</h2>
                  {googleRatingAvg != null ? (
                    <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1">
                      <span className="text-sm font-semibold text-[#1a1a1a]">{googleRatingAvg.toFixed(1)}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
                    </div>
                  ) : null}
                </div>
                {googlePlaceId && googleReviews.length > 0 ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                      {(showAllGoogleReviews ? googleReviews : googleReviews.slice(0, GOOGLE_REVIEWS_INITIAL_VISIBLE)).map(
                        (r, i) => (
                          <article key={`g-${i}`} className="rounded-xl border border-black/10 bg-white p-3.5 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white">
                                <User className="h-3.5 w-3.5 text-[#1a1a1a]" aria-hidden />
                              </div>
                              <p className="flex-1 text-sm font-medium text-[#1a1a1a]">{r.author_name}</p>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }, (_, j) => (
                                  <Star
                                    key={j}
                                    className={`h-3 w-3 ${j < r.rating ? 'fill-amber-500 text-amber-500' : 'text-black/15'}`}
                                    aria-hidden
                                  />
                                ))}
                              </div>
                            </div>
                            {r.text ? <p className="mt-2 line-clamp-4 text-sm salon-text-muted">{r.text}</p> : null}
                          </article>
                        )
                      )}
                    </div>
                    {googleReviews.length > GOOGLE_REVIEWS_INITIAL_VISIBLE ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-full border border-black/10 py-2 text-sm font-medium text-[color:var(--salon-primary)] md:col-span-2"
                        onClick={() => setShowAllGoogleReviews((v) => !v)}
                      >
                        {showAllGoogleReviews ? 'Свий' : `Виж още (${googleReviews.length - GOOGLE_REVIEWS_INITIAL_VISIBLE})`}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="py-5 text-center text-sm font-normal salon-text-muted">Все още няма Google ревюта</p>
                )}
              </div>
            </DeferredSection>

            <section className="pt-14">
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">Работно време</h2>
              <ul className="mt-3 space-y-2">
                {DAY_NAMES_EN.map((dayKey) => {
                  const hours = getEffectiveHours(openingHoursMerged, dayKey);
                  const isOpen = hours != null;
                  const label = DAY_LABELS_BG[dayKey] ?? dayKey;
                  const isToday = todayDayName === dayKey;
                  return (
                    <li key={dayKey} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-black/25'}`}
                      />
                      <span className={isToday ? 'font-semibold text-[#1a1a1a]' : 'salon-text-muted'}>{label}</span>
                      <span className={`ml-auto ${isToday ? 'font-semibold text-[#1a1a1a]' : 'text-[#1a1a1a]'}`}>
                        {isOpen ? `${hours!.open} - ${hours!.close}` : 'Затворено'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <PublicVisitorFaq
              faqItems={faqItems}
              visitorInfo={visitorInfo}
              visitorAdditionalInfo={visitorAdditionalInfo}
              venueExtrasRaw={rawSalon.venue_extras ?? rawSalon.venueExtras}
            />

            {brandNames.length > 0 && (
              <SalonBrandsSection brandNames={brandNames} />
            )}

            <section className="pt-14">
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">{siteContent.contact.title}</h2>
              {siteContent.contact.subtitle ? (
                <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.contact.subtitle}</p>
              ) : null}
              {siteContent.contact.body ? (
                <p className="mt-3 max-w-[62ch] whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[#4a4a4a]">{siteContent.contact.body}</p>
              ) : null}
              <div className="mt-4 grid gap-2 text-sm text-[#1a1a1a]">
                {addressQuery ? <p>{addressQuery}</p> : null}
                {phone ? <p>{phone}</p> : null}
                {String(rawSalon.email ?? '').trim() ? <p>{String(rawSalon.email ?? '').trim()}</p> : null}
              </div>
            </section>

            {mapEmbedUrl && mapsHref ? (
              <DeferredSection className="pt-14" minHeight={220}>
                <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">Локация</h2>
                <div className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-black/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
                  <iframe
                    title="Карта на салона"
                    src={mapEmbedUrl}
                    className="h-52 w-full border-0"
                    loading="lazy"
                  />
                  <a
                    href={mapsHref!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Отвори локацията в Google Maps"
                    className="absolute inset-0"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <span className="rounded-md bg-[#1a1a1a] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                        {name}
                      </span>
                      <svg width="14" height="20" viewBox="0 0 14 20" fill="none" className="drop-shadow-md" aria-hidden>
                        <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#1a1a1a" />
                      </svg>
                    </div>
                  </div>
                </div>
                <a
                  href={mapsHref!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline"
                  style={{ color: SALON_LINK_COLOR }}
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Отвори в Google Maps
                </a>
                <p className="mt-2 text-sm" style={{ color: SALON_LINK_COLOR }}>
                  {locationLabel}
                </p>
              </DeferredSection>
            ) : null}

          </div>

          <aside className="hidden lg:block lg:min-h-0 lg:self-stretch">
            <div className="sticky top-8">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold leading-snug text-[color:var(--salon-primary)]">{name}</p>
              {headerGoogleRating != null && (
                <button
                  type="button"
                  className="mt-2 flex flex-col items-start gap-1 text-left text-sm"
                  onClick={() => scrollToSection('reviews')}
                >
                  <span className="inline-flex items-center gap-1 salon-text-muted">
                    <span className="font-medium text-[#1a1a1a]">
                      {headerGoogleRating.rating.toFixed(1).replace('.', ',')}
                    </span>
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                    <span className="salon-text-muted">({headerGoogleRating.count} Google)</span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openBookingModal()}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white"
                style={{ background: primary }}
              >
                Резервирай сега
              </button>
              <div className="mt-5 space-y-4 pt-2 text-sm salon-text-muted">
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--salon-primary)]" aria-hidden />
                  <span className="min-w-0 leading-snug">{currentStatusLabel}</span>
                </div>
                {mapsHref || locationLabel ? (
                  <div>
                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: SALON_LINK_COLOR }} aria-hidden />
                      <span className="min-w-0" style={{ color: SALON_LINK_COLOR }}>
                        {locationLabel}
                        {addressDistanceLabel ? (
                          <span className="salon-text-muted mt-1 block text-xs">{addressDistanceLabel}</span>
                        ) : null}
                      </span>
                    </div>
                    <a
                      href={
                        mapsHref ??
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={requestGeolocation}
                      className="mt-2 inline-block pl-6 text-sm font-medium underline-offset-2 hover:underline"
                      style={{ color: SALON_LINK_COLOR }}
                    >
                      Вижте указанията
                    </a>
                  </div>
                ) : null}
                {phone ? (
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" aria-hidden />
                    {phone}
                  </a>
                ) : null}
              </div>
            </div>
            </div>
          </aside>
        </div>
      </main>

      <footer
        className="mt-8 w-full border-t border-white/10 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 22%, #1a1a2e) 0%, #0f0f1a 50%, color-mix(in srgb, ${primary} 10%, #0a0a14) 100%)`,
        }}
      >
        <div className="mx-auto flex w-full max-w-[min(100%,1180px)] flex-col gap-2.5 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-medium text-white/75">
              {name}
            </p>
            {footerSocial.length > 0 ? (
              <div className="flex shrink-0 items-center gap-2" aria-label="Социални мрежи">
                {footerSocial.map((item) => (
                  <SalonFooterSocialLink key={item.label} href={item.href} label={item.label}>
                    {item.node}
                  </SalonFooterSocialLink>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <nav className="flex items-center gap-1" aria-label="Правни документи">
              {hasPublishedBlogPosts ? (
                <a
                  href={`${basePath}/blog`}
                  className="px-1.5 py-1 text-[11px] text-white/55 transition-colors hover:text-white/80"
                >
                  {blogSectionTitle}
                </a>
              ) : null}
              <a
                href={`${basePath}/terms`}
                className="px-1.5 py-1 text-[11px] text-white/55 transition-colors hover:text-white/80"
              >
                Условия
              </a>
              <a
                href={`${basePath}/privacy`}
                className="px-1.5 py-1 text-[11px] text-white/55 transition-colors hover:text-white/80"
              >
                Поверителност
              </a>
              <a
                href={`${basePath}/cookies`}
                className="px-1.5 py-1 text-[11px] text-white/55 transition-colors hover:text-white/80"
              >
                Бисквитки
              </a>
            </nav>
          </div>
        </div>
      </footer>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white px-3 pt-2 lg:hidden"
        style={{
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <div className="mx-auto w-full max-w-[min(100%,1180px)]">
          <button
            type="button"
            onClick={() => openBookingModal()}
            className="block w-full rounded-full py-2.5 text-[15px] font-semibold text-white"
            style={{ background: primary }}
          >
            Резервирай
          </button>
        </div>
      </div>

      {galleryModal && galleryModal.uris.length > 0 ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal aria-label="Галерия">
          <div className="flex shrink-0 justify-end p-3">
            <button
              type="button"
              onClick={() => setGalleryModal(null)}
              className="rounded-full p-2 text-white touch-manipulation"
              aria-label="Затвори"
            >
              <X className="h-7 w-7" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-4">
            <div
              className="relative inline-block max-h-[min(80vh,100%)] max-w-full touch-manipulation"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const mid = rect.left + rect.width / 2;
                if (x < mid) galleryGoPrev();
                else galleryGoNext();
              }}
              role="presentation"
            >
              <img
                key={`${galleryModal.index}-${galleryModal.uris[galleryModal.index]}`}
                src={optimizedSrc(galleryModal.uris[galleryModal.index], 1280)}
                srcSet={heroSrcSet(galleryModal.uris[galleryModal.index])}
                sizes="100vw"
                alt={name}
                className="max-h-[min(80vh,85dvh)] max-w-full touch-manipulation object-contain select-none"
                loading="eager"
                decoding="async"
                draggable={false}
              />
              <button
                type="button"
                aria-label="Предишна снимка"
                disabled={galleryModal.index <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  galleryGoPrev();
                }}
                className="absolute left-1 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-25 sm:left-2"
              >
                <ChevronLeft className="h-7 w-7" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Следваща снимка"
                disabled={galleryModal.index >= galleryModal.uris.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  galleryGoNext();
                }}
                className="absolute right-1 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-25 sm:right-2"
              >
                <ChevronRight className="h-7 w-7" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bookingOpen ? (
        <I18nProvider locale={salonLocale}>
          <SalonBookingModal
            open
            primaryColor={primary}
            locale={bookingLocale}
            serviceCatalog={servicesEnriched}
            categoryTabs={serviceCategories}
            services={bookingModalServices}
            selectedServiceIdxs={bookingServiceIdxs}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            totalDuration={bookingTotalDuration}
            totalPrice={bookingFinalPrice}
            baseTotalPrice={bookingTotalPrice}
            bookingQuantity={bookingQuantity}
            selectedCapacity={bookingSelectedCapacity}
            selectedTimeRemaining={selectedTimeRemaining}
            clientName={clientName}
            clientPhone={clientPhone}
            clientEmail={clientEmail}
            notes={notes}
            salonName={name}
            termsHref={`${basePath}/terms`}
            privacyHref={`${basePath}/privacy`}
            minDate={minDate}
            maxDate={maxDate}
            timeSlots={timeSlots}
            paymentType={selectedBookingServices[0]?.payment_type ?? 'none'}
            depositAmount={selectedBookingServices[0]?.deposit_amount}
            cancelPolicyHours={selectedBookingServices[0]?.cancel_policy_hours}
            cancelPolicyAction={selectedBookingServices[0]?.cancel_policy_action}
            isSubmitting={isSubmitting}
            bookingError={bookingError}
            bookingSuccess={bookingSuccess}
            bookingSuccessDetails={bookingSuccessDetails}
            onClose={closeBookingModal}
            onToggleService={(idx) => {
              setBookingServiceIdxs((prev) => {
                const has = prev.includes(idx);
                const next = has ? prev.filter((x) => x !== idx) : [...prev, idx];
                return next;
              });
              setSelectedTime('');
              setBookingQuantity(1);
            }}
            onDateChange={handleBookingDateChange}
            onTimeChange={handleBookingTimeChange}
            onBookingQuantityChange={handleBookingQuantityChange}
            onClientNameChange={setClientName}
            onClientPhoneChange={setClientPhone}
            onClientEmailChange={setClientEmail}
            onNotesChange={setNotes}
            onSubmit={submitBooking}
            staffMembers={staffMembers}
            selectedStaffMemberId={selectedStaffMemberId}
            onStaffMemberChange={(id) => {
              setSelectedStaffMemberId(id);
              setSelectedDate('');
              setSelectedTime('');
              setBookingQuantity(1);
            }}
          />
        </I18nProvider>
      ) : null}

      <SalonOfferBookingModal
        open={offerBookingOpen}
        offer={selectedOffer}
        primaryColor={primary}
        salonName={name}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        durationMin={offerDurationMin}
        clientName={clientName}
        clientPhone={clientPhone}
        clientEmail={clientEmail}
        notes={notes}
        termsHref={`${basePath}/terms`}
        privacyHref={`${basePath}/privacy`}
        minDate={minDate}
        maxDate={maxDate}
        timeSlots={offerTimeSlots}
        isSubmitting={isSubmitting}
        bookingError={bookingError}
        bookingSuccess={bookingSuccess}
        bookingSuccessDetails={bookingSuccessDetails}
        onClose={closeOfferBooking}
        onDateChange={(date) => {
          setSelectedDate(date);
          setSelectedTime('');
        }}
        onTimeChange={setSelectedTime}
        onClientNameChange={setClientName}
        onClientPhoneChange={setClientPhone}
        onClientEmailChange={setClientEmail}
        onNotesChange={setNotes}
        onSubmit={submitOfferBooking}
      />

      {/* AI assistant with optional live chat escalation to Telegram — hidden while the booking modal is open so it doesn't compete for attention */}
      {!bookingOpen ? (
        <SalonAiBotWidget
          salonId={salonId}
          salonName={name}
          primaryColor={primary}
          hasTelegram={!!rawSalon.telegram_chat_id}
          onOpenBooking={(serviceName) => {
            if (serviceName) {
              const svc = bookingModalServices.find((s) => s.name.toLowerCase() === serviceName.toLowerCase());
              if (svc) { openBookingModal(svc.id); return; }
            }
            openBookingModal();
          }}
        />
      ) : null}
    </div>
  );
}
