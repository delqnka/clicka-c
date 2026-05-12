'use client';

/**
 * White-label публична салон страница — структура и UX по образец на BOOKA уеб (`web/.../salon/[id]`),
 * данни само от Clicka (props + Neon). Без маркетинг бранд на BOOKA в копито.
 */

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
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
} from 'react';

import { getGradientColorsForUser, getInitialsDotted } from '@/lib/avatar-gradient';
import { formatDistanceFromUserToSalon, getDistanceKm } from '@/lib/geo';
import { offerEffectiveForClient } from '@/lib/offer-validity';
import {
  DAY_LABELS_BG,
  DAY_NAMES_EN,
  getCurrentStatusString,
  getEffectiveHours,
  mergeOpeningHours,
  type OpeningDayRecord,
} from '@/lib/salon-opening-hours';
import {
  parseSalonVenueExtras,
  SALON_PARKING_KEYS,
  SALON_PARKING_LABELS_BG,
  SALON_PARKING_PUBLIC_TEXT_COLOR,
  SALON_PAYMENT_LABELS_BG,
  SALON_VENUE_EXTRA_KEYS,
  SALON_VENUE_EXTRA_LABELS_BG,
  type SalonParkingKey,
  type SalonVenueExtraKey,
} from '@/lib/salon-venue-extras';

const APPLE_LINK_BLUE = '#0A84FF';

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
const INITIAL_REVIEWS_VISIBLE = 3;

export type SalonOfferRow = {
  id: string;
  title: string;
  description?: string | null;
  discount?: number | null;
  images?: unknown;
  is_active?: boolean;
  valid_until?: string | null;
  campaign_valid_from?: string | null;
  campaign_valid_until?: string | null;
  max_claims?: number | null;
  total_claims?: number | null;
};

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
  staticMapUrl?: string | null;
  disableStickySectionTabs?: boolean;
};

function wireMediaUri(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return s;
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

function salonPublicFacebookUrl(stored: string | null | undefined): string | null {
  const s = (stored ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.facebook.com/${s.replace(/^\//, '')}`;
}

function offerImagesList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

type ServiceRow = {
  id: string;
  name: string;
  duration: number;
  price?: number;
  category?: string;
  images?: string[];
  variants?: { label: string; price: number; duration?: number }[];
};

type ServiceVariant = NonNullable<ServiceRow['variants']>[number];

function SalonGalleryMosaic({
  uris,
  onOpenGallery,
  ringClass,
}: {
  uris: string[];
  onOpenGallery: (index: number) => void;
  ringClass: string;
}) {
  if (uris.length === 0) {
    return (
      <div
        className={`flex h-44 items-center justify-center rounded-2xl border border-black/10 bg-white text-sm text-black/50 md:h-56`}
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
          src={a}
          alt=""
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:opacity-95 md:aspect-[2/1]"
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
          <img src={a} alt="" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:opacity-95" />
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
            <img src={a} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </button>
          <button
            type="button"
            onClick={() => onOpenGallery(1)}
            className={`relative min-h-[200px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
          >
            <img src={b} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
        <img src={a} alt="" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:opacity-95" />
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
          <img src={a} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </button>
        <button
          type="button"
          onClick={() => onOpenGallery(1)}
          className={`relative min-h-[120px] overflow-hidden md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
        >
          <img src={b} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </button>
        <button
          type="button"
          onClick={() => onOpenGallery(2)}
          className={`relative min-h-[120px] overflow-hidden md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${ringClass}`}
        >
          <img src={c!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute bottom-2 right-2 max-w-[min(100%,220px)] rounded-full bg-white/95 px-3 py-2 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs">
            Преглед на всички изображения
          </span>
        </button>
      </div>
    </div>
  );
}

export default function SalonPublicParity({
  salonSlug,
  salon: rawSalon,
  offers: offersProp,
  reviews,
  googleReviews,
  highlightReviewId: highlightReviewIdProp,
  tabParam: tabParamProp,
  staticMapUrl,
  disableStickySectionTabs = false,
}: SalonPublicParityProps) {
  const highlightReviewId = (highlightReviewIdProp ?? '').trim() || null;
  const tabParam = (tabParamProp ?? '').trim();

  const primary =
    typeof rawSalon.primary_color === 'string' && rawSalon.primary_color
      ? rawSalon.primary_color
      : '#5B21B6';
  const ringClass = 'focus-visible:ring-[color:var(--salon-primary)]';

  const salonId = String(rawSalon.id ?? '').trim();
  const name = String(rawSalon.name ?? 'Салон');
  const category = String(rawSalon.category ?? '').trim();
  const description = String(rawSalon.about ?? '').trim();
  const phone = String(rawSalon.phone ?? '').trim();
  const city = String(rawSalon.city ?? '').trim();
  const address = String(rawSalon.address ?? '').trim();
  const cover = String(rawSalon.cover_image_url ?? '').trim();
  const portfolioDb = rawSalon.portfolio_images;
  const galleryDb = rawSalon.gallery_images;
  const instagram = rawSalon.instagram_username as string | null | undefined;
  const facebook = rawSalon.facebook_username as string | null | undefined;
  const tiktok = (rawSalon.tiktok_username as string | null | undefined) ?? undefined;
  const googlePlaceId = (rawSalon.google_place_id as string | null | undefined) ?? null;
  const ratingAgg = Number(rawSalon.rating) || 0;
  const reviewCountAgg = Number(rawSalon.review_count) || 0;
  const lat = rawSalon.latitude != null ? Number(rawSalon.latitude) : null;
  const lng = rawSalon.longitude != null ? Number(rawSalon.longitude) : null;
  const verified = rawSalon.verified === true;
  const ownerName = String(rawSalon.owner_name ?? '').trim();
  const ownerRole = String(rawSalon.owner_public_role ?? '').trim();
  const ownerPhoto = String(rawSalon.owner_public_photo_url ?? '').trim();
  const workingHours = rawSalon.working_hours as
    | Record<string, { open?: string; close?: string; closed?: boolean }>
    | undefined;
  const openingHoursMerged: OpeningDayRecord = mergeOpeningHours(
    workingHours,
    rawSalon.opening_hours
  );

  const venueRaw = rawSalon.venue_extras ?? rawSalon.venueExtras;
  const ve = parseSalonVenueExtras(venueRaw);
  const activeExtraKeys = (SALON_VENUE_EXTRA_KEYS as readonly SalonVenueExtraKey[]).filter((k) => ve[k] === true);
  const parkingActive = (SALON_PARKING_KEYS as readonly SalonParkingKey[]).filter((k) => ve[k] === true);
  const showParking = parkingActive.length > 0;
  const pay = ve.paymentPreference ? SALON_PAYMENT_LABELS_BG[ve.paymentPreference] : null;
  const showVenueBlock = activeExtraKeys.length > 0 || showParking || !!pay;

  const servicesFromDb = useMemo((): ServiceRow[] => {
    const raw = rawSalon.services;
    if (!Array.isArray(raw)) return [];
    return raw.map((s: unknown, i: number) => {
      const o = s as Record<string, unknown>;
      const duration = Number(o.duration ?? o.duration_min ?? 30) || 30;
      const price = o.price != null ? Number(o.price) : undefined;
      const variants = Array.isArray(o.variants)
        ? (o.variants as { label: string; price: number; duration?: number }[])
        : undefined;
      return {
        id: String(o.id ?? `svc-${i}`),
        name: String(o.name ?? 'Услуга'),
        duration,
        price,
        category: typeof o.category === 'string' ? o.category : undefined,
        images: Array.isArray(o.images) ? (o.images as string[]) : undefined,
        variants,
      };
    });
  }, [rawSalon.services]);

  const sectionRefs = useRef<Partial<Record<TabId, HTMLElement | null>>>({});
  const scrollSpySuppressUntilRef = useRef(0);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [showStickySectionTabs, setShowStickySectionTabs] = useState(false);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);
  const [selectedVariantByServiceId, setSelectedVariantByServiceId] = useState<Record<string, string>>({});
  const [variantDropdownOpenForServiceId, setVariantDropdownOpenForServiceId] = useState<string | null>(null);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [galleryModal, setGalleryModal] = useState<{ uris: string[]; index: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServiceIdx, setBookingServiceIdx] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const isValidImageUri = useCallback((uri: string | null | undefined) => uri != null && String(uri).trim().length > 0, []);

  const portfolioArr = useMemo(() => {
    if (Array.isArray(portfolioDb))
      return portfolioDb.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return [] as string[];
  }, [portfolioDb]);

  const galleryList = useMemo(() => {
    const g = Array.isArray(galleryDb)
      ? galleryDb.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const list = [cover, ...portfolioArr, ...g].filter(isValidImageUri) as string[];
    const seen = new Set<string>();
    return list.filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  }, [cover, portfolioArr, galleryDb, isValidImageUri]);

  const allGalleryWired = useMemo(() => galleryList.map((u) => wireMediaUri(u)), [galleryList]);
  const headerImage = galleryList[0] ?? null;
  const portfolioDisplay = useMemo(() => {
    const pf = portfolioArr.filter(isValidImageUri).map(wireMediaUri);
    if (!headerImage) return pf;
    return pf.filter((u) => u !== wireMediaUri(headerImage)).map(wireMediaUri);
  }, [portfolioArr, headerImage, isValidImageUri]);

  const servicesWithImages = useMemo(
    () =>
      servicesFromDb.map((s) => ({
        ...s,
        images: Array.isArray(s.images) ? s.images : [],
      })),
    [servicesFromDb]
  );

  const serviceCategories = useMemo(() => {
    const labels = new Set<string>();
    for (const s of servicesFromDb) {
      const c = (s.category ?? '').trim();
      if (c) labels.add(c);
    }
    const cats = [...labels].sort((a, b) => a.localeCompare(b, 'bg'));
    return [{ id: null as string | null, label: 'Всички' }, ...cats.map((c) => ({ id: c, label: c }))];
  }, [servicesFromDb]);

  const activeOffers = useMemo(() => {
    const now = Date.now();
    return offersProp.filter((o) => {
      if (o.max_claims != null && (Number(o.total_claims) || 0) >= o.max_claims) return false;
      return offerEffectiveForClient(o, now);
    });
  }, [offersProp]);

  const headerPlatformRating =
    reviewCountAgg > 0 && ratingAgg > 0 ? { rating: ratingAgg, count: reviewCountAgg } : null;
  const headerGoogleRating = useMemo(() => {
    if (!googlePlaceId || googleReviews.length === 0) return null;
    const sum = googleReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const rating = Math.round((sum / googleReviews.length) * 10) / 10;
    return { rating, count: googleReviews.length };
  }, [googlePlaceId, googleReviews]);

  const addressDistanceLabel = useMemo(() => {
    if (!userLocation || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const km = getDistanceKm(userLocation.latitude, userLocation.longitude, lat, lng);
    if (!Number.isFinite(km)) return null;
    return formatDistanceFromUserToSalon(km);
  }, [userLocation, lat, lng]);

  const mapsHref =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
      : null;

  const publicTeamSectionLabel = 'Вашият специалист';
  const salonTabsWithTeamLabel = useMemo(
    () => SALON_TABS.map((t) => (t.id === 'team' ? { ...t, label: publicTeamSectionLabel } : t)),
    [publicTeamSectionLabel]
  );

  const teamJson = rawSalon.team as { name?: string; role?: string; photo_url?: string }[] | undefined;
  const publicTeamMembers = useMemo(() => {
    const fromJson = Array.isArray(teamJson)
      ? teamJson
          .filter((m) => (m.name ?? '').trim())
          .map((m, i) => ({
            id: `tm-${i}`,
            name: (m.name ?? '').trim(),
            role: (m.role ?? '').trim(),
            photoUrl: wireMediaUri((m.photo_url ?? '').trim()),
          }))
      : [];
    if (fromJson.length > 0) return fromJson;
    const displayName = ownerName || name;
    if (!displayName) return [];
    return [
      {
        id: 'owner',
        name: displayName,
        role: ownerRole,
        photoUrl: wireMediaUri(ownerPhoto),
      },
    ];
  }, [teamJson, ownerName, ownerRole, ownerPhoto, name]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    setServicesExpanded(false);
  }, [selectedServiceCategory]);

  useEffect(() => {
    if (tabParam === 'reviews' || highlightReviewId) {
      setActiveTab('reviews');
      scrollSpySuppressUntilRef.current = Date.now() + 900;
      setTimeout(() => {
        sectionRefs.current.reviews?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [tabParam, highlightReviewId]);

  useEffect(() => {
    if (disableStickySectionTabs) {
      setShowStickySectionTabs(false);
      return;
    }
    if (typeof window === 'undefined') return;
    const updateStickyTabs = () => {
      const el = sectionRefs.current.about;
      if (!el) return;
      const aboutBottom = el.getBoundingClientRect().bottom;
      const hasScrolled = window.scrollY > 48;
      const shouldShow = hasScrolled && aboutBottom <= 72;
      setShowStickySectionTabs((prev) => (prev === shouldShow ? prev : shouldShow));
    };
    updateStickyTabs();
    window.addEventListener('scroll', updateStickyTabs, { passive: true });
    window.addEventListener('resize', updateStickyTabs);
    return () => {
      window.removeEventListener('scroll', updateStickyTabs);
      window.removeEventListener('resize', updateStickyTabs);
    };
  }, [disableStickySectionTabs]);

  useEffect(() => {
    if (typeof window === 'undefined' || !salonId) return;
    const activationLine = () => {
      if (showStickySectionTabs) return 92;
      return Math.min(200, Math.round(window.innerHeight * 0.16) + 72);
    };
    const updateActiveFromScroll = () => {
      if (Date.now() < scrollSpySuppressUntilRef.current) return;
      const line = activationLine();
      let next: TabId = 'offers';
      for (let i = SCROLL_SPY_TAB_ORDER.length - 1; i >= 0; i--) {
        const id = SCROLL_SPY_TAB_ORDER[i];
        const el = sectionRefs.current[id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line + 6) {
          next = id;
          break;
        }
      }
      setActiveTab((prev) => (prev === next ? prev : next));
    };
    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateActiveFromScroll();
      });
    };
    updateActiveFromScroll();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [salonId, showStickySectionTabs]);

  const scrollToSection = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    scrollSpySuppressUntilRef.current = Date.now() + 800;
    sectionRefs.current[tabId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const servicesFilteredByCategory = useMemo(() => {
    if (!selectedServiceCategory) return servicesWithImages;
    return servicesWithImages.filter((s) => (s.category ?? '').trim() === selectedServiceCategory);
  }, [servicesWithImages, selectedServiceCategory]);

  const displayListRaw = servicesFilteredByCategory;
  const showAllServices = servicesExpanded || displayListRaw.length <= 5;
  const displayServices = showAllServices ? displayListRaw : displayListRaw.slice(0, 5);

  const getEffectiveServiceCb = useCallback((service: ServiceRow, variant: ServiceVariant | null) => {
    if (!variant) return service;
    return {
      ...service,
      id: `${service.id}::${variant.label}`,
      name: `${service.name} – ${variant.label}`,
      price: variant.price,
      duration: variant.duration ?? service.duration,
    };
  }, []);

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ title: name, text: `${name} – ${url}`, url }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      void navigator.clipboard.writeText(url);
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

  function openBookingModal(serviceIdx?: number) {
    setBookingError('');
    setBookingSuccess('');
    if (serviceIdx !== undefined) setBookingServiceIdx(serviceIdx);
    else setBookingServiceIdx('');
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setNotes('');
    setBookingOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeBookingModal() {
    setBookingOpen(false);
    document.body.style.overflow = '';
  }

  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  function pad(n: number) {
    return String(n).padStart(2, '0');
  }
  function generateSlots(openStr: string, closeStr: string, stepMin = 30): string[] {
    const [oh, om] = openStr.split(':').map(Number);
    const [ch, cm] = closeStr.split(':').map(Number);
    const start = oh * 60 + om;
    const end = ch * 60 + cm - stepMin;
    const slots: string[] = [];
    for (let t = start; t <= end; t += stepMin) {
      slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
    }
    return slots;
  }

  const wh = workingHours ?? {};
  const timeSlots: string[] | 'closed' | null = (() => {
    if (bookingServiceIdx === '') return null;
    if (!selectedDate) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    const dayKey = DAY_KEYS[d.getDay()];
    const h = wh[dayKey] as { open?: string; close?: string; closed?: boolean } | undefined;
    if (!h || h.closed) return 'closed';
    if (!h.open || !h.close) return [];
    return generateSlots(h.open, h.close);
  })();

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60)
    .toISOString()
    .split('T')[0];

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    if (bookingServiceIdx === '') return setBookingError('Моля, изберете услуга.');
    if (!clientName.trim()) return setBookingError('Моля, въведете вашето име.');
    if (!clientPhone.trim()) return setBookingError('Моля, въведете телефонен номер.');
    if (!selectedDate) return setBookingError('Моля, изберете дата.');
    if (!selectedTime) return setBookingError('Моля, изберете час.');
    const svc = servicesFromDb[Number(bookingServiceIdx)];
    if (!svc) return setBookingError('Невалидна услуга.');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          serviceName: svc.name,
          servicePrice: svc.price ?? 0,
          serviceDuration: svc.duration,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Грешка ${res.status}`);
      const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('bg-BG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setBookingSuccess(`${svc.name} — ${dateLabel} в ${selectedTime} ч.`);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : 'Грешка при резервация.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const [showAllPlatformReviews, setShowAllPlatformReviews] = useState(false);
  const [showAllGoogleReviews, setShowAllGoogleReviews] = useState(false);
  useEffect(() => {
    const hid = highlightReviewId?.trim();
    if (!hid) return;
    const idx = reviews.findIndex((r) => r.id === hid);
    if (idx >= 0 && idx >= INITIAL_REVIEWS_VISIBLE) setShowAllPlatformReviews(true);
  }, [highlightReviewId, reviews]);

  const bookaToShow = showAllPlatformReviews ? reviews : reviews.slice(0, INITIAL_REVIEWS_VISIBLE);
  const bookaHasMore = reviews.length > INITIAL_REVIEWS_VISIBLE;
  const bookaRatingAvg =
    reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / reviews.length : null;

  const googleRatingAvg =
    googleReviews.length > 0
      ? googleReviews.reduce((acc, r) => acc + r.rating, 0) / googleReviews.length
      : null;

  const formatReviewDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div
      className="min-h-screen bg-white pb-28 text-[#1a1a1a] lg:pb-10"
      style={{ ['--salon-primary' as string]: primary } as React.CSSProperties}
    >
      <div className="relative mx-auto w-full max-w-[min(100%,1180px)] px-0 pb-3 pt-0 md:px-6 md:pt-4">
        <button
          type="button"
          onClick={handleShare}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#1a1a1a] shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-sm"
          aria-label="Сподели"
        >
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
        <SalonGalleryMosaic uris={allGalleryWired} onOpenGallery={(i) => setGalleryModal({ uris: allGalleryWired, index: i })} ringClass={ringClass} />
      </div>

      {!disableStickySectionTabs && showStickySectionTabs ? (
        <div className="fixed inset-x-0 top-0 z-20 border-b border-black/10 bg-white/95 px-4 py-2 backdrop-blur-sm shadow-[0_6px_24px_rgba(0,0,0,0.08)]">
          <div className="relative mx-auto w-full max-w-[min(100%,1180px)]">
            <div className="flex gap-5 overflow-x-auto scrollbar-none">
              {salonTabsWithTeamLabel.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`sticky-${tab.id}`}
                    type="button"
                    onClick={() => scrollToSection(tab.id)}
                    className={`relative shrink-0 whitespace-nowrap border-b-2 px-0 py-2 text-[15px] font-medium transition ${
                      isActive ? 'border-black text-[#1a1a1a]' : 'border-transparent text-black/50 hover:text-[#1a1a1a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[min(100%,1180px)] px-4 md:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:items-start lg:gap-x-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5 lg:border-0 lg:pb-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--salon-primary)] md:text-3xl">{name}</h1>
                {category ? <p className="text-sm text-black/45 lg:mt-2">{category}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/60">
                  {(headerPlatformRating != null || headerGoogleRating != null) && (
                    <button
                      type="button"
                      className="inline-flex flex-wrap items-center gap-2 text-left"
                      onClick={() => scrollToSection('reviews')}
                    >
                      {headerPlatformRating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                          <span className="font-medium text-[#1a1a1a]">
                            {headerPlatformRating.rating.toFixed(1).replace('.', ',')}
                          </span>
                          <span className="text-black/45">({headerPlatformRating.count} отзива)</span>
                        </span>
                      ) : null}
                      {headerGoogleRating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                          <span className="font-medium text-[#1a1a1a]">
                            {headerGoogleRating.rating.toFixed(1).replace('.', ',')}
                          </span>
                          <span className="text-black/45">({headerGoogleRating.count} Google)</span>
                        </span>
                      ) : null}
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--salon-primary)]" aria-hidden />
                    {getCurrentStatusString(openingHoursMerged)}
                  </span>
                </div>
                {mapsHref || address || city ? (
                  <a
                    href={
                      mapsHref ??
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: APPLE_LINK_BLUE }}
                  >
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{[address, city].filter(Boolean).join(', ')}</span>
                  </a>
                ) : null}
                {addressDistanceLabel ? <p className="mt-1 text-xs text-black/45">{addressDistanceLabel}</p> : null}
              </div>
            </div>

            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="mt-3 inline-flex items-center gap-2 text-sm text-black/60 lg:hidden"
              >
                <Phone className="h-4 w-4" aria-hidden />
                {phone}
              </a>
            ) : null}

            <section
              ref={(el) => {
                sectionRefs.current.about = el;
              }}
              className="scroll-mt-24 pt-7"
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a]">За салона</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1a1a1a]">
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

              {(() => {
                const igUrl = salonPublicInstagramUrl(instagram);
                const ttUrl = salonPublicTikTokUrl(tiktok);
                const fbUrl = salonPublicFacebookUrl(facebook);
                if (!igUrl && !ttUrl && !fbUrl) return null;
                return (
                  <div className="mt-6 rounded-xl border border-black/10 bg-white p-4">
                    <p className="text-sm font-medium text-[#1a1a1a]">Последвайте ни в социалните мрежи</p>
                    {igUrl ? (
                      <a
                        href={igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm underline"
                        style={{ color: APPLE_LINK_BLUE }}
                      >
                        @{String(instagram ?? '').replace(/^@/, '')}
                      </a>
                    ) : null}
                    {ttUrl ? (
                      <a
                        href={ttUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm underline"
                        style={{ color: APPLE_LINK_BLUE }}
                      >
                        TikTok @{String(tiktok ?? '').replace(/^@/, '')}
                      </a>
                    ) : null}
                    {fbUrl ? (
                      <a
                        href={fbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm underline"
                        style={{ color: APPLE_LINK_BLUE }}
                      >
                        Facebook
                      </a>
                    ) : null}
                  </div>
                );
              })()}
            </section>

            <div className="-mx-4 mt-6 border-b border-black/10 bg-white px-4 py-1 lg:static lg:z-0 lg:mx-0 lg:border-b lg:border-t lg:border-black/10 lg:bg-transparent lg:px-0 lg:py-2">
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
                          : 'border-transparent text-black/50 hover:text-[#1a1a1a]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <section
              ref={(el) => {
                sectionRefs.current.offers = el;
              }}
              className="scroll-mt-36 pt-6"
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Оферти на салона</h2>
              {activeOffers.length > 0 ? (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {activeOffers.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => openBookingModal()}
                      className="relative w-[min(92vw,340px)] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-black text-left shadow-[0_14px_34px_rgba(0,0,0,0.12)]"
                      style={{ minHeight: 200 }}
                    >
                      {o.discount != null && o.discount > 0 ? (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white">
                          -{o.discount}%
                        </span>
                      ) : null}
                      {offerImagesList(o.images)[0] ? (
                        <img
                          src={wireMediaUri(offerImagesList(o.images)[0])}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-black" />
                      )}
                      <div className="relative flex min-h-[200px] flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">Специална оферта</p>
                        <p className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">{o.title}</p>
                        {o.description ? <p className="mt-1 line-clamp-2 text-sm text-white/85">{o.description}</p> : null}
                        <span className="mt-3 inline-flex w-fit items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                          Резервирай
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-black/10 bg-white px-4 py-6 text-center text-sm text-black/55">
                  Няма активни оферти в момента
                </p>
              )}
            </section>

            <section
              ref={(el) => {
                sectionRefs.current.services = el;
              }}
              className="scroll-mt-36 pt-10"
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Услуги</h2>
              {serviceCategories.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {serviceCategories.map((cat) => {
                    const isSelected = selectedServiceCategory === cat.id;
                    return (
                      <button
                        key={cat.id ?? 'all'}
                        type="button"
                        onClick={() => setSelectedServiceCategory(cat.id)}
                        className={`rounded-full border px-3 py-1 text-sm font-normal shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition ${
                          isSelected
                            ? 'border-[color:var(--salon-primary)] text-[color:var(--salon-primary)]'
                            : 'border-black/25 bg-white hover:border-[color:var(--salon-primary)]'
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: `color-mix(in srgb, ${primary} 14%, white)` }
                            : undefined
                        }
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <ul className="mt-4 space-y-3">
                {displayServices.map((service, idxInPage) => {
                  const globalIdx = servicesFromDb.findIndex((x) => x.id === service.id);
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
                      key={service.id}
                      className="rounded-[26px] border border-black/10 bg-white px-4 py-5 shadow-[0_14px_28px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex flex-row items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[17px] font-normal leading-snug text-[#1a1a1a]">{service.name}</p>
                          {variants && variants.length > 0 ? (
                            <div className="relative mt-2 max-w-full sm:max-w-md">
                              <button
                                type="button"
                                onClick={() =>
                                  setVariantDropdownOpenForServiceId((prev) => (prev === service.id ? null : service.id))
                                }
                                className="flex w-full items-center justify-between rounded-full border border-black/15 bg-white px-4 py-2 text-left text-sm transition hover:border-black/30"
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
                                        <span className="text-xs text-black/50">
                                          {v.duration ?? service.duration} мин · {v.price} €
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-2 text-sm text-black/55">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {effective.duration} мин
                            </span>
                            {effective.price != null ? (
                              <>
                                <span className="mx-1.5 text-black/35">·</span>
                                <span className="font-normal text-[#1a1a1a]">{effective.price} €</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 self-center">
                          <button
                            type="button"
                            onClick={() => openBookingModal(globalIdx >= 0 ? globalIdx : servicesFromDb.indexOf(service))}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-black px-4 py-2 text-sm font-medium text-white sm:px-5"
                          >
                            Резервирай
                          </button>
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
                    Виж всички
                  </button>
                  <p className="mt-1 text-xs text-black/45">{displayListRaw.length} услуги</p>
                </div>
              ) : null}
            </section>

            {portfolioDisplay.length > 0 ? (
              <section
                ref={(el) => {
                  sectionRefs.current.portfolio = el;
                }}
                className="scroll-mt-36 pt-10"
              >
                <h2 className="text-lg font-semibold text-[#1a1a1a]">Портфолио</h2>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {portfolioDisplay.map((uri, idx) => (
                    <button
                      key={`${uri}-${idx}`}
                      type="button"
                      onClick={() => setGalleryModal({ uris: portfolioDisplay, index: idx })}
                      className="relative h-44 w-[45%] shrink-0 overflow-hidden rounded-xl sm:h-52 sm:w-[200px]"
                    >
                      <img src={uri} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              ref={(el) => {
                sectionRefs.current.team = el;
              }}
              className="scroll-mt-36 pt-10"
            >
              <h2 className="text-lg font-semibold text-[#1a1a1a]">{publicTeamSectionLabel}</h2>
              {publicTeamMembers.length > 0 ? (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {publicTeamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex w-28 shrink-0 flex-col items-center rounded-2xl border border-black/10 bg-white p-3 text-center shadow-sm"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-black/10 bg-white">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-7 w-7 text-black/35" aria-hidden />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 w-full truncate text-sm font-medium text-[#1a1a1a]">{member.name}</p>
                      {member.role ? <p className="w-full truncate text-xs text-black/55">{member.role}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/55">Няма добавени специалисти.</p>
              )}
            </section>

            <section
              ref={(el) => {
                sectionRefs.current.reviews = el;
              }}
              className="scroll-mt-36 pt-10"
            >
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-normal tracking-tight text-[#1a1a1a]">Отзиви от клиенти</h2>
                  {bookaRatingAvg != null ? (
                    <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1">
                      <span className="text-sm font-semibold text-[#1a1a1a]">{bookaRatingAvg.toFixed(1)}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
                    </div>
                  ) : null}
                </div>

                {reviews.length === 0 ? (
                  <p className="py-5 text-center text-sm font-light text-black/45">Все още няма отзиви</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                      {bookaToShow.map((review) => {
                        const highlighted = !!highlightReviewId?.trim() && review.id === highlightReviewId;
                        const specCommentRaw = review.specialist_comment;
                        const salonCommentTrim = String(review.comment ?? '').trim();
                        const specCommentTrim = String(specCommentRaw ?? '').trim();
                        const duplicateSalonAndSpecialistText =
                          salonCommentTrim.length > 0 && salonCommentTrim === specCommentTrim;
                        return (
                          <article
                            key={review.id}
                            className={`rounded-xl border border-black/10 bg-white p-3.5 shadow-md ${
                              highlighted ? 'border-2 border-[color:var(--salon-primary)]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                {review.client_avatar ? (
                                  <img src={wireMediaUri(review.client_avatar)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div
                                    className="flex h-full w-full items-center justify-center text-[11px] font-medium text-white"
                                    style={{
                                      background: `linear-gradient(135deg, ${getGradientColorsForUser(review.client_email ?? '').join(', ')})`,
                                    }}
                                  >
                                    {getInitialsDotted(review.client_name)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#1a1a1a]">{review.client_name || 'Клиент'}</p>
                                <p className="text-xs text-black/45">{formatReviewDate(review.created_at)}</p>
                              </div>
                              <div className="flex shrink-0 gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < (review.rating ?? 0) ? 'fill-amber-500 text-amber-500' : 'text-black/15'}`}
                                    aria-hidden
                                  />
                                ))}
                              </div>
                            </div>
                            {duplicateSalonAndSpecialistText ? (
                              <p className="mt-2 text-sm leading-relaxed text-[#1a1a1a]">{salonCommentTrim}</p>
                            ) : (
                              <>
                                {salonCommentTrim ? (
                                  <p className="mt-2 text-sm leading-relaxed text-[#1a1a1a]">
                                    {specCommentTrim ? <span className="text-black/55">За салона </span> : null}
                                    {salonCommentTrim}
                                  </p>
                                ) : null}
                                {specCommentTrim ? (
                                  <p className="mt-2 text-sm leading-relaxed text-black/55">
                                    <span>За {review.team_member_name?.trim() || 'специалиста'} </span>
                                    {specCommentTrim}
                                  </p>
                                ) : null}
                              </>
                            )}
                            {review.owner_reply ? (
                              <div className="mt-3 rounded-lg border border-black/10 bg-white p-2">
                                <p className="text-xs font-medium text-black/55">Отговор на салона</p>
                                <p className="mt-1 text-sm text-[#1a1a1a]">{review.owner_reply}</p>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                    {bookaHasMore ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-full border border-black/10 py-2 text-sm font-medium text-[color:var(--salon-primary)] md:col-span-2"
                        onClick={() => setShowAllPlatformReviews((v) => !v)}
                      >
                        {showAllPlatformReviews ? 'Свий' : `Виж още (${reviews.length - INITIAL_REVIEWS_VISIBLE})`}
                      </button>
                    ) : null}
                  </>
                )}

                {googlePlaceId && googleReviews.length > 0 ? (
                  <>
                    <div className="my-6 border-t border-black/10" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-normal text-[#1a1a1a]">Ревюта от Google</h3>
                      {googleRatingAvg != null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold">{googleRatingAvg.toFixed(1)}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                      {(showAllGoogleReviews ? googleReviews : googleReviews.slice(0, INITIAL_REVIEWS_VISIBLE)).map(
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
                            {r.text ? <p className="mt-2 line-clamp-4 text-sm text-black/55">{r.text}</p> : null}
                          </article>
                        )
                      )}
                    </div>
                    {googleReviews.length > INITIAL_REVIEWS_VISIBLE ? (
                      <button
                        type="button"
                        className="mt-3 w-full rounded-full border border-black/10 py-2 text-sm font-medium text-[color:var(--salon-primary)] md:col-span-2"
                        onClick={() => setShowAllGoogleReviews((v) => !v)}
                      >
                        {showAllGoogleReviews ? 'Свий' : `Виж още (${googleReviews.length - INITIAL_REVIEWS_VISIBLE})`}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </section>

            <section className="pt-10">
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Работно време</h2>
              <ul className="mt-3 space-y-2">
                {DAY_NAMES_EN.map((dayKey) => {
                  const hours = getEffectiveHours(openingHoursMerged, dayKey);
                  const isOpen = hours != null;
                  const label = DAY_LABELS_BG[dayKey] ?? dayKey;
                  const isToday = (() => {
                    const d = new Date();
                    const idx = (d.getDay() + 6) % 7;
                    return DAY_NAMES_EN[idx] === dayKey;
                  })();
                  return (
                    <li key={dayKey} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-black/25'}`}
                      />
                      <span className={isToday ? 'font-semibold text-[#1a1a1a]' : 'text-black/55'}>{label}</span>
                      <span className={`ml-auto ${isToday ? 'font-semibold text-[#1a1a1a]' : 'text-[#1a1a1a]'}`}>
                        {isOpen ? `${hours!.open} - ${hours!.close}` : 'Затворено'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {showVenueBlock ? (
              <div className="pt-8">
                {activeExtraKeys.length > 0 ? (
                  <div>
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Допълнителна информация</h3>
                    <ul className="mt-2 space-y-2">
                      {activeExtraKeys.map((k) => {
                        const label = SALON_VENUE_EXTRA_LABELS_BG[k];
                        const detail =
                          k === 'nearMetro' && (ve.nearMetroDetails?.trim() ?? '')
                            ? (ve.nearMetroDetails ?? '').trim()
                            : k === 'convenientTransport' && (ve.convenientTransportDetails?.trim() ?? '')
                              ? (ve.convenientTransportDetails ?? '').trim()
                              : null;
                        return (
                          <li key={k} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--salon-primary)]" />
                            <div>
                              <span className="text-[#1a1a1a]">{label}</span>
                              {detail ? <p className="text-black/55">{detail}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {showParking ? (
                  <div className="mt-6">
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Паркиране</h3>
                    <ul className="mt-2 space-y-2">
                      {parkingActive.map((pk) => (
                        <li key={pk} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--salon-primary)]" />
                          <span
                            style={SALON_PARKING_PUBLIC_TEXT_COLOR[pk] ? { color: SALON_PARKING_PUBLIC_TEXT_COLOR[pk] } : undefined}
                            className="text-[#1a1a1a]"
                          >
                            {SALON_PARKING_LABELS_BG[pk]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {pay ? (
                  <div className="mt-6">
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Плащане</h3>
                    <ul className="mt-2">
                      <li className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--salon-primary)]" />
                        <span>{pay}</span>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? (
              <section className="pt-10">
                <h2 className="text-lg font-semibold text-[#1a1a1a]">Локация</h2>
                <div className="relative mt-3">
                  {staticMapUrl ? (
                    <img
                      src={staticMapUrl}
                      alt=""
                      className="z-0 h-48 w-full overflow-hidden rounded-xl border border-black/10 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center rounded-xl border border-black/10 bg-white text-sm text-black/45">
                      Карта
                    </div>
                  )}
                  <a
                    href={mapsHref!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Отвори локацията в Google Maps"
                    className="absolute inset-0 z-10 rounded-xl"
                  />
                </div>
                <a
                  href={mapsHref!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline"
                  style={{ color: APPLE_LINK_BLUE }}
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Отвори в Google Maps
                </a>
                <p className="mt-2 text-sm" style={{ color: APPLE_LINK_BLUE }}>
                  {[address, city].filter(Boolean).join(', ')}
                </p>
              </section>
            ) : null}
          </div>

          <aside
            className={`hidden lg:sticky lg:block lg:self-start ${showStickySectionTabs ? 'lg:top-[5.5rem]' : 'lg:top-8'}`}
          >
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold leading-snug text-[color:var(--salon-primary)]">{name}</p>
              {(headerPlatformRating != null || headerGoogleRating != null) && (
                <button
                  type="button"
                  className="mt-2 flex flex-col items-start gap-1 text-left text-sm"
                  onClick={() => scrollToSection('reviews')}
                >
                  {headerPlatformRating != null ? (
                    <span className="inline-flex items-center gap-1 text-black/55">
                      <span className="font-medium text-[#1a1a1a]">
                        {headerPlatformRating.rating.toFixed(1).replace('.', ',')}
                      </span>
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                      <span className="text-black/45">({headerPlatformRating.count} отзива)</span>
                    </span>
                  ) : null}
                  {headerGoogleRating != null ? (
                    <span className="inline-flex items-center gap-1 text-black/55">
                      <span className="font-medium text-[#1a1a1a]">
                        {headerGoogleRating.rating.toFixed(1).replace('.', ',')}
                      </span>
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                      <span className="text-black/45">({headerGoogleRating.count} Google)</span>
                    </span>
                  ) : null}
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
              <div className="mt-5 space-y-4 pt-2 text-sm text-black/55">
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--salon-primary)]" aria-hidden />
                  <span className="min-w-0 leading-snug">{getCurrentStatusString(openingHoursMerged)}</span>
                </div>
                {mapsHref || address || city ? (
                  <div>
                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: APPLE_LINK_BLUE }} aria-hidden />
                      <span className="min-w-0" style={{ color: APPLE_LINK_BLUE }}>
                        {[address, city].filter(Boolean).join(', ')}
                        {addressDistanceLabel ? (
                          <span className="mt-1 block text-xs text-black/45">{addressDistanceLabel}</span>
                        ) : null}
                      </span>
                    </div>
                    <a
                      href={
                        mapsHref ??
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block pl-6 text-sm font-medium underline-offset-2 hover:underline"
                      style={{ color: APPLE_LINK_BLUE }}
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
          </aside>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto flex max-w-[min(100%,1180px)] items-center justify-between rounded-[30px] border border-white/70 bg-white/70 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="min-w-0 pr-4">
            <p className="text-sm text-black/55">{servicesFromDb.length} услуги налични</p>
          </div>
          <button
            type="button"
            onClick={() => openBookingModal()}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
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
                src={galleryModal.uris[galleryModal.index]}
                alt=""
                className="max-h-[min(80vh,85dvh)] max-w-full touch-manipulation object-contain select-none"
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
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-label="Резервация"
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-2xl border border-black/10 bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Резервация</h3>
              <button type="button" className="rounded-full p-2 text-black/55 hover:bg-black/5" onClick={closeBookingModal} aria-label="Затвори">
                <X className="h-5 w-5" />
              </button>
            </div>
            {bookingSuccess ? (
              <p className="text-sm text-[#1a1a1a]">{bookingSuccess}</p>
            ) : (
              <form onSubmit={submitBooking} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-black/55">Услуга</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                    value={bookingServiceIdx === '' ? '' : String(bookingServiceIdx)}
                    onChange={(e) => setBookingServiceIdx(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  >
                    <option value="">Изберете…</option>
                    {servicesFromDb.map((s, i) => (
                      <option key={s.id} value={i}>
                        {s.name}
                        {s.price != null ? ` — ${s.price} €` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-black/55">Дата</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm"
                      min={minDate}
                      max={maxDate}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black/55">Час</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2 text-sm"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {timeSlots === 'closed' ? (
                        <option value="" disabled>
                          Затворено
                        </option>
                      ) : Array.isArray(timeSlots)
                        ? timeSlots.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))
                        : null}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black/55">Име</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black/55">Телефон</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black/55">Бележки (по желание)</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                {bookingError ? <p className="text-sm text-red-600">{bookingError}</p> : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: primary }}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Изпрати заявка
                </button>
              </form>
            )}
            <button type="button" className="mt-4 w-full text-sm text-[color:var(--salon-primary)]" onClick={closeBookingModal}>
              Затвори
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
