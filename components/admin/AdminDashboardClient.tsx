'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  BriefcaseBusiness,
  MessageSquare,
  Plug,
  Sparkles,
  CalendarClock,
  Clock3,
  FileText,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Newspaper,
  Scissors,
  Tag,
  UserRound,
  UsersRound,
  Users,
  ExternalLink,
  BarChart3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  ChevronRight,
  Copy,
  Check,
  X,
  KeyRound,
  CreditCard,
  QrCode,
  LifeBuoy,
} from 'lucide-react';
import type { CSSProperties, DragEvent, ReactNode } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  LazyBrandsTabPanel,
  LazyHoursTabPanel,
  LazyImagesTabPanel,
  LazyIntegrationsTabPanel,
  LazyLegalTabPanel,
  LazyPaymentsTabPanel,
  LazySiteTabPanel,
  LazySpecialistTabPanel,
  LazyStaffTabPanel,
  LazyMarketingTabPanel,
} from '@/components/admin/lazy-admin-tabs';
const AccountTabPanel = dynamic(
  () => import('@/components/admin/tabs/account-tab-panel').then((m) => m.AccountTabPanel),
  { ssr: false }
);
const PriceListServicesImport = dynamic(
  () => import('@/components/admin/price-list-services-import').then((m) => m.PriceListServicesImport),
  { ssr: false }
);
const OnboardingChecklist = dynamic(
  () => import('@/components/admin/OnboardingChecklist').then((m) => m.OnboardingChecklist),
  { ssr: false }
);
import type { AdminSalonOffer } from '@/lib/salon-offers';
import { newEmptyOffer } from '@/lib/salon-offers';
import {
  LazySalonOffersSection,
  LazySalonBlogSection,
} from '@/components/admin/lazy-admin-tabs';
import type { AdminSalonBlogPost } from '@/lib/salon-blog-shared';
import { newEmptyBlogPost } from '@/lib/salon-blog-shared';
import { ensureUniqueBlogSlug, toBlogSlug } from '@/lib/blog-slug';
import { withAutoBlogSeoMeta } from '@/lib/blog-seo-meta';
import type { AdminSitePayload, BookingRecord, WorkingHours } from '@/lib/admin-site';
import { ADMIN_COMPACT_SAVE_BTN } from '@/components/admin/admin-theme';
import type { BookingBlock } from '@/lib/booking-blocks';
import { getT, type Locale } from '@/lib/i18n';
import { mapWithConcurrency, prepareImageForUpload } from '@/lib/client-image-prep';
import { analyzePriceListImages, mergeServiceLists } from '@/lib/price-list-analysis';
import {
  extractHostname,
  getHostAwareSalonPath,
  getLegalDocumentUrl,
  getPlatformPublicUrl,
  getPrimaryPublicUrl,
  isSalonCustomDomainLive,
  ROOT_DOMAIN,
  type LegalDocumentPath,
} from '@/lib/domain-routing';
import { defaultLegalInfoStored, type LegalInfoStored } from '@/lib/legal-custom-documents';
import { LEGAL_DOCUMENT_LABELS } from '@/lib/legal-documents-shared';
import { formatSalonPrice } from '@/lib/salon-currency';
import { T, tokens, BOOKING_STATUS_PALETTE } from '@/lib/admin-theme';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileBottomNav } from '@/components/admin/MobileBottomNav';
import { MobileNavSheet } from '@/components/admin/MobileNavSheet';
const BookingsPanel = dynamic(
  () => import('@/components/admin/dashboard-panels').then((m) => m.BookingsPanel),
  { ssr: false }
);
const ClientsPanel = dynamic(
  () => import('@/components/admin/dashboard-panels').then((m) => m.ClientsPanel),
  { ssr: false }
);
const ServiceCreateModal = dynamic(
  () => import('@/components/admin/service-create-modal').then((m) => m.ServiceCreateModal),
  { ssr: false }
);
const ServicesEditorPanel = dynamic(
  () => import('@/components/admin/services-editor-panel').then((m) => m.ServicesEditorPanel),
  { ssr: false }
);

/* ─── Constants ───────────────────────────────────────── */
const DAYS = [
  { key: 'monday',    labelKey: 'common.days.monday' },
  { key: 'tuesday',   labelKey: 'common.days.tuesday' },
  { key: 'wednesday', labelKey: 'common.days.wednesday' },
  { key: 'thursday',  labelKey: 'common.days.thursday' },
  { key: 'friday',    labelKey: 'common.days.friday' },
  { key: 'saturday',  labelKey: 'common.days.saturday' },
  { key: 'sunday',    labelKey: 'common.days.sunday' },
] as const;

const TABS = [
  { id: 'site',          labelKey: 'adminDashboard.tabs.site', Icon: BriefcaseBusiness },
  { id: 'images',        labelKey: 'adminDashboard.tabs.images', Icon: ImageIcon },
  { id: 'specialist',    labelKey: 'adminDashboard.tabs.specialist', Icon: UserRound },
  { id: 'staff',         labelKey: 'adminDashboard.tabs.staff', Icon: UsersRound },
  { id: 'services',      labelKey: 'adminDashboard.tabs.services', Icon: Scissors },
  { id: 'offers',        labelKey: 'adminDashboard.tabs.offers', Icon: Tag },
  { id: 'brands',        labelKey: 'adminDashboard.tabs.brands', Icon: Sparkles },
  { id: 'blog',          labelKey: 'adminDashboard.tabs.blog', Icon: Newspaper },
  { id: 'hours',         labelKey: 'adminDashboard.tabs.hours', Icon: Clock3 },
  { id: 'bookings',      labelKey: 'adminDashboard.tabs.bookings', Icon: CalendarClock },
  { id: 'clients',       labelKey: 'adminDashboard.tabs.clients', Icon: Users },
  { id: 'domain',        labelKey: 'adminDashboard.tabs.domain', Icon: Globe },
  { id: 'payments',      labelKey: 'adminDashboard.tabs.payments', Icon: CreditCard },
  { id: 'integrations',  labelKey: 'adminDashboard.tabs.integrations', Icon: Plug },
  { id: 'marketing',     labelKey: 'adminDashboard.tabs.marketing', Icon: BarChart3 },
  { id: 'legal',         labelKey: 'adminDashboard.tabs.legal', Icon: FileText },
  { id: 'account',       labelKey: 'adminDashboard.tabs.account', Icon: KeyRound },
] as const;

const TAB_BAR_IDS = new Set<TabId>(['site', 'bookings', 'services', 'images', 'clients']);
const TAB_BAR_ORDER: TabId[] = ['site', 'bookings', 'services', 'images', 'clients'];
const TAB_BAR_TABS = TAB_BAR_ORDER.map(id => TABS.find(t => t.id === id)!);

const SHEET_GROUPS: { labelKey: string; ids: TabId[] }[] = [
  { labelKey: 'adminDashboard.groups.content', ids: ['offers', 'brands', 'blog'] },
  { labelKey: 'adminDashboard.groups.team', ids: ['specialist', 'staff'] },
  { labelKey: 'adminDashboard.groups.settings', ids: ['hours', 'domain', 'payments', 'integrations', 'marketing', 'legal', 'account'] },
];
const NAVBAR_TABS = TABS.filter(t => !TAB_BAR_IDS.has(t.id));

const SIDEBAR_GROUPS: { labelKey?: string; ids: TabId[] }[] = [
  { ids: ['bookings', 'clients'] },
  { labelKey: 'adminDashboard.groups.site', ids: ['site', 'images', 'services', 'offers', 'brands', 'blog'] },
  { labelKey: 'adminDashboard.groups.team', ids: ['specialist', 'staff'] },
  { labelKey: 'adminDashboard.groups.settings', ids: ['hours', 'integrations', 'marketing', 'domain', 'payments', 'legal', 'account'] },
];

const ICON_GRADIENT = tokens.gradient.brand;
/** Space for fixed mobile bottom tab bar (bar + safe area + tap margin). */
const MOBILE_BOTTOM_INSET = 'calc(96px + env(safe-area-inset-bottom, 0px))';
const PWA_HOME_STORAGE_KEY = (slug: string) => `admin-pwa-homescreen:${slug}`;

function getPwaInstallGuide(locale: Locale, ua: string): { title: string; note: string; steps: string[] } {
  const isEn = locale === 'en';
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (!isIos) {
    return {
      title: isEn ? 'Add to home screen' : 'Добави на началния екран',
      note: '',
      steps: [
        isEn
          ? 'From the browser menu (⋮), choose "Install app" or "Add to Home Screen".'
          : 'От менюто на браузъра (⋮) избери „Инсталирай приложение“ или „Добави на началния екран“.',
      ],
    };
  }
  if (/crios/i.test(ua)) {
    return {
      title: isEn ? 'Add in Chrome (iPhone)' : 'Добави в Chrome (iPhone)',
      note: isEn
        ? 'Apple does not allow one-tap install in Chrome, so adding is manual as shown below.'
        : 'Apple не позволява на Chrome да инсталира с един бутон — добавянето е ръчно, както по-долу.',
      steps: [
        isEn ? 'Tap ⋯ (the three dots) in the bottom-right corner of Chrome' : 'Натисни ⋯ (трите точки) долу вдясно в Chrome',
        isEn ? 'Choose "Share"' : 'Избери „Share“ / „Сподели“',
        isEn ? 'Scroll down and tap "Add to Home Screen"' : 'Плъзни надолу и натисни „Add to Home Screen“ / „Добави на началния екран“',
        isEn ? 'Confirm with "Add"' : 'Потвърди с „Add“ / „Добави“',
      ],
    };
  }
  if (/fxios/i.test(ua)) {
    return {
      title: isEn ? 'Add in Firefox (iPhone)' : 'Добави в Firefox (iPhone)',
      note: isEn
        ? 'On iPhone, installation is only available manually through the browser menu.'
        : 'На iPhone инсталацията е само ръчна през менюто на браузъра.',
      steps: [
        isEn ? 'Open the menu (≡) in Firefox' : 'Натисни менюто (≡) в Firefox',
        isEn ? 'Choose "Share"' : 'Избери „Share“ / „Сподели“',
        isEn ? '"Add to Home Screen"' : '„Add to Home Screen“ / „Добави на началния екран“',
      ],
    };
  }
  return {
    title: isEn ? 'Add in Safari' : 'Добави в Safari',
    note: isEn
      ? 'On iPhone, automatic installation works only in Safari.'
      : 'На iPhone автоматична инсталация работи само през Safari.',
    steps: [
      isEn ? 'Tap Share (□↑) at the bottom center of the screen' : 'Натисни Share (□↑) долу в средата на екрана',
      isEn ? 'Choose "Add to Home Screen"' : 'Избери „Добави на началния екран“',
      isEn ? 'Confirm with "Add"' : 'Потвърди с „Добави“',
    ],
  };
}

type TabId = (typeof TABS)[number]['id'];

type Props = {
  slug: string;
  ownerEmail: string;
  initialSite: AdminSitePayload;
  initialOffers?: AdminSalonOffer[];
  initialAccount?: { displayName?: string | null; loginEmail: string; hasPassword: boolean; pendingEmail?: string | null };
};

type BookingStatus = BookingRecord['status'];
type BookingListFilter = 'all' | 'upcoming' | BookingStatus;
type ClientSummary = {
  key: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  isNew?: boolean;
};
type BookingGroupKey = 'upcoming' | 'past' | 'completed' | 'cancelled';
type GoogleReviewsStatus = {
  loading: boolean;
  connected: boolean;
  count: number;
  totalCount: number | null;
  source: 'outscraper' | 'cache' | 'none' | null;
  reason: string | null;
  providerStatus?: string | null;
};
type GoogleReviewsFetchState = {
  loading: boolean;
  result: null | { success: boolean; count?: number; newCount?: number; message?: string };
};
type GoogleBusinessCandidate = {
  placeId: string;
  name: string;
  address: string;
  mapsUrl: string;
  businessStatus: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

/* ─── Helpers ─────────────────────────────────────────── */
async function readJson(res: Response) {
  try { return await res.json(); } catch { return {}; }
}

type DomainInstruction = { type?: string; host?: string; value?: string; reason?: string | null };

function getDomainMeta(site: AdminSitePayload) {
  const config = (site.domainConfig ?? {}) as Record<string, unknown>;
  return {
    dnsInstructions:          Array.isArray(config.dnsInstructions) ? (config.dnsInstructions as DomainInstruction[]) : [],
    verificationInstructions: Array.isArray(config.verificationInstructions) ? (config.verificationInstructions as DomainInstruction[]) : [],
    configuredBy: typeof config.configuredBy === 'string' ? config.configuredBy : '',
    misconfigured: typeof config.misconfigured === 'boolean' ? config.misconfigured : null,
    verified: config.verified === true,
    checkedAt: typeof config.checkedAt === 'string' ? config.checkedAt : '',
  };
}

function isPendingDomainStatus(s: string) { return ['pending_dns', 'pending_verification'].includes(s); }

function formatDomainStatus(s: string, locale: Locale = 'bg') {
  const isEn = locale === 'en';
  const map: Record<string, string> = {
    active: isEn ? 'Active' : 'Активен',
    pending_verification: isEn ? 'Pending verification' : 'Чака верификация',
    pending_dns: isEn ? 'Pending DNS' : 'Чака DNS',
    error: isEn ? 'Error' : 'Грешка',
  };
  return map[s] ?? s ?? (isEn ? 'Not connected' : 'Не е свързан');
}

function formatBgDateDMY(dateStr: string) {
  const s = String(dateStr ?? '').trim();
  if (!s) return '';
  const direct = new Date(`${s}T12:00:00`);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toLocaleDateString('bg-BG');
  }
  return s;
}

function bookingSlotIsPastSimple(dateStr: string, timeStr: string): boolean {
  const date = String(dateStr ?? '').trim();
  const time = String(timeStr ?? '').trim().slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const slot = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isFinite(slot.getTime()) && slot.getTime() < Date.now();
}

function ymdKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const CALENDAR_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function useIsMobileLayout(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const fn = () => setM(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [bp]);
  return m;
}

/* ─── Status config (colors come from `lib/admin-theme.ts`; labels stay here for i18n) ─ */
const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:   { label: 'Чакаща',     ...BOOKING_STATUS_PALETTE.pending },
  confirmed: { label: 'Потвърдена', ...BOOKING_STATUS_PALETTE.confirmed },
  completed: { label: 'Завършена',  ...BOOKING_STATUS_PALETTE.completed },
  cancelled: { label: 'Отказана',   ...BOOKING_STATUS_PALETTE.cancelled },
};

/* `T` is imported from `lib/admin-theme.ts`. Keep the import the source of truth. */

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboardClient({
  slug,
  ownerEmail,
  initialSite,
  initialOffers = [],
  initialAccount,
}: Props) {
  const [site, setSite]           = useState(initialSite);
  const locale = site.language as Locale;
  const t = useMemo(() => getT(locale), [locale]);
  const siteRef = useRef(site);
  siteRef.current = site;
  const [displayName, setDisplayName] = useState<string | null>(initialAccount?.displayName ?? null);
  const [bookings, setBookings]   = useState<BookingRecord[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [staffMembers, setStaffMembers] = useState<import('@/lib/staff-members').StaffMember[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('site');
  const [siteNav, setSiteNav] = useState<{ section: string; v: number } | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<BookingListFilter>('all');
  const [error, setError]         = useState('');
  const [notice, setNotice]       = useState('');
  const [busyKey, setBusyKey]     = useState('');
  const [googleReviewsStatus, setGoogleReviewsStatus] = useState<GoogleReviewsStatus>({
    loading: false,
    connected: false,
    count: 0,
    totalCount: null,
    source: null,
    reason: null,
    providerStatus: null,
  });
  const [reviewsFetch, setReviewsFetch] = useState<GoogleReviewsFetchState>({ loading: false, result: null });
  const [googleBizQuery, setGoogleBizQuery] = useState('');
  const [googleBizLoading, setGoogleBizLoading] = useState(false);
  const [googleBizResults, setGoogleBizResults] = useState<GoogleBusinessCandidate[]>([]);
  const [googleBizMessage, setGoogleBizMessage] = useState('');
  const [calendarIntegrationStatus, setCalendarIntegrationStatus] = useState({
    loading: false,
    feedUrl: '',
    webcalUrl: '',
    externalIcsUrl: '',
  });
  const [externalCalendarByDate, setExternalCalendarByDate] = useState<Map<string, number>>(new Map());
  const [allExternalEvents, setAllExternalEvents] = useState<
    Array<{ id: string; title: string; date: string; startTime: string; endTime: string; source: string }>
  >([]);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const externalCalendarEvents = useMemo(
    () => (selectedCalendarDate ? allExternalEvents.filter((ev) => ev.date === selectedCalendarDate) : []),
    [allExternalEvents, selectedCalendarDate],
  );
  const [domainInput, setDomainInput] = useState(initialSite.customDomain ?? '');
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton]   = useState(false);
  const [pwaOnHomeScreen, setPwaOnHomeScreen] = useState(false);
  const mobileNavSheetRef = useRef<HTMLDivElement>(null);
  const sheetDragRef = useRef({ startY: 0, offset: 0, dragging: false });
  const [legalInfo, setLegalInfo] = useState<LegalInfoStored>(
    () => initialSite.legalInfo ?? defaultLegalInfoStored(),
  );
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalNotice, setLegalNotice] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [qrOpen, setQrOpen] = useState(false);
  const [pwaInstallOpen, setPwaInstallOpen] = useState(false);
  const [blogActiveIndex, setBlogActiveIndex] = useState(0);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [newClientDraft, setNewClientDraft] = useState({ name: '', phone: '' });
  const [clientSaving, setClientSaving] = useState(false);
  const [extraClients, setExtraClients] = useState<ClientSummary[]>([]);
  const [hiddenClientKeys, setHiddenClientKeys] = useState<Set<string>>(new Set());
  const [selectedAdminServiceCategory, setSelectedAdminServiceCategory] = useState<string | null>(null);
  const [newServiceDraft, setNewServiceDraft] = useState({
    name: '',
    category: '',
    description: '',
    price: 0,
    duration_min: 30,
    variants: [] as { label: string; price: number; duration_min: number }[],
  });
  const [offers, setOffers] = useState<AdminSalonOffer[]>(initialOffers);
  const [offersSaved, setOffersSaved] = useState(false);
  const [blogPosts, setBlogPosts] = useState<AdminSalonBlogPost[]>([]);
  const [blogSectionTitle, setBlogSectionTitle] = useState('');
  const [blogLoaded, setBlogLoaded] = useState(false);
  const blogPostsRef = useRef<AdminSalonBlogPost[]>([]);
  const blogSaveBusyRef = useRef(false);
  const blogSaveAgainRef = useRef(false);
  const [priceListUrls, setPriceListUrls] = useState<string[]>([]);
  const [priceListAnalyzing, setPriceListAnalyzing] = useState(false);
  const [portfolioPending, setPortfolioPending] = useState<Set<string>>(() => new Set());
  const [portfolioUploadProgress, setPortfolioUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const deferredServices = useDeferredValue(site.services);
  const deferredBookings = useDeferredValue(bookings);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredSelectedCalendarDate = useDeferredValue(selectedCalendarDate);

  const isMobile = useIsMobileLayout();
  const currentHost   = typeof window !== 'undefined' ? window.location.host : null;
  const sitePath      = getHostAwareSalonPath({ host: currentHost, slug });
  const sitePublicUrl = getPrimaryPublicUrl({ slug, customDomain: site.customDomain, domainStatus: site.domainStatus });
  const publicSiteHost = extractHostname(sitePublicUrl);
  const legalDocLinks: { kind: LegalDocumentPath; url: string }[] = (
    ['terms', 'privacy', 'cookies'] as const
  ).map(kind => ({
    kind,
    url: getLegalDocumentUrl({
      slug,
      customDomain: site.customDomain,
      domainStatus: site.domainStatus,
      document: kind,
    }),
  }));
  const claimPath     = getHostAwareSalonPath({ host: currentHost, slug, path: 'claim' });
  const signInPath    = getHostAwareSalonPath({ host: currentHost, slug, path: 'admin/sign-in' });
  const domainMeta    = getDomainMeta(site);

  const servicesUiActive = activeTab === 'services' || serviceModalOpen;
  const bookingsUiActive = activeTab === 'bookings';
  const clientsUiActive = activeTab === 'clients';
  const filteredBookings = useMemo(
    () => {
      if (deferredStatusFilter === 'all') return deferredBookings;
      if (deferredStatusFilter === 'upcoming') {
        return deferredBookings.filter((b) => {
          const status = String(b.status ?? '').trim().toLowerCase();
          if (status === 'cancelled' || status === 'completed') return false;
          return !bookingSlotIsPastSimple(String(b.date ?? ''), String(b.time ?? ''));
        });
      }
      return deferredBookings.filter((b) => b.status === deferredStatusFilter);
    },
    [deferredBookings, deferredStatusFilter]
  );
  const adminServiceCategories = useMemo(() => {
    if (!servicesUiActive) return [{ id: null as string | null, label: 'Всички' }];
    const set = new Set<string>();
    for (const svc of deferredServices) {
      const cat = String((svc as { category?: string }).category ?? '').trim();
      if (cat) set.add(cat);
    }
    const categories = [...set].sort((a, b) => a.localeCompare(b, 'bg'));
    return [{ id: null as string | null, label: 'Всички' }, ...categories.map((c) => ({ id: c, label: c }))];
  }, [deferredServices, servicesUiActive]);
  const filteredAdminServices = useMemo(() => {
    if (!servicesUiActive) return [] as Array<{ svc: (typeof deferredServices)[number]; i: number }>;
    const indexed = deferredServices.map((svc, i) => ({ svc, i }));
    if (!selectedAdminServiceCategory) return indexed;
    return indexed.filter(
      ({ svc }) => String((svc as { category?: string }).category ?? '').trim() === selectedAdminServiceCategory
    );
  }, [deferredServices, selectedAdminServiceCategory, servicesUiActive]);
  const existingServiceCategories = useMemo(() => {
    if (!servicesUiActive) return [] as string[];
    const set = new Set<string>();
    for (const svc of deferredServices) {
      const category = String((svc as { category?: string }).category ?? '').trim();
      if (category) set.add(category);
    }
    const primarySalonCategory = String(site.category ?? '').trim();
    if (primarySalonCategory) set.add(primarySalonCategory);
    return [...set].sort((a, b) => a.localeCompare(b, 'bg'));
  }, [deferredServices, site.category, servicesUiActive]);
  const visibleBookings = useMemo(
    () =>
      !bookingsUiActive
        ? ([] as BookingRecord[])
        :
      deferredSelectedCalendarDate
        ? filteredBookings.filter((b) => String(b.date) === deferredSelectedCalendarDate)
        : filteredBookings,
    [filteredBookings, deferredSelectedCalendarDate, bookingsUiActive]
  );
  const groupedVisibleBookings = useMemo(() => {
    if (!bookingsUiActive) {
      return { upcoming: [], past: [], completed: [], cancelled: [] } as Record<BookingGroupKey, BookingRecord[]>;
    }
    const groups: Record<BookingGroupKey, BookingRecord[]> = {
      upcoming: [],
      past: [],
      completed: [],
      cancelled: [],
    };
    for (const booking of visibleBookings) {
      const status = String(booking.status ?? '').trim().toLowerCase();
      if (status === 'cancelled') {
        groups.cancelled.push(booking);
        continue;
      }
      if (status === 'completed') {
        groups.completed.push(booking);
        continue;
      }
      if (bookingSlotIsPastSimple(String(booking.date ?? ''), String(booking.time ?? ''))) {
        groups.past.push(booking);
      } else {
        groups.upcoming.push(booking);
      }
    }
    return groups;
  }, [visibleBookings, bookingsUiActive]);
  const bookingsCountByDate = useMemo(() => {
    if (!bookingsUiActive) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const b of filteredBookings) {
      const key = String(b.date ?? '').trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [filteredBookings, bookingsUiActive]);
  const calendarMonthLabel = useMemo(
    () => calendarCursor.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' }),
    [calendarCursor]
  );
  const calendarMeta = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayFirstOffset = (first.getDay() + 6) % 7;
    return { year, month, daysInMonth, mondayFirstOffset };
  }, [calendarCursor]);
  const clients = useMemo<ClientSummary[]>(() => {
    if (!clientsUiActive) return [];
    const map = new Map<string, ClientSummary>();
    for (const b of deferredBookings) {
      if (String(b.status ?? '').trim().toLowerCase() === 'cancelled') continue;
      const phone = String(b.client_phone ?? '').trim();
      const email = String(b.client_email ?? '').trim().toLowerCase();
      const name = String(b.client_name ?? '').trim();
      const key = email || phone || b.id;
      const spent = Number(b.service_price ?? 0) || 0;
      const visitMoment = `${b.date}T${b.time || '00:00'}:00`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name: name || 'Клиент',
          phone,
          email,
          visits: 1,
          totalSpent: spent,
          lastVisit: visitMoment,
        });
      } else {
        existing.visits += 1;
        existing.totalSpent += spent;
        if (visitMoment > existing.lastVisit) existing.lastVisit = visitMoment;
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.email && email) existing.email = email;
        if (existing.name === 'Клиент' && name) existing.name = name;
      }
    }
    return [...map.values()].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [deferredBookings, clientsUiActive]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    let t = p.get('tab');
    if (t === 'notifications') t = 'integrations';
    if (t && TABS.some(tab => tab.id === t)) {
      setActiveTab(t as TabId);
      return;
    }
    // Restore last visited tab from localStorage (client-only, no SSR)
    try {
      const saved = localStorage.getItem(`admin-tab:${slug}`);
      if (saved && TABS.some(tab => tab.id === saved)) setActiveTab(saved as TabId);
    } catch { /* ignore */ }
  }, [slug]);

  // Trap browser back-swipe without adding a duplicate history entry on load.
  useEffect(() => {
    if (!window.location.pathname.includes('/admin')) return;
    window.history.replaceState({ ...(window.history.state ?? {}), admin: true }, '', window.location.href);
    const onPopState = () => {
      if (!window.location.pathname.includes('/admin')) return;
      window.history.pushState({ admin: true }, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!selectedAdminServiceCategory) return;
    const hasCategory = site.services.some(
      (svc) => String((svc as { category?: string }).category ?? '').trim() === selectedAdminServiceCategory
    );
    if (!hasCategory) setSelectedAdminServiceCategory(null);
  }, [site.services, selectedAdminServiceCategory]);

  // Refresh services from DB when the tab becomes active (bot/other sources may have added services)
  useEffect(() => {
    if (activeTab !== 'services') return;
    fetch(`/api/admin/site-services?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.services) {
          setSite((prev) => ({ ...prev, services: data.services as AdminSitePayload['services'] }));
        }
      })
      .catch(() => undefined);
  }, [activeTab, slug]);

  // Load salon_clients (added via Telegram or manually) when clients tab opens
  useEffect(() => {
    if (activeTab !== 'clients') return;
    fetch(`/api/admin/clients?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { clients?: { id: string; name: string; phone: string | null; email: string | null; created_at: string }[] } | null) => {
        if (!data?.clients?.length) return;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        setExtraClients(data.clients.map((c) => ({
          key: `sc-${c.id}`,
          name: c.name,
          phone: c.phone ?? '',
          email: c.email ?? '',
          visits: 0,
          totalSpent: 0,
          lastVisit: '',
          isNew: new Date(c.created_at).getTime() > thirtyDaysAgo,
        })));
      })
      .catch(() => undefined);
  }, [activeTab, slug]);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setPwaOnHomeScreen(true);
      setShowInstallButton(false);
      return;
    }
    try {
      if (localStorage.getItem(PWA_HOME_STORAGE_KEY(slug)) === '1') setPwaOnHomeScreen(true);
    } catch { /* ignore */ }
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) { setShowInstallButton(true); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPromptEvent(e as BeforeInstallPromptEvent); setShowInstallButton(true); };
    const onInstalled = () => {
      setInstallPromptEvent(null);
      setShowInstallButton(false);
      setPwaOnHomeScreen(true);
      try { localStorage.setItem(PWA_HOME_STORAGE_KEY(slug), '1'); } catch { /* ignore */ }
      setNotice('Приложението е добавено.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, [slug]);

  useEffect(() => {
    if (!isMobile || !navOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobile, navOpen]);

  useEffect(() => {
    if (activeTab !== 'domain' || !site.customDomain || !isPendingDomainStatus(site.domainStatus)) return;
    if (busyKey === 'domain' || busyKey === 'domain-refresh') return;
    const t = window.setTimeout(() => void refreshDomainStatus(true), 6000);
    return () => window.clearTimeout(t);
  }, [activeTab, site.customDomain, site.domainStatus, busyKey]);

  const hasGoogleReviewsCandidate = Boolean(
    site.googlePlaceId.trim() || site.googleMapsUrl.trim(),
  );

  const loadGoogleReviewsStatus = useCallback(
    async (opts?: { cacheBust?: boolean }) => {
      if (!hasGoogleReviewsCandidate) {
        setGoogleReviewsStatus({
          loading: false,
          connected: false,
          count: 0,
          totalCount: null,
          source: null,
          reason: 'missing_place_id',
          providerStatus: null,
        });
        return;
      }

      setGoogleReviewsStatus((prev) => ({ ...prev, loading: true }));
      const params = new URLSearchParams({ slug });
      if (site.googlePlaceId.trim()) params.set('placeId', site.googlePlaceId.trim());
      if (site.googleMapsUrl.trim()) params.set('mapsUrl', site.googleMapsUrl.trim());
      if (opts?.cacheBust) params.set('_', String(Date.now()));

      try {
        const res = await fetch(`/api/admin/google-reviews-status?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = (await readJson(res)) as {
          connected?: boolean;
          count?: number;
          totalCount?: number | null;
          source?: 'outscraper' | 'cache' | 'none';
          reason?: string | null;
          providerStatus?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'probe_failed');
        setGoogleReviewsStatus({
          loading: false,
          connected: data.connected === true,
          count: Number(data.count ?? 0) || 0,
          totalCount: Number.isFinite(Number(data.totalCount)) ? Number(data.totalCount) : null,
          source: data.source ?? 'none',
          reason: data.reason ?? null,
          providerStatus: data.providerStatus ?? null,
        });
      } catch {
        setGoogleReviewsStatus({
          loading: false,
          connected: false,
          count: 0,
          totalCount: null,
          source: 'none',
          reason: 'probe_failed',
          providerStatus: null,
        });
      }
    },
    [hasGoogleReviewsCandidate, site.googleMapsUrl, site.googlePlaceId, slug],
  );

  const loadCalendarIntegrationStatus = useCallback(async () => {
    setCalendarIntegrationStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/calendar/status?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      const data = (await readJson(res)) as {
        feedUrl?: string;
        webcalUrl?: string;
        externalIcsUrl?: string;
      };
      if (!res.ok) throw new Error('status_failed');
      setCalendarIntegrationStatus({
        loading: false,
        feedUrl: String(data.feedUrl ?? ''),
        webcalUrl: String(data.webcalUrl ?? ''),
        externalIcsUrl: String(data.externalIcsUrl ?? ''),
      });
    } catch {
      setCalendarIntegrationStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [slug]);

  const saveExternalIcsUrl = useCallback(
    async (url: string) => {
      setBusyKey('calendar-ics-save');
      setError('');
      try {
        const res = await fetch(`/api/admin/calendar/status?slug=${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ externalIcsUrl: url }),
        });
        await guardResponse(res);
        setNotice('Календарният линк е запазен.');
        await loadCalendarIntegrationStatus();
      } catch (e) {
        handleErr(e);
      } finally {
        setBusyKey('');
      }
    },
    [slug, loadCalendarIntegrationStatus],
  );

  const loadExternalCalendarOverlay = useCallback(async () => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let icsEvents: Array<{ id: string; title: string; date: string; startTime: string; endTime: string; source: string }> = [];
    try {
      const res = await fetch(
        `/api/admin/calendar/events?slug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: 'no-store' },
      );
      const data = (await readJson(res)) as {
        events?: Array<{ id: string; title: string; date: string; startTime: string; endTime: string; source: string }>;
      };
      if (res.ok) {
        icsEvents = Array.isArray(data.events) ? data.events : [];
      }
    } catch { /* ignore */ }

    const blockEvents = (site.bookingBlocks ?? [])
      .filter((b) => !b.allDay && b.date >= from && b.date <= to && b.start && b.end)
      .map((b) => ({
        id: `block-${b.date}-${b.start}`,
        title: b.note || 'Блокиран час',
        date: b.date,
        startTime: b.start!,
        endTime: b.end!,
        source: 'block',
      }));

    const events = [...icsEvents, ...blockEvents];
    const map = new Map<string, number>();
    for (const ev of events) {
      map.set(ev.date, (map.get(ev.date) ?? 0) + 1);
    }
    setExternalCalendarByDate(map);
    setAllExternalEvents(events);
  }, [calendarCursor, slug, site.bookingBlocks]);

  useEffect(() => {
    if (activeTab !== 'bookings') return;
    const hasExternal = calendarIntegrationStatus.externalIcsUrl;
    const hasBlocks = (site.bookingBlocks ?? []).length > 0;
    if (!hasExternal && !hasBlocks) return;
    void loadExternalCalendarOverlay();
  }, [
    activeTab,
    calendarIntegrationStatus.externalIcsUrl,
    site.bookingBlocks,
    loadExternalCalendarOverlay,
  ]);


  useEffect(() => {
    if (activeTab !== 'integrations') return;
    void loadGoogleReviewsStatus();
    void loadCalendarIntegrationStatus();
  }, [activeTab, loadGoogleReviewsStatus, loadCalendarIntegrationStatus]);

  useEffect(() => {
    if (bookingsLoaded && activeTab !== 'bookings') return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/bookings?slug=${encodeURIComponent(slug)}&limit=200`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await readJson(res)) as { bookings?: BookingRecord[] };
        if (cancelled) return;
        if (Array.isArray(data.bookings)) {
          setBookings(data.bookings);
          setBookingsLoaded(true);
        }
      } catch { /* ignore — user can refresh */ }
    };
    void run();
    return () => { cancelled = true; };
  }, [bookingsLoaded, activeTab, slug]);

  useEffect(() => {
    if (activeTab !== 'staff') return;
    if (staffLoaded) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/staff?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { staff?: import('@/lib/staff-members').StaffMember[] };
        if (cancelled) return;
        if (Array.isArray(data.staff)) {
          setStaffMembers(data.staff);
          setStaffLoaded(true);
        }
      } catch { /* ignore */ }
    };
    void run();
    return () => { cancelled = true; };
  }, [activeTab, staffLoaded, slug]);

  useEffect(() => {
    if (activeTab !== 'blog') return;
    if (blogLoaded) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/site-blog?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await readJson(res)) as { posts?: AdminSalonBlogPost[]; blogTitle?: string };
        if (cancelled) return;
        const posts = Array.isArray(data.posts) ? data.posts : [];
        blogPostsRef.current = posts;
        setBlogPosts(posts);
        if (typeof data.blogTitle === 'string') setBlogSectionTitle(data.blogTitle);
        setBlogLoaded(true);
      } catch { /* ignore */ }
    };
    void run();
    return () => { cancelled = true; };
  }, [activeTab, blogLoaded, slug]);

  const fetchGoogleReviews = useCallback(async (overrides?: { placeId?: string; mapsUrl?: string }) => {
    const placeId = String(overrides?.placeId ?? site.googlePlaceId).trim();
    const mapsUrl = String(overrides?.mapsUrl ?? site.googleMapsUrl).trim();
    setReviewsFetch({ loading: true, result: null });
    try {
      const res = await fetch(`/api/admin/google-reviews-fetch?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          mapsUrl,
        }),
      });
      const data = (await readJson(res)) as {
        success?: boolean;
        count?: number;
        newCount?: number;
        message?: string;
        reason?: string;
        providerStatus?: string | null;
        providerHint?: string | null;
      };
      if (data.success) {
        setReviewsFetch({ loading: false, result: { success: true, count: data.count, newCount: data.newCount } });
        void loadGoogleReviewsStatus({ cacheBust: true });
      } else {
        const suffix = data.providerStatus ? ` (Outscraper status: ${data.providerStatus})` : '';
        const hint = data.providerHint ? ` [${data.providerHint}]` : '';
        setReviewsFetch({
          loading: false,
          result: { success: false, message: `${data.message || 'Неуспешно извличане.'}${suffix}${hint}` },
        });
      }
    } catch {
      setReviewsFetch({
        loading: false,
        result: { success: false, message: 'Грешка при заявката. Опитай отново.' },
      });
    }
  }, [slug, loadGoogleReviewsStatus, site.googleMapsUrl, site.googlePlaceId]);

  const searchGoogleBusinesses = useCallback(async () => {
    const q = googleBizQuery.trim();
    if (!q) {
      setGoogleBizResults([]);
      setGoogleBizMessage('Въведи име на бизнес, за да търсим.');
      return;
    }
    setGoogleBizLoading(true);
    setGoogleBizMessage('');
    try {
      const res = await fetch(
        `/api/admin/google-business-search?slug=${encodeURIComponent(slug)}&q=${encodeURIComponent(q)}`,
        { cache: 'no-store' },
      );
      const data = (await readJson(res)) as {
        results?: GoogleBusinessCandidate[];
        reason?: string;
      };
      if (!res.ok) throw new Error(data.reason || 'search_failed');
      const results = Array.isArray(data.results) ? data.results : [];
      setGoogleBizResults(results);
      if (results.length === 0) {
        if (data.reason === 'missing_outscraper_key') {
          setGoogleBizMessage('Липсва OUTSCRAPER_API_KEY на сървъра.');
        } else if (data.reason === 'outscraper_api_error') {
          setGoogleBizMessage('Outscraper върна грешка. Опитай отново след малко.');
        } else {
          setGoogleBizMessage('Няма намерени бизнес профили. Пробвай с град или по-точно име.');
        }
      }
    } catch {
      setGoogleBizResults([]);
      setGoogleBizMessage('Неуспешно търсене в Google. Провери OUTSCRAPER_API_KEY.');
    } finally {
      setGoogleBizLoading(false);
    }
  }, [googleBizQuery, slug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'notifications') {
      setActiveTab('integrations');
    }
  }, []);

  useEffect(() => {
    if (!serviceModalOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [serviceModalOpen]);

  /* ── Handlers ── */
  async function guardResponse(res: Response) {
    const data = await readJson(res);
    if (res.status === 401 && typeof data.redirectTo === 'string') { window.location.href = data.redirectTo; throw new Error('Пренасочване…'); }
    if (!res.ok) throw new Error(data.error || 'Възникна грешка.');
    return data;
  }

  function handleErr(err: unknown) {
    if (err instanceof Error && err.message === 'Пренасочване…') return;
    setError(err instanceof Error ? err.message : 'Грешка');
  }

  async function publishSite() {
    setError(''); setNotice(''); setBusyKey('publish');
    try {
      const res = await fetch(`/api/admin/publish?slug=${encodeURIComponent(slug)}`, { method: 'POST' });
      await guardResponse(res);
      setSite(prev => ({ ...prev, siteStatus: 'active' }));
      setNotice('Сайтът е публикуван успешно!');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  const [slugTransition, setSlugTransition] = useState<{ newSlug: string; newHost: string } | null>(null);

  function handleSlugSaved(newSlug: string) {
    const newHost = `${newSlug}.${ROOT_DOMAIN}`;
    const targetUrl = `https://${newHost}/admin`;
    setSlugTransition({ newSlug, newHost });

    let attempts = 0;
    const maxAttempts = 30; // ~30 seconds
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(targetUrl, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
        clearInterval(poll);
        window.location.href = targetUrl;
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          window.location.href = targetUrl;
        }
      }
    }, 1000);
  }

  async function saveSiteSettings() {
    setError(''); setNotice(''); setBusyKey('site');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: site.language,
          name: site.name,
          category: site.category,
          phone: site.phone,
          city: site.city,
          address: site.address,
          about: site.about,
          instagram: site.instagram,
          facebook: site.facebook,
          tiktok: site.tiktok,
          googleMapsUrl: site.googleMapsUrl,
          googlePlaceId: site.googlePlaceId,
          latitude: site.latitude,
          longitude: site.longitude,
          faqItems: site.faqItems,
          visitorInfo: site.visitorInfo,
          visitorAdditionalInfo: site.visitorAdditionalInfo,
          venueExtras: site.venueExtras,
        }),
      });
      const data = await guardResponse(res) as { site: Partial<AdminSitePayload> };
      setSite((prev) => ({ ...prev, ...data.site }));
      setNotice(t('adminDashboard.notices.siteSaved'));
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function saveSpecialist() {
    setError(''); setNotice(''); setBusyKey('specialist');
    try {
      const res = await fetch(`/api/admin/site-specialist?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: site.ownerName,
          ownerPublicRole: site.ownerPublicRole,
          ownerPublicPhotoUrl: site.ownerPublicPhotoUrl,
          ownerPublicBio: site.ownerPublicBio,
        }),
      });
      const data = await guardResponse(res) as { site: Partial<AdminSitePayload> };
      setSite((prev) => ({ ...prev, ...data.site }));
      setNotice(t('adminDashboard.notices.profileSaved'));
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function persistImages(
    payload: {
      images: string[];
      ownerPublicPhotoUrl: string;
    },
    opts?: { silent?: boolean },
  ) {
    if (!opts?.silent) {
      setError('');
      setNotice('');
    }
    setBusyKey(opts?.silent ? 'images-auto' : 'images');
    const images = payload.images.filter(u => u && !u.startsWith('blob:'));
    try {
      const res = await fetch(`/api/admin/site-images?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          ownerPublicPhotoUrl: payload.ownerPublicPhotoUrl,
        }),
      });
      const data = await guardResponse(res) as { site: Partial<AdminSitePayload> };
      setSite((prev) => ({ ...prev, ...data.site }));
      if (!opts?.silent) setNotice(t('adminDashboard.notices.imagesSaved'));
    } catch (e) {
      if (!opts?.silent) handleErr(e);
      else setError(t('adminDashboard.notices.imagesUploadNeedsSave'));
    } finally {
      setBusyKey('');
    }
  }

  async function saveImages() {
    await persistImages({
      images: site.images,
      ownerPublicPhotoUrl: site.ownerPublicPhotoUrl,
    });
  }

  async function saveServices() {
    setError(''); setNotice(''); setBusyKey('services');
    try {
      const res = await fetch(`/api/admin/site-services?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: site.services }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, services: data.services as AdminSitePayload['services'] }));
      setNotice(t('adminDashboard.notices.servicesSaved'));
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function saveHours() {
    setError(''); setNotice(''); setBusyKey('hours');
    try {
      const res = await fetch(`/api/admin/site-hours?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: site.workingHours, bookingBlocks: site.bookingBlocks, bookingAdvanceDays: site.bookingAdvanceDays, slotIntervalMin: site.slotIntervalMin }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({
        ...prev,
        workingHours: data.workingHours as WorkingHours,
        bookingBlocks: (data.bookingBlocks ?? []) as BookingBlock[],
        bookingAdvanceDays: typeof data.bookingAdvanceDays === 'number' ? data.bookingAdvanceDays : prev.bookingAdvanceDays,
        slotIntervalMin: typeof data.slotIntervalMin === 'number' ? data.slotIntervalMin : prev.slotIntervalMin,
      }));
      setNotice(t('adminDashboard.notices.hoursSaved'));
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function connectDomain() {
    setError(''); setNotice(''); setBusyKey('domain');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, domain: domainInput }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, customDomain: data.customDomain, domainStatus: data.domainStatus, domainConfig: { dnsInstructions: data.dnsInstructions, verificationInstructions: data.verificationInstructions, configuredBy: data.configuredBy, misconfigured: data.misconfigured, verified: data.verified, provider: data.provider, providerDetails: data.providerDetails, checkedAt: new Date().toISOString() } }));
      setNotice(data.domainStatus === 'active'
        ? (locale === 'en' ? 'The domain is active.' : 'Домейнът е активен.')
        : (locale === 'en' ? 'The domain is saved. Add the DNS records and wait for verification.' : 'Домейнът е записан. Добави DNS записите и изчакай верификация.'));
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function removeDomain() {
    if (!confirm(locale === 'en' ? 'Are you sure you want to remove the domain?' : 'Сигурен ли си, че искаш да премахнеш домейна?')) return;
    setError(''); setNotice(''); setBusyKey('domain-remove');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      await guardResponse(res);
      setSite(prev => ({ ...prev, customDomain: '', domainStatus: '', domainConfig: null }));
      setDomainInput('');
      setNotice(locale === 'en' ? 'The domain was removed.' : 'Домейнът е премахнат.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function refreshDomainStatus(silent = false) {
    if (!site.customDomain) return;
    if (!silent) { setError(''); setNotice(''); }
    setBusyKey('domain-refresh');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, customDomain: data.customDomain, domainStatus: data.domainStatus, domainConfig: { dnsInstructions: data.dnsInstructions, verificationInstructions: data.verificationInstructions, configuredBy: data.configuredBy, misconfigured: data.misconfigured, verified: data.verified, provider: data.provider, providerDetails: data.providerDetails, checkedAt: new Date().toISOString() } }));
      if (!silent) setNotice(data.domainStatus === 'active'
        ? (locale === 'en' ? 'The domain is active.' : 'Домейнът е активен.')
        : (locale === 'en' ? 'The status was updated.' : 'Статусът е обновен.'));
    } catch (e) { if (!silent) handleErr(e); } finally { setBusyKey(''); }
  }

  async function logout() {
    setBusyKey('logout');
    try { await fetch('/api/admin/logout', { method: 'POST' }); }
    finally { window.location.href = signInPath; }
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    setError('');
    const previous = bookings;
    setBookings(c => c.map(b => b.id === bookingId ? { ...b, status } : b));
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      await guardResponse(res);
      setNotice(locale === 'en' ? 'The status was updated.' : 'Статусът е обновен.');
    } catch (e) { setBookings(previous); handleErr(e); }
  }

  async function uploadSingleFile(
    file: File,
    opts?: { compress?: boolean; profile?: boolean },
  ) {
    const prepared =
      opts?.compress === false
        ? file
        : await prepareImageForUpload(file, {
            maxDim: opts?.profile ? 1200 : isMobile ? 1400 : 1600,
          });
    const fd = new FormData();
    fd.append('file', prepared);
    const kind = opts?.profile ? '&kind=profile' : '';
    const res = await fetch(`/api/upload?slug=${encodeURIComponent(slug)}${kind}`, { method: 'POST', body: fd });
    const d = await guardResponse(res);
    return String(d.url ?? '');
  }

  async function handleOwnerPhotoUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-owner');
    setError('');
    const preview = URL.createObjectURL(file);
    setSite((p) => ({ ...p, ownerPublicPhotoUrl: preview }));
    try {
      const url = await uploadSingleFile(file, { compress: false, profile: true });
      setSite((p) => ({ ...p, ownerPublicPhotoUrl: url }));
      const res = await fetch(`/api/admin/site-specialist?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: site.ownerName,
          ownerPublicRole: site.ownerPublicRole,
          ownerPublicPhotoUrl: url,
          ownerPublicBio: site.ownerPublicBio,
        }),
      });
      const data = await guardResponse(res);
      setSite((prev) => ({ ...prev, ...(data.site as Partial<AdminSitePayload>) }));
      setNotice('Снимката е запазена.');
    } catch (e) {
      handleErr(e);
      setSite((p) => ({
        ...p,
        ownerPublicPhotoUrl: p.ownerPublicPhotoUrl === preview ? '' : p.ownerPublicPhotoUrl,
      }));
    } finally {
      URL.revokeObjectURL(preview);
      setBusyKey('');
    }
  }

  async function handlePortfolioUpload(
    files: FileList | File[] | null,
    input?: HTMLInputElement | null,
  ) {
    const images = imageFilesFromInput(files);
    if (!images.length) {
      setError('Моля, избери само изображения (JPG, PNG, WebP, GIF).');
      return;
    }

    const snapshot = siteRef.current;
    const filterStable = (urls: string[]) => urls.filter((u) => u && !u.startsWith('blob:'));
    const stableBefore = filterStable(snapshot.images);

    const previews = images.map((file) => ({
      file,
      blob: URL.createObjectURL(file),
    }));
    const blobUrls = previews.map((p) => p.blob);

    setPortfolioPending((prev) => {
      const next = new Set(prev);
      blobUrls.forEach((b) => next.add(b));
      return next;
    });
    setSite((p) => {
      const stable = filterStable(p.images);
      return { ...p, images: [...stable, ...blobUrls] };
    });

    setBusyKey('upload-portfolio');
    setPortfolioUploadProgress({ done: 0, total: images.length });
    setError('');

    const uploadedUrls: string[] = [];
    let progressDone = 0;

    try {
      await mapWithConcurrency(previews, isMobile ? 3 : 2, async ({ file, blob }) => {
        try {
          const url = await uploadSingleFile(file);
          uploadedUrls.push(url);
          setSite((p) => ({
            ...p,
            images: p.images.map((u) => (u === blob ? url : u)),
          }));
        } catch (e) {
          setSite((p) => ({
            ...p,
            images: p.images.filter((u) => u !== blob),
          }));
          throw e;
        } finally {
          URL.revokeObjectURL(blob);
          setPortfolioPending((prev) => {
            const next = new Set(prev);
            next.delete(blob);
            return next;
          });
          progressDone += 1;
          setPortfolioUploadProgress({ done: progressDone, total: images.length });
        }
      });

      const finalList = [...stableBefore, ...uploadedUrls];
      const latest = siteRef.current;

      setSite((p) => ({ ...p, images: finalList }));

      await persistImages(
        { images: finalList, ownerPublicPhotoUrl: latest.ownerPublicPhotoUrl },
        { silent: true },
      );
      setNotice(
        uploadedUrls.length === 1
          ? 'Снимката е качена и запазена.'
          : `${uploadedUrls.length} снимки са качени и запазени.`,
      );
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
      setPortfolioUploadProgress(null);
      if (input) input.value = '';
    }
  }

  async function runPriceListAnalysis(urls: string[]) {
    if (!urls.length) return;
    setPriceListAnalyzing(true);
    setError('');
    try {
      const categoryHints = existingServiceCategories;
      const extracted = await analyzePriceListImages(urls, {
        categoryHints,
        salonCategory: String(site.category ?? '').trim(),
      });
      if (!extracted.length) {
        setError('Не открихме услуги на снимката. Опитай с по-ясна снимка.');
        return;
      }
      const withCategory = extracted.filter((s) => String(s.category ?? '').trim()).length;
      let added = 0;
      setSite(p => {
        const merged = mergeServiceLists(p.services, extracted);
        added = merged.length - p.services.length;
        return { ...p, services: merged };
      });
      const categoryNote =
        withCategory > 0
          ? ` Категории са разпределени за ${withCategory} от ${extracted.length} услуги.`
          : '';
      setNotice(
        added > 0
          ? `Добавени ${added} услуги от ценоразписа.${categoryNote} Натисни „Запази".`
          : `Услугите от ценоразписа вече са в списъка.${categoryNote} Натисни „Запази", ако си правил промени.`,
      );
    } catch (e) {
      handleErr(e);
    } finally {
      setPriceListAnalyzing(false);
    }
  }

  async function handlePriceListUpload(
    files: FileList | null,
    input?: HTMLInputElement | null,
  ) {
    if (!files?.length) return;
    setBusyKey('upload-pricelist');
    setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadSingleFile(f));
      const combined = [...priceListUrls, ...urls];
      setPriceListUrls(combined);
      await runPriceListAnalysis(combined);
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
      if (input) input.value = '';
    }
  }

  function removePriceListAt(index: number) {
    const next = priceListUrls.filter((_, i) => i !== index);
    setPriceListUrls(next);
  }

  function markPwaOnHomeScreen() {
    setPwaOnHomeScreen(true);
    try { localStorage.setItem(PWA_HOME_STORAGE_KEY(slug), '1'); } catch { /* ignore */ }
  }

  function triggerPwaInstall() {
    if (pwaOnHomeScreen) return;
    setError('');
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const ev = installPromptEvent;
    if (ev && !isIos) {
      void ev
        .prompt()
        .then(() => ev.userChoice)
        .then((r) => {
          if (r.outcome !== 'accepted') return;
          markPwaOnHomeScreen();
          setPwaInstallOpen(false);
          setNavOpen(false);
          setNotice('Приложението се добавя на екрана.');
          setInstallPromptEvent(null);
        })
        .catch(() => setPwaInstallOpen(true));
      return;
    }
    setPwaInstallOpen(true);
  }

  const onSheetDragStart = useCallback((clientY: number) => {
    sheetDragRef.current = { startY: clientY, offset: 0, dragging: true };
    const el = mobileNavSheetRef.current;
    if (el) el.style.transition = 'none';
  }, []);

  const onSheetDragMove = useCallback((clientY: number) => {
    const drag = sheetDragRef.current;
    if (!drag.dragging) return;
    const offset = Math.max(0, clientY - drag.startY);
    drag.offset = offset;
    const el = mobileNavSheetRef.current;
    if (el) el.style.transform = `translateY(${offset}px)`;
  }, []);

  const onSheetDragEnd = useCallback(() => {
    const drag = sheetDragRef.current;
    const el = mobileNavSheetRef.current;
    if (el) {
      el.style.transition = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)';
      el.style.transform = drag.offset > 72 ? 'translateY(100%)' : '';
      if (drag.offset > 72) {
        window.setTimeout(() => {
          setNavOpen(false);
          if (mobileNavSheetRef.current) {
            mobileNavSheetRef.current.style.transition = '';
            mobileNavSheetRef.current.style.transform = '';
          }
        }, 220);
      } else {
        window.setTimeout(() => {
          if (mobileNavSheetRef.current) mobileNavSheetRef.current.style.transition = '';
        }, 220);
      }
    } else if (drag.offset > 72) {
      setNavOpen(false);
    }
    sheetDragRef.current = { startY: 0, offset: 0, dragging: false };
  }, []);

  /* ── Shared styles ── */
  const inp: CSSProperties = {
    width: '100%',
    padding: isMobile ? '14px 16px' : '9px 12px',
    minHeight: isMobile ? 48 : undefined,
    borderRadius: isMobile ? 14 : T.radiusSm,
    border: isMobile ? '1.5px solid rgba(0,0,0,0.10)' : `1px solid ${T.border}`,
    background: '#fff',
    boxShadow: isMobile ? '0 3px 10px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.10)',
    color: T.text,
    fontSize: isMobile ? 16 : 14,
    lineHeight: 1.4,
    outline: 'none',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    transition: 'border-color 200ms ease',
  };
  const btn = (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost'): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: isMobile && variant !== 'sm-ghost' ? 14 : T.radiusSm,
    border: variant === 'primary' ? 'none' : variant === 'danger' ? 'none' : `1px solid ${T.border}`,
    background: variant === 'primary' ? T.accent : 'transparent',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#EF4444' : T.text,
    padding: variant === 'sm-ghost' ? '6px 12px' : isMobile ? '12px 20px' : '8px 16px',
    fontSize: variant === 'sm-ghost' ? 13 : isMobile ? 15 : 14,
    fontWeight: variant === 'primary' ? 600 : 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'transform 150ms ease, opacity 150ms ease',
  });
  const svcInp: CSSProperties = { ...inp, background: '#fff', border: `1px solid ${T.border}` };
  const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: isMobile ? 14 : 12 };

  /* ── Nav tab switch ── */
  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setError('');
    setNotice('');
    setNavOpen(false);
    try { localStorage.setItem(`admin-tab:${slug}`, id); } catch { /* ignore */ }
  };
  async function saveOffers() {
    setError('');
    setNotice('');
    setBusyKey('offers');
    try {
      const res = await fetch(`/api/admin/site-offers?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers }),
      });
      const data = (await guardResponse(res)) as { offers?: AdminSalonOffer[] };
      if (Array.isArray(data.offers)) setOffers(data.offers);
      setOffersSaved(true);
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }

  const patchBlogPost = useCallback((index: number, patch: Partial<AdminSalonBlogPost>) => {
    const next = blogPostsRef.current.map((p, i) => (i === index ? { ...p, ...patch } : p));
    blogPostsRef.current = next;
    setBlogPosts(next);
    return next;
  }, []);

  const replaceBlogPosts = useCallback((next: AdminSalonBlogPost[]) => {
    blogPostsRef.current = next;
    setBlogPosts(next);
    return next;
  }, []);

  function prepareBlogPostsForSave(posts: AdminSalonBlogPost[]): AdminSalonBlogPost[] {
    const used = new Set<string>();
    return posts.map((post) => {
      const withSeo = withAutoBlogSeoMeta(post);
      const base = withSeo.slug.trim() || toBlogSlug(withSeo.title);
      const slug = ensureUniqueBlogSlug(base, used);
      used.add(slug);
      return { ...withSeo, slug };
    });
  }

  async function saveBlogPostsInternal(
    postsToSave: AdminSalonBlogPost[],
    opts?: { expectPublished?: boolean },
  ) {
    const prepared = prepareBlogPostsForSave(postsToSave);
    blogPostsRef.current = prepared;
    setBlogPosts(prepared);

    setError('');
    setBusyKey('blog');
    try {
      const res = await fetch(`/api/admin/site-blog?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: prepared, blogTitle: blogSectionTitle }),
      });
      const data = (await guardResponse(res)) as { posts?: AdminSalonBlogPost[]; blogTitle?: string };
      if (Array.isArray(data.posts)) {
        blogPostsRef.current = data.posts;
        setBlogPosts(data.posts);
      }
      if (typeof data.blogTitle === 'string') setBlogSectionTitle(data.blogTitle);

      if (opts?.expectPublished) {
        const wanted = prepared.filter((p) => p.status === 'published');
        const savedPublished = (data.posts ?? []).filter((p) => p.status === 'published');
        const ok = wanted.every((post) =>
          savedPublished.some(
            (saved) =>
              (post.id && saved.id === post.id) ||
              (post.slug && saved.slug === post.slug) ||
              saved.title === post.title,
          ),
        );
        if (!ok) {
          throw new Error('Публикацията не се запази. Опитайте отново.');
        }
        setNotice('Статията е публикувана.');
      } else {
        setNotice('Черновата е запазена.');
      }
    } catch (e) {
      handleErr(e);
      throw e;
    } finally {
      setBusyKey('');
    }
  }

  async function flushBlogSave(
    overridePosts?: AdminSalonBlogPost[],
    opts?: { expectPublished?: boolean },
  ) {
    if (overridePosts) {
      blogPostsRef.current = overridePosts;
      setBlogPosts(overridePosts);
    }

    if (blogSaveBusyRef.current) {
      blogSaveAgainRef.current = true;
      return;
    }

    blogSaveBusyRef.current = true;
    let expectPublished = opts?.expectPublished ?? false;
    try {
      do {
        blogSaveAgainRef.current = false;
        await saveBlogPostsInternal(blogPostsRef.current, { expectPublished });
        expectPublished = false;
      } while (blogSaveAgainRef.current);
    } finally {
      blogSaveBusyRef.current = false;
    }
  }

  async function saveBlogDraft(_index: number) {
    await flushBlogSave();
  }

  async function publishBlogPost(index: number) {
    const current = blogPostsRef.current[index];
    if (!current) return;
    const next = patchBlogPost(index, {
      status: 'published',
      publishedAt: current.publishedAt || new Date().toISOString(),
    });
    await flushBlogSave(next, { expectPublished: true });
  }

  async function unpublishBlogPost(index: number) {
    const next = patchBlogPost(index, { status: 'draft', publishedAt: null });
    await flushBlogSave(next);
  }

  async function handleBlogCoverUpload(postIndex: number, file: File | null) {
    if (!file) return;
    setBusyKey(`upload-blog-${postIndex}`);
    setError('');
    try {
      const url = await uploadSingleFile(file);
      patchBlogPost(postIndex, { coverImageUrl: url });
      setNotice('Снимката е качена.');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }

  async function handleOfferImagesUpload(offerIndex: number, files: FileList | null) {
    if (!files?.length) return;
    setBusyKey(`upload-offer-${offerIndex}`);
    setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadSingleFile(f));
      }
      setOffers((prev) =>
        prev.map((o, i) => (i === offerIndex ? { ...o, images: [...o.images, ...urls] } : o)),
      );
      setNotice(urls.length === 1 ? 'Снимката е качена.' : `${urls.length} снимки са качени.`);
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }

  function addManualService() {
    const normalizedVariants = newServiceDraft.variants
      .map((variant) => ({
        label: String(variant.label ?? '').trim(),
        price: Math.max(0, Number(variant.price) || 0),
        duration: Math.max(5, Number(variant.duration_min) || 30),
      }))
      .filter((variant) => variant.label.length > 0);
    const nextPrice =
      normalizedVariants.length > 0
        ? normalizedVariants[0]!.price
        : Math.max(0, Number(newServiceDraft.price) || 0);
    const nextDuration =
      normalizedVariants.length > 0
        ? normalizedVariants[0]!.duration
        : Math.max(5, Number(newServiceDraft.duration_min) || 30);
    setSite((p) => ({
      ...p,
      services: [
        ...p.services,
        {
          id: `svc-${Date.now().toString(36)}`,
          name: newServiceDraft.name.trim(),
          category: newServiceDraft.category.trim(),
          description: newServiceDraft.description.trim(),
          price: nextPrice,
          duration_min: nextDuration,
          ...(normalizedVariants.length > 0 ? { variants: normalizedVariants } : {}),
        },
      ],
    }));
    setNewServiceDraft({ name: '', category: '', description: '', price: 0, duration_min: 30, variants: [] });
    setServiceModalOpen(false);
  }

  /* ── Save legal info ── */
  async function saveLegalInfo() {
    setLegalSaving(true);
    setLegalNotice('');
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...legalInfo }),
      });
      if (!res.ok) throw new Error('save_failed');
      const data = (await res.json()) as { legalInfo?: LegalInfoStored };
      if (data.legalInfo) setLegalInfo(data.legalInfo);
      setLegalNotice('Запазено успешно.');
    } catch {
      setLegalNotice('Грешка при запазване.');
    } finally {
      setLegalSaving(false);
    }
  }

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div
      className="admin-mobile-root"
      style={{
        minHeight: '100dvh',
        background: T.bg,
        color: T.text,
        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif)',
        WebkitFontSmoothing: 'antialiased',
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      {/* ── Slug transition overlay ──────────────────── */}
      {slugTransition && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 28,
        }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#18181b',
            borderRadius: '50%',
            animation: 'clicka-spin 0.8s linear infinite',
          }} />
          <div style={{ textAlign: 'center', maxWidth: 320, padding: '0 24px' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#18181b', lineHeight: 1.4 }}>
              Обновяваме адреса на сайта ти
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
              {slugTransition.newSlug}.{ROOT_DOMAIN}
            </p>
          </div>
          <style>{`@keyframes clicka-spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Background grid + gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', willChange: 'transform', contain: 'strict' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
      </div>

      {/* ── Top nav ───────────────────────────────────── */}
      <AdminHeader
        isMobile={isMobile}
        site={site}
        slug={slug}
        displayName={displayName}
        ownerEmail={ownerEmail}
        locale={locale}
        sitePublicUrl={sitePublicUrl}
        busyKey={busyKey}
        showInstallButton={showInstallButton}
        onPublish={() => void publishSite()}
        onLogout={logout}
        onTriggerPwaInstall={triggerPwaInstall}
        onOpenNav={() => setNavOpen(true)}
      />

      {/* ── Mobile bottom sheet nav ───────────────────── */}
      <MobileNavSheet
        open={isMobile && navOpen}
        onClose={() => setNavOpen(false)}
        sheetRef={mobileNavSheetRef}
        sheetDragRef={sheetDragRef}
        onSheetDragStart={onSheetDragStart}
        onSheetDragMove={onSheetDragMove}
        onSheetDragEnd={onSheetDragEnd}
        groups={SHEET_GROUPS}
        tabs={TABS}
        sitePlan={site.plan}
        activeTab={activeTab}
        onSelectTab={(id) => { setActiveTab(id as TabId); setError(''); setNotice(''); setTimeout(() => setNavOpen(false), 180); }}
        openGroups={openGroups}
        setOpenGroups={setOpenGroups}
        sitePublicUrl={sitePublicUrl}
        locale={locale}
        pwaOnHomeScreen={pwaOnHomeScreen}
        onTriggerPwaInstall={triggerPwaInstall}
        t={t}
      />

      {pwaInstallOpen && (() => {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const guide = getPwaInstallGuide(locale, ua);
        const isIos = /iphone|ipad|ipod/i.test(ua);
        const canNativeInstall = Boolean(installPromptEvent) && !isIos;
        return (
          <>
            <button
              type="button"
              aria-label={locale === 'en' ? 'Close' : 'Затвори'}
              onClick={() => setPwaInstallOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'rgba(0,0,0,0.4)',
                cursor: 'pointer',
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={guide.title}
              style={{
                position: 'fixed',
                left: 16,
                right: 16,
                bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                zIndex: 71,
                background: '#fff',
                borderRadius: 16,
                padding: '20px 18px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                maxHeight: 'min(85dvh, 520px)',
                overflowY: 'auto',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {guide.title}
              </h3>
              {guide.note ? (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#92400E', lineHeight: 1.45, background: '#FFFBEB', padding: '10px 12px', borderRadius: 10 }}>
                  {guide.note}
                </p>
              ) : null}
              <ol
                style={{
                  margin: '0 0 16px',
                  paddingLeft: 20,
                  fontSize: 14,
                  color: T.text,
                  lineHeight: 1.55,
                }}
              >
                {guide.steps.map((step) => (
                  <li key={step} style={{ marginBottom: 6 }}>
                    {step}
                  </li>
                ))}
              </ol>
              {canNativeInstall ? (
                <button
                  type="button"
                  onClick={() => {
                    const ev = installPromptEvent;
                    if (!ev) return;
                    void ev
                      .prompt()
                      .then(() => ev.userChoice)
                      .then((r) => {
                        if (r.outcome !== 'accepted') return;
                        markPwaOnHomeScreen();
                        setPwaInstallOpen(false);
                        setNavOpen(false);
                        setNotice(locale === 'en' ? 'The app is being added to your home screen.' : 'Приложението се добавя на екрана.');
                        setInstallPromptEvent(null);
                      });
                  }}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: tokens.color.primary,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  <Plus size={18} /> {locale === 'en' ? 'Install now' : 'Инсталирай сега'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  markPwaOnHomeScreen();
                  setPwaInstallOpen(false);
                  setNavOpen(false);
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#16A34A',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                {locale === 'en' ? 'Done — I added it' : 'Готово — добавих го'}
              </button>
              <button
                type="button"
                onClick={() => setPwaInstallOpen(false)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: '#fff',
                  color: T.text,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {locale === 'en' ? 'Close' : 'Затвори'}
              </button>
            </div>
          </>
        );
      })()}

      {/* ── Body layout ───────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

        {/* ── Sidebar (desktop) ─────────────────────── */}
        {!isMobile && (
          <AdminSidebar
            groups={SIDEBAR_GROUPS}
            tabs={TABS}
            activeTab={activeTab}
            onSwitch={(id) => switchTab(id as TabId)}
            t={t}
          />
        )}

        {/* ── Main content ──────────────────────────── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: isMobile ? undefined : 960,
            marginInline: isMobile ? undefined : 'auto',
            padding: isMobile
              ? `16px 12px ${MOBILE_BOTTOM_INSET} 12px`
              : '32px 40px 56px',
            scrollPaddingBottom: isMobile ? MOBILE_BOTTOM_INSET : undefined,
          }}
        >

          {/* Toast messages */}
          {error  && <Toast tone="error"   onDismiss={() => setError('')}>{error}</Toast>}
          {notice && <Toast tone="success" onDismiss={() => setNotice('')}>{notice}</Toast>}

          {/* ── Onboarding checklist ── */}
          {activeTab === 'site' && (
            <OnboardingChecklist site={site} onGoToTab={(tab, subtab) => { if (subtab) setSiteNav(prev => ({ section: subtab, v: (prev?.v ?? 0) + 1 })); switchTab(tab as TabId); }} />
          )}

          {/* ── Site URL + QR bar ── */}
          {activeTab === 'site' && (
            <>
              {/* URL + QR bar — no background, no border */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, padding: '2px 0',
              }}>
                {/* URL link */}
                <a
                  href={sitePublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, minWidth: 0,
                    display: 'flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} style={{ color: '#007AFF', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#007AFF',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{publicSiteHost}</span>
                </a>
                {/* Copy button */}
                <button
                  type="button"
                  title={t('adminDashboard.actions.copyLink')}
                  onClick={() => {
                    void navigator.clipboard.writeText(sitePublicUrl).then(() => setNotice(t('adminDashboard.notices.linkCopied')));
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: 'transparent', color: '#a1a1aa',
                    cursor: 'pointer', flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Copy size={15} />
                </button>
                {/* QR button */}
                <button
                  type="button"
                  title={t('adminDashboard.actions.qrCode')}
                  onClick={() => setQrOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: '#e4e4e7', color: '#52525b',
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <QrCode size={16} />
                </button>
              </div>

              {/* QR modal */}
              {qrOpen && (
                <QrModal
                  url={sitePublicUrl}
                  salonName={site.name || ''}
                  onClose={() => setQrOpen(false)}
                />
              )}

              <LazySiteTabPanel site={site} setSite={setSite} inp={inp} btn={btn} busyKey={busyKey} saveSiteSettings={saveSiteSettings} isMobile={isMobile} currentSlug={slug} rootDomain={ROOT_DOMAIN} onSlugSaved={handleSlugSaved} onNavigateToDomain={() => { setActiveTab('domain'); }} initialSection={siteNav?.section as 'basics' | 'address' | 'about' | 'faq' | 'amenities' | undefined} siteNavVersion={siteNav?.v} locale={locale} />
            </>
          )}

          {activeTab === 'images' ? (
            <LazyImagesTabPanel
              site={site}
              setSite={setSite}
              setNotice={setNotice}
              isMobile={isMobile}
              inp={inp}
              btn={btn}
              busyKey={busyKey}
              portfolioPending={portfolioPending}
              portfolioUploadProgress={portfolioUploadProgress}
              existingServiceCategories={existingServiceCategories}
              saveImages={saveImages}
              handlePortfolioUpload={handlePortfolioUpload}
              locale={locale}
            />
          ) : null}

          {activeTab === 'specialist' ? (
            <LazySpecialistTabPanel
              site={site}
              setSite={setSite}
              inp={inp}
              busyKey={busyKey}
              saveSpecialist={saveSpecialist}
              onOwnerPhotoUpload={(file) => void handleOwnerPhotoUpload(file)}
              locale={locale}
            />
          ) : null}

          {activeTab === 'staff' && staffLoaded ? (
            <LazyStaffTabPanel
              salonSlug={slug}
              sitePublicUrl={sitePublicUrl}
              initialStaff={staffMembers}
              planLimit={site.plan === 'team' ? 2 : 1}
              salonServices={site.services}
              locale={locale}
            />
          ) : null}

          {/* ── Услуги ── */}
          {activeTab === 'services' && (
            <Section
              title={locale === 'en' ? 'Services' : 'Услуги'}
              desc={isMobile ? undefined : (locale === 'en' ? 'Manage the salon services and categories.' : 'Управлявай услугите и категориите на салона.')}
              compact={isMobile}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      background: tokens.color.primary,
                      boxShadow: tokens.shadow.primary,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setServiceModalOpen(true)}
                  >
                    <Plus size={13} />
                    {locale === 'en' ? 'Add' : 'Добави'}
                  </button>
                  <AdminSaveBtn
                    label={locale === 'en' ? 'Save' : 'Запази'}
                    busy={busyKey === 'services'}
                    mobile={isMobile}
                    green
                    onClick={() => void saveServices()}
                  />
                </div>
              }
            >
              <div style={{ marginBottom: 10 }}>
                <PriceListServicesImport
                  urls={priceListUrls}
                  busy={busyKey === 'upload-pricelist'}
                  analyzing={priceListAnalyzing}
                  isMobile={isMobile}
                  compact
                  onUpload={handlePriceListUpload}
                  onRemove={removePriceListAt}
                  onReanalyze={() => void runPriceListAnalysis(priceListUrls)}
                />
              </div>

              <ServicesEditorPanel
                isMobile={isMobile}
                showGlobalEmpty={site.services.length === 0 && !priceListAnalyzing}
                adminServiceCategories={adminServiceCategories}
                selectedAdminServiceCategory={selectedAdminServiceCategory}
                setSelectedAdminServiceCategory={setSelectedAdminServiceCategory}
                filteredAdminServices={filteredAdminServices}
                setSite={setSite}
                T={T}
                svcInp={svcInp}
                btn={btn}
              />
            </Section>
          )}

          {activeTab === 'offers' && (
            <Section
              title={locale === 'en' ? 'Offers' : 'Оферти'}
              compact={isMobile}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setOffers((prev) => [newEmptyOffer(), ...prev])}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      background: tokens.color.primary,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={14} strokeWidth={2.25} />
                    {locale === 'en' ? 'Add' : 'Добави'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOffersSaved(false); void saveOffers(); }}
                    disabled={busyKey === 'offers'}
                    style={{
                      ...btn('ghost'),
                      color: offersSaved ? '#16a34a' : busyKey === 'offers' ? 'rgba(0,0,0,0.4)' : undefined,
                      cursor: busyKey === 'offers' ? 'wait' : 'pointer',
                    }}
                  >
                    {busyKey === 'offers' ? (locale === 'en' ? 'Saving…' : 'Запазване…') : offersSaved ? (locale === 'en' ? 'Saved ✓' : 'Запазено ✓') : (locale === 'en' ? 'Save' : 'Запази')}
                  </button>
                </div>
              }
            >
              <LazySalonOffersSection
                offers={offers}
                isMobile={isMobile}
                busyKey={busyKey}
                inp={inp}
                onChange={(v) => { setOffersSaved(false); setOffers(v); }}
                onUploadImages={handleOfferImagesUpload}
              />
            </Section>
          )}

          {activeTab === 'brands' && (
            <LazyBrandsTabPanel
              initialBrandIds={site.brandIds}
              isMobile={isMobile}
              locale={locale}
            />
          )}

          {activeTab === 'blog' && (
            <Section
              title={locale === 'en' ? 'Blog' : 'Блог'}
              compact={isMobile}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [newEmptyBlogPost(), ...blogPosts];
                      blogPostsRef.current = next;
                      setBlogPosts(next);
                      setBlogActiveIndex(0);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      background: tokens.color.primary,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={14} strokeWidth={2.25} />
                    {locale === 'en' ? 'New article' : 'Нова статия'}
                  </button>
                  {blogPosts.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void saveBlogDraft(blogActiveIndex)}
                      disabled={busyKey === 'blog'}
                      style={{
                        ...ADMIN_COMPACT_SAVE_BTN,
                        opacity: busyKey === 'blog' ? 0.7 : 1,
                        cursor: busyKey === 'blog' ? 'wait' : 'pointer',
                      }}
                    >
                      {busyKey === 'blog' ? (locale === 'en' ? 'Saving…' : 'Запазване…') : (locale === 'en' ? 'Save' : 'Запази')}
                    </button>
                  ) : null}
                </div>
              }
            >
              <LazySalonBlogSection
                posts={blogPosts}
                blogTitle={blogSectionTitle}
                isMobile={isMobile}
                busyKey={busyKey}
                inp={inp}
                blogPreviewBase={sitePublicUrl.replace(/\/$/, '')}
                onPatchPost={patchBlogPost}
                onReplacePosts={replaceBlogPosts}
                onBlogTitleChange={setBlogSectionTitle}
                onUploadCover={handleBlogCoverUpload}
                onPublish={publishBlogPost}
                onUnpublish={unpublishBlogPost}
                onActiveIndexChange={setBlogActiveIndex}
              />
            </Section>
          )}

          {activeTab === 'services' ? (
            <ServiceCreateModal
              open={serviceModalOpen}
              isMobile={isMobile}
              T={T}
              inp={inp}
              btn={btn}
              newServiceDraft={newServiceDraft}
              setNewServiceDraft={setNewServiceDraft}
              onCancel={() => setServiceModalOpen(false)}
              onAdd={() => {
                if (!newServiceDraft.name.trim()) return;
                addManualService();
              }}
            />
          ) : null}

          {activeTab === 'hours' ? (
            <LazyHoursTabPanel site={site} setSite={setSite} isMobile={isMobile} inp={inp} btn={btn} busyKey={busyKey} saveHours={saveHours} locale={locale} />
          ) : null}

          {/* ── Резервации ── */}
          {activeTab === 'bookings' && (
            <Section
              title={locale === 'en' ? 'Bookings' : 'Резервации'}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                    {bookings.length} {locale === 'en' ? 'total' : 'общо'}
                  </span>
                  {!isMobile ? (
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as BookingListFilter)} style={{ ...inp, width: 'auto', paddingRight: 28, cursor: 'pointer' }}>
                      <option value="all">{locale === 'en' ? 'All' : 'Всички'}</option>
                      <option value="upcoming">{locale === 'en' ? 'Upcoming' : 'Предстоящи'}</option>
                      <option value="pending">{locale === 'en' ? 'Pending' : 'Чакащи'}</option>
                      <option value="completed">{locale === 'en' ? 'Completed' : 'Завършени'}</option>
                      <option value="cancelled">{locale === 'en' ? 'Cancelled' : 'Отказани'}</option>
                    </select>
                  ) : null}
                </div>
              }
            >
              <BookingsPanel
                isMobile={isMobile}
                bookings={bookings}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                calendarMonthLabel={calendarMonthLabel}
                calendarMeta={calendarMeta}
                bookingsCountByDate={bookingsCountByDate}
                externalCalendarByDate={externalCalendarByDate}
                externalCalendarEvents={externalCalendarEvents}
                selectedCalendarDate={selectedCalendarDate}
                setSelectedCalendarDate={setSelectedCalendarDate}
                setCalendarCursor={setCalendarCursor}
                visibleBookings={visibleBookings}
                groupedVisibleBookings={groupedVisibleBookings}
                updateBookingStatus={updateBookingStatus}
                inp={inp}
                btn={btn}
                T={T}
              />
            </Section>
          )}

          {/* ── Клиенти ── */}
          {activeTab === 'clients' && (
            <Section
              title={locale === 'en' ? 'Clients' : 'Клиенти'}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                    {(() => {
                    const bc = clients.filter(c => !hiddenClientKeys.has(c.key));
                    const names = new Set(bc.map(c => c.name.toLowerCase().trim()));
                    return bc.length + extraClients.filter(c => !names.has(c.name.toLowerCase().trim())).length;
                  })()} {locale === 'en' ? 'unique' : 'уникални'}
                  </span>
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      background: tokens.color.primary,
                      boxShadow: tokens.shadow.primary,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => { setNewClientDraft({ name: '', phone: '' }); setClientModalOpen(true); }}
                  >
                    <Plus size={13} />
                    {locale === 'en' ? 'Add' : 'Добави'}
                  </button>
                </div>
              }
            >
              <ClientsPanel
                clients={(() => {
                  const bookingClients = clients.filter(c => !hiddenClientKeys.has(c.key));
                  const bookingNames = new Set(bookingClients.map(c => c.name.toLowerCase().trim()));
                  const deduped = extraClients.filter(c => !bookingNames.has(c.name.toLowerCase().trim()));
                  return [...bookingClients, ...deduped];
                })()}
                isMobile={isMobile}
                T={T}
                onEdit={async (key, data) => {
                  if (key.startsWith('sc-')) {
                    const id = key.slice(3);
                    await fetch(`/api/admin/clients?slug=${encodeURIComponent(slug)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id, ...data }),
                    });
                    setExtraClients((prev) => prev.map((c) =>
                      c.key === key ? { ...c, name: data.name, phone: data.phone, email: data.email } : c
                    ));
                  } else {
                    // Booking-derived client — upsert into salon_clients
                    const r = await fetch(`/api/admin/clients?slug=${encodeURIComponent(slug)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: data.name, phone: data.phone, email: data.email }),
                    });
                    const json = await r.json() as { client?: { id: string } };
                    if (json.client?.id) {
                      const newKey = `sc-${json.client.id}`;
                      const original = clients.find((c) => c.key === key);
                      setExtraClients((prev) => {
                        const exists = prev.some((c) => c.key === newKey);
                        if (exists) return prev.map((c) => c.key === newKey ? { ...c, ...data } : c);
                        return [...prev, {
                          key: newKey,
                          name: data.name,
                          phone: data.phone,
                          email: data.email,
                          visits: original?.visits ?? 0,
                          totalSpent: original?.totalSpent ?? 0,
                          lastVisit: original?.lastVisit ?? '',
                        }];
                      });
                      setHiddenClientKeys((prev) => new Set([...prev, key]));
                    }
                  }
                }}
                onDelete={(key) => {
                  // For salon_clients (sc-*) — delete from DB
                  if (key.startsWith('sc-')) {
                    const id = key.slice(3);
                    fetch(`/api/admin/clients?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
                      .catch(() => undefined);
                    setExtraClients((prev) => prev.filter((c) => c.key !== key));
                  } else {
                    // Booking-derived client — hide locally
                    setHiddenClientKeys((prev) => new Set([...prev, key]));
                  }
                }}
              />
            </Section>
          )}

          {clientModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
                padding: 16,
              }}
              onClick={() => setClientModalOpen(false)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 20,
                  width: '100%',
                  maxWidth: 360,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#000' }}>{locale === 'en' ? 'New client' : 'Нов клиент'}</h3>
                <input
                  type="text"
                  placeholder={locale === 'en' ? 'Name' : 'Име'}
                  value={newClientDraft.name}
                  onChange={(e) => setNewClientDraft((d) => ({ ...d, name: e.target.value }))}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: '#000',
                  }}
                />
                <input
                  type="tel"
                  placeholder={locale === 'en' ? 'Phone (optional)' : 'Телефон (по желание)'}
                  value={newClientDraft.phone}
                  onChange={(e) => setNewClientDraft((d) => ({ ...d, phone: e.target.value }))}
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: '#000',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setClientModalOpen(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: T.muted,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '8px 12px',
                    }}
                  >
                    {locale === 'en' ? 'Cancel' : 'Отказ'}
                  </button>
                  <button
                    type="button"
                    disabled={!newClientDraft.name.trim() || clientSaving}
                    onClick={async () => {
                      const name = newClientDraft.name.trim();
                      if (!name) return;
                      setClientSaving(true);
                      try {
                        const res = await fetch(`/api/admin/clients?slug=${encodeURIComponent(slug)}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name, phone: newClientDraft.phone.trim() || null }),
                        });
                        if (res.ok) {
                          const saved = (await res.json()) as { client?: { id: string } };
                          const newKey = saved?.client?.id ? `sc-${saved.client.id}` : `sc-tmp-${Date.now()}`;
                          setExtraClients((prev) => [
                            ...prev,
                            {
                              key: newKey,
                              name,
                              phone: newClientDraft.phone.trim(),
                              email: '',
                              visits: 0,
                              totalSpent: 0,
                              lastVisit: '',
                              isNew: true,
                            },
                          ]);
                          setClientModalOpen(false);
                        }
                      } finally {
                        setClientSaving(false);
                      }
                    }}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      background: tokens.color.primary,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '8px 16px',
                      opacity: !newClientDraft.name.trim() || clientSaving ? 0.6 : 1,
                    }}
                  >
                    {clientSaving ? (locale === 'en' ? 'Saving…' : 'Записване…') : (locale === 'en' ? 'Save' : 'Запази')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Домейн ── */}
          {activeTab === 'domain' && (
            <DomainTab
              site={site}
              isMobile={isMobile}
              domainInput={domainInput}
              setDomainInput={setDomainInput}
              domainMeta={domainMeta}
              busyKey={busyKey}
              connectDomain={connectDomain}
              refreshDomainStatus={refreshDomainStatus}
              removeDomain={removeDomain}
              inp={inp}
              btn={btn}
              locale={locale}
              onBack={() => {
                setSiteNav(prev => ({ section: 'address', v: (prev?.v ?? 0) + 1 }));
                setActiveTab('site');
              }}
            />
          )}

          {activeTab === 'legal' ? (
            <LazyLegalTabPanel
              site={site}
              legalInfo={legalInfo}
              setLegalInfo={setLegalInfo}
              inp={inp}
              btn={btn}
              legalSaving={legalSaving}
              legalNotice={legalNotice}
              saveLegalInfo={saveLegalInfo}
              publicSiteHost={publicSiteHost}
              legalDocLinks={legalDocLinks}
            />
          ) : null}

          {activeTab === 'account' && initialAccount ? (
            <AccountTabPanel slug={slug} inp={inp} initialAccount={initialAccount} onDisplayNameChange={setDisplayName} locale={locale} />
          ) : null}

          {activeTab === 'payments' ? (
            <LazyPaymentsTabPanel slug={slug} btn={btn} locale={locale} />
          ) : null}

          {activeTab === 'integrations' ? (
            <LazyIntegrationsTabPanel
              site={site}
              setSite={setSite}
              setNotice={setNotice}
              busyKey={busyKey}
              setBusyKey={setBusyKey}
              inp={inp}
              btn={btn}
              hasGoogleReviewsCandidate={hasGoogleReviewsCandidate}
              googleReviewsStatus={googleReviewsStatus}
              reviewsFetch={reviewsFetch}
              fetchGoogleReviews={fetchGoogleReviews}
              loadGoogleReviewsStatus={loadGoogleReviewsStatus}
              googleBizQuery={googleBizQuery}
              setGoogleBizQuery={setGoogleBizQuery}
              googleBizLoading={googleBizLoading}
              googleBizResults={googleBizResults}
              googleBizMessage={googleBizMessage}
              searchGoogleBusinesses={searchGoogleBusinesses}
              calendarStatus={calendarIntegrationStatus}
              loadCalendarStatus={loadCalendarIntegrationStatus}
              onSaveExternalIcsUrl={saveExternalIcsUrl}
              locale={locale}
            />
          ) : null}

          {activeTab === 'marketing' ? (
            <LazyMarketingTabPanel site={site} setSite={setSite} slug={slug} inp={inp} sitePublicUrl={sitePublicUrl} locale={locale} />
          ) : null}

        </main>
      </div>

      {/* ── Mobile bottom tab bar (full-width glass bar) ─ */}
      {isMobile && (
        <MobileBottomNav
          tabs={TAB_BAR_TABS}
          activeTab={activeTab}
          sheetOpen={navOpen}
          onSwitch={(id) => switchTab(id as TabId)}
          t={t}
        />
      )}

    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function Section({
  title,
  desc,
  action,
  children,
  compact = false,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{ animation: 'slideInUp 300ms ease' }}>
      {title ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: compact ? 'center' : 'flex-start',
            gap: compact ? 10 : 16,
            marginBottom: isMbl ? (compact ? 16 : 20) : (compact ? 14 : 18),
            flexWrap: compact ? 'nowrap' : 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: isMbl ? (compact ? 20 : 24) : (compact ? 17 : 18),
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: T.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            {desc ? (
              <p style={{ margin: isMbl ? '6px 0 0' : '4px 0 0', fontSize: isMbl ? 14 : 13, color: T.muted, lineHeight: 1.5 }}>{desc}</p>
            ) : null}
          </div>
          {action ? <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function AdminSaveBtn({
  label,
  busy,
  mobile,
  green = false,
  onClick,
}: {
  label: string;
  busy: boolean;
  mobile: boolean;
  green?: boolean;
  onClick: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const prevBusy = useRef(busy);
  useEffect(() => {
    if (prevBusy.current && !busy) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
    prevBusy.current = busy;
  }, [busy]);

  const gradStyle: CSSProperties = {
    border: 'none',
    background: 'none',
    padding: '4px 8px',
    fontSize: 13,
    fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    whiteSpace: 'nowrap',
    color: saved ? tokens.color.success.text : tokens.color.text,
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 160ms ease, opacity 160ms ease',
    opacity: busy ? 0.6 : 1,
  };

  return (
    <button type="button" onClick={onClick} disabled={busy} style={gradStyle}>
      {busy ? 'Запазване…' : saved ? '✓ Запазено' : 'Запази'}
    </button>
  );
}

function ImageAssetField({
  label,
  uploadLabel,
  busy,
  mobile,
  imageUrl,
  roundPreview = false,
  onUpload,
  children,
}: {
  label: string;
  uploadLabel: string;
  busy: boolean;
  mobile: boolean;
  imageUrl: string;
  roundPreview?: boolean;
  onUpload: (files: FileList | null) => void;
  children?: ReactNode;
}) {
  const uploadControl = mobile ? (
    <IconUploadBtn label={uploadLabel} busy={busy}>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onUpload(e.target.files)} />
    </IconUploadBtn>
  ) : (
    <FileUploadBtn label={uploadLabel} busy={busy}>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onUpload(e.target.files)} />
    </FileUploadBtn>
  );

  if (mobile) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: imageUrl ? 10 : 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</span>
          {uploadControl}
        </div>
        {imageUrl ? <PreviewImg src={imageUrl} alt={label} round={roundPreview} mobile /> : null}
        {children}
      </div>
    );
  }

  return (
    <Field label={label}>
      {uploadControl}
      {children}
      {imageUrl ? <PreviewImg src={imageUrl} alt={label} round={roundPreview} /> : null}
    </Field>
  );
}

function IconUploadBtn({ label, busy, children }: { label: string; busy: boolean; children: ReactNode }) {
  return (
    <label
      aria-label={label}
      title={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: 'none',
        background: '#F4F4F5',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: busy ? 'wait' : 'pointer',
        flexShrink: 0,
        color: T.text,
        transition: 'transform 150ms ease',
      }}
    >
      {busy ? <RefreshCw size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={20} strokeWidth={1.8} />}
      {children}
    </label>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <label style={{ display: 'grid', gap: isMbl ? 6 : 5, ...style }}>
      <span style={{ fontSize: isMbl ? 13 : 12, fontWeight: 600, color: T.muted, letterSpacing: '0.01em' }}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{
      padding: isMbl ? '40px 24px' : '32px 20px',
      textAlign: 'center',
      background: isMbl ? '#FAFAFA' : 'transparent',
      border: isMbl ? 'none' : `1px dashed ${T.border}`,
      borderRadius: isMbl ? 20 : T.radiusSm,
    }}>
      <p style={{ margin: 0, fontSize: isMbl ? 16 : 14, fontWeight: 600, color: T.muted }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: isMbl ? 14 : 13, color: T.subtle, lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function PreviewImg({
  src,
  alt,
  round = false,
  mobile = false,
}: {
  src: string;
  alt: string;
  round?: boolean;
  mobile?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: 'block',
        marginTop: mobile ? 0 : 8,
        width: round ? (mobile ? 80 : 80) : '100%',
        height: round ? (mobile ? 80 : 80) : mobile ? 180 : 140,
        objectFit: 'cover',
        borderRadius: round ? '50%' : mobile ? 18 : T.radiusSm,
        border: mobile ? 'none' : `1px solid ${T.border}`,
        boxShadow: mobile ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}
    />
  );
}

function FileUploadBtn({ label, busy, children }: { label: string; busy: boolean; children: ReactNode }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 12px',
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        fontSize: 13,
        fontWeight: 500,
        color: T.text,
        cursor: busy ? 'wait' : 'pointer',
        background: T.surface,
      }}
    >
      <Upload size={13} />
      {busy ? 'Качваме…' : label}
      {children}
    </label>
  );
}

function imageFilesFromInput(files: FileList | File[] | null): File[] {
  if (!files?.length) return [];
  return Array.from(files).filter(f => f.type.startsWith('image/'));
}

function GalleryDropZone({
  busy,
  mobile = false,
  onUpload,
  children,
}: {
  busy: boolean;
  mobile?: boolean;
  onUpload: (files: FileList | File[] | null, input?: HTMLInputElement | null) => void | Promise<void>;
  children: ReactNode;
}) {
  const [dragActive, setDragActive] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    depthRef.current += 1;
    setDragActive(true);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    e.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setDragActive(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current = 0;
    setDragActive(false);
    if (busy) return;
    void onUpload(e.dataTransfer.files);
  };

  return (
    <div
      style={{ position: 'relative' }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragActive && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            borderRadius: T.radiusSm,
            border: `2px dashed ${T.text}`,
            background: 'rgba(255,255,255,0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <Upload size={mobile ? 24 : 28} color={T.text} strokeWidth={1.75} />
          <span style={{ fontSize: mobile ? 13 : 14, fontWeight: 700, color: T.text }}>
            {mobile ? 'Пусни тук' : 'Пусни снимките тук'}
          </span>
          {!mobile && <span style={{ fontSize: 12, color: T.muted }}>JPG, PNG, WebP, GIF</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function InfoCard({ title, status, children }: { title: string; status: 'connected' | 'pending'; children: ReactNode }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{
      border: isMbl ? 'none' : `1px solid ${T.border}`,
      borderRadius: isMbl ? 18 : T.radiusSm,
      padding: isMbl ? '18px 20px' : '14px 16px',
      background: T.surface,
      boxShadow: isMbl ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {status === 'connected'
          ? <CheckCircle2 size={isMbl ? 18 : 14} style={{ color: '#10B981', flexShrink: 0 }} />
          : <span style={{ width: isMbl ? 18 : 14, height: isMbl ? 18 : 14, borderRadius: '50%', background: '#E5E7EB', flexShrink: 0, display: 'inline-block' }} />}
        <span style={{ fontSize: isMbl ? 16 : 13, fontWeight: 600, color: T.text }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: status === 'connected' ? '#10B981' : T.subtle,
          marginLeft: 'auto',
          padding: '3px 10px', borderRadius: 100,
          background: status === 'connected' ? '#ECFDF5' : '#F4F4F5',
        }}>
          {status === 'connected' ? 'Свързан' : 'Не е свързан'}
        </span>
      </div>
      {children}
    </div>
  );
}

function Toast({ tone, onDismiss, children }: { tone: 'success' | 'error'; onDismiss: () => void; children: ReactNode }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMbl) {
    return (
      <div style={{
        position: 'fixed', left: 16, right: 16,
        bottom: MOBILE_BOTTOM_INSET,
        zIndex: 60,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        borderRadius: 16,
        background: tone === 'error' ? '#18181B' : '#18181B',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        animation: 'slideInUp 250ms ease',
      }}>
        {tone === 'error'
          ? <XCircle size={18} style={{ color: '#F87171', flexShrink: 0 }} />
          : <CheckCircle2 size={18} style={{ color: '#34D399', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4, fontWeight: 500 }}>{children}</span>
        <button type="button" onClick={onDismiss} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: tone === 'error' ? '4px 0' : '10px 14px', borderRadius: tone === 'error' ? 0 : T.radiusSm, border: tone === 'error' ? 'none' : '1px solid #A7F3D0', background: tone === 'error' ? 'transparent' : '#ECFDF5', marginBottom: 12 }}>
      {tone === 'error'
        ? <XCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
        : <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 13, color: tone === 'error' ? '#b91c1c' : '#065F46', lineHeight: 1.5 }}>{children}</span>
      <button type="button" onClick={onDismiss} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted, padding: 2, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

function StepCard({ step, title, done, children }: { step: number; title: string; done: boolean; children: ReactNode }) {
  const isMbl = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div style={{
      border: isMbl ? 'none' : `1px solid ${done ? '#A7F3D0' : T.border}`,
      borderRadius: isMbl ? 20 : T.radiusLg,
      background: done ? '#F0FDF4' : '#fff',
      overflow: 'hidden',
      boxShadow: isMbl ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMbl ? '16px 20px' : '14px 18px', borderBottom: `1px solid ${done ? '#A7F3D0' : isMbl ? '#F4F4F5' : T.border}` }}>
        <div style={{ width: isMbl ? 30 : 26, height: isMbl ? 30 : 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#10B981' : T.accent, color: '#fff', fontSize: isMbl ? 13 : 12, fontWeight: 700 }}>
          {done ? <Check size={14} /> : step}
        </div>
        <span style={{ fontSize: isMbl ? 16 : 14, fontWeight: 600, color: T.text }}>{title}</span>
      </div>
      <div style={{ padding: isMbl ? '16px 20px' : '14px 18px' }}>{children}</div>
    </div>
  );
}

function DnsRecordCard({ record, copied, onCopy, isVerification = false, locale = 'bg' }: {
  record: DomainInstruction;
  copied: string;
  onCopy: (value: string, key: string) => void;
  isVerification?: boolean;
  locale?: Locale;
}) {
  const isEn = locale === 'en';
  const typeLabels: Record<string, string> = isEn
    ? { CNAME: 'CNAME - points to our server', A: 'A - IP address', TXT: 'TXT - verification text' }
    : { CNAME: 'CNAME — пренасочване към нашия сървър', A: 'A — IP адрес', TXT: 'TXT — верификационен текст' };
  const type = String(record.type ?? '').toUpperCase();
  const host = String(record.host ?? '');
  const value = String(record.value ?? '');
  const hostKey = `host-${host}-${value}`;
  const valueKey = `val-${host}-${value}`;

  return (
    <div style={{ border: `1px solid ${isVerification ? '#DDD6FE' : T.border}`, borderRadius: T.radiusSm, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${isVerification ? '#DDD6FE' : T.border}`, background: isVerification ? '#EDE9FE' : '#fff' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isVerification ? '#5B21B6' : T.text }}>
          {typeLabels[type] ?? type}
        </span>
      </div>
      <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Host / Name / Subdomain</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, padding: '8px 12px', background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: T.radiusSm, fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#007AFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host || '@'}
            </code>
            <button
              type="button"
              onClick={() => onCopy(host || '@', hostKey)}
              style={{ padding: '7px 12px', border: '1px solid #BFDBFE', borderRadius: T.radiusSm, background: '#F0F7FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#007AFF', fontWeight: 600, flexShrink: 0 }}
            >
              {copied === hostKey ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
              {copied === hostKey ? (isEn ? 'Copied' : 'Копирано') : (isEn ? 'Copy' : 'Копирай')}
            </button>
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value / Points To</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, padding: '8px 12px', background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: T.radiusSm, fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#007AFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </code>
            <button
              type="button"
              onClick={() => onCopy(value, valueKey)}
              style={{ padding: '7px 12px', border: '1px solid #BFDBFE', borderRadius: T.radiusSm, background: '#F0F7FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#007AFF', fontWeight: 600, flexShrink: 0 }}
            >
              {copied === valueKey ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
              {copied === valueKey ? (isEn ? 'Copied' : 'Копирано') : (isEn ? 'Copy' : 'Копирай')}
            </button>
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TTL</p>
          <code style={{ display: 'inline-block', padding: '8px 12px', background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: T.radiusSm, fontSize: 13, fontFamily: 'monospace', color: '#007AFF' }}>Automatic</code>
        </div>
      </div>
    </div>
  );
}

function DomainTab({
  site, isMobile, domainInput, setDomainInput, domainMeta,
  busyKey, connectDomain, refreshDomainStatus, removeDomain, inp, btn,
  onBack, locale,
}: {
  site: AdminSitePayload;
  isMobile: boolean;
  domainInput: string;
  setDomainInput: (v: string) => void;
  domainMeta: ReturnType<typeof getDomainMeta>;
  busyKey: string;
  connectDomain: () => Promise<void>;
  refreshDomainStatus: (silent?: boolean) => Promise<void>;
  removeDomain: () => Promise<void>;
  inp: CSSProperties;
  btn: (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost') => CSSProperties;
  onBack: () => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [copied, setCopied] = useState('');

  function copyVal(value: string, key: string) {
    navigator.clipboard.writeText(value).catch(() => null);
    setCopied(key);
    setTimeout(() => setCopied(k => k === key ? '' : k), 2000);
  }

  const hasDomain = Boolean(site.customDomain);
  const isActive = site.domainStatus === 'active';
  const maxW: CSSProperties = { maxWidth: isMobile ? '100%' : 560 };

  /* ── No domain yet ── connect-only flow ── */
  if (!hasDomain) {
    return (
      <Section title={isEn ? 'Custom domain' : 'Собствен домейн'} desc={isEn ? 'Enter a domain you already bought and we will guide you step by step to connect it.' : 'Въведи домейна, който вече си купил, и ще те преведем стъпка по стъпка как да го свържеш.'}>
        <div style={{ ...maxW, display: 'grid', gap: 14 }}>
          <Field label={isEn ? 'Your domain' : 'Твоят домейн'}>
            <input
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              placeholder="moisalon.com"
              style={{ ...inp, width: '100%' }}
              onKeyDown={e => { if (e.key === 'Enter' && domainInput.trim()) void connectDomain(); }}
            />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onBack} style={{ ...btn('ghost'), flex: '0 0 auto' }}>
              {isEn ? '← Back' : '← Назад'}
            </button>
            <button
              type="button"
              style={{ ...btn('primary'), flex: 1, opacity: (busyKey === 'domain' || !domainInput.trim()) ? 0.5 : 1 }}
              disabled={busyKey === 'domain' || !domainInput.trim()}
              onClick={() => void connectDomain()}
            >
              {busyKey === 'domain' ? (isEn ? 'Checking…' : 'Проверяваме…') : (isEn ? 'Continue →' : 'Напред →')}
            </button>
          </div>
        </div>
      </Section>
    );
  }

  /* ── Active domain ── */
  if (isActive) {
    return (
      <Section title={isEn ? 'Custom domain' : 'Собствен домейн'} desc={isEn ? 'The domain is active and connected to your site.' : 'Домейнът е активен и свързан към твоя сайт.'}>
        <div style={{ ...maxW, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: T.radiusLg }}>
            <CheckCircle2 size={22} style={{ color: '#10B981', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065F46' }}>{isEn ? 'The domain is connected successfully' : 'Домейнът е свързан успешно'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#047857', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.customDomain}</p>
            </div>
            <a href={`https://${site.customDomain}`} target="_blank" rel="noreferrer" style={{ ...btn('sm-ghost'), textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={13} />
              {!isMobile && (isEn ? 'Open' : 'Отвори')}
            </a>
          </div>
          <button
            type="button"
            style={{ ...btn('ghost'), color: '#EF4444', borderColor: '#FECACA', justifyContent: 'flex-start' }}
            onClick={() => void removeDomain()}
            disabled={busyKey === 'domain-remove'}
          >
            <Trash2 size={14} />
            {busyKey === 'domain-remove' ? (isEn ? 'Removing…' : 'Премахваме…') : (isEn ? 'Remove domain' : 'Премахни домейна')}
          </button>
        </div>
      </Section>
    );
  }

  /* ── Pending: show step-by-step DNS guide ── */
  // Show only the primary record of each type (dedupe by type to avoid confusion)
  const instructionsByType = new Map<string, DomainInstruction>();
  for (const ins of domainMeta.dnsInstructions) {
    const type = String(ins.type ?? '').toUpperCase();
    if (!instructionsByType.has(type)) instructionsByType.set(type, ins);
  }
  const instructions = Array.from(instructionsByType.values());
  const verifications = domainMeta.verificationInstructions;
  const isPending = isPendingDomainStatus(site.domainStatus ?? '');

  return (
    <Section
      title={isEn ? 'Finish connecting the domain' : 'Свърши свързването на домейна'}
      desc={isEn ? `Follow the steps below for ${site.customDomain}` : `Следвай стъпките по-долу за ${site.customDomain}`}
    >
      <div style={{ ...maxW, display: 'grid', gap: 14 }}>

        {/* Domain + status bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg }}>
          <Globe size={15} style={{ color: T.muted, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.customDomain}</span>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 600, flexShrink: 0 }}>
            {formatDomainStatus(site.domainStatus ?? '', locale)}
          </span>
          <button type="button" style={{ ...btn('sm-ghost'), padding: '5px 8px', flexShrink: 0 }} onClick={() => void removeDomain()} disabled={busyKey === 'domain-remove'} title={isEn ? 'Remove domain' : 'Премахни домейна'}>
            <Trash2 size={13} style={{ color: '#EF4444' }} />
          </button>
        </div>

        {/* Step 1 */}
        <StepCard step={1} title={isEn ? 'Log in to your domain registrar' : 'Влез при регистратора на домейна'} done={false}>
          <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            {isEn
              ? 'Go to the website where you bought the domain, sign in to your account, and open the domain management area.'
              : 'Отиди на сайта, от който си купил домейна (Register.bg, Superhosting.bg, GoDaddy и др.). Влез в акаунта си и намери управлението на домейна.'}
          </p>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} title={isEn ? 'Find the DNS settings' : 'Намери DNS настройките'} done={false}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            {isEn ? 'Look for a section or button named ' : 'Търси раздел или бутон с някое от тези имена: '}
            <strong style={{ color: T.text }}>DNS Settings</strong>,{' '}
            <strong style={{ color: T.text }}>Manage DNS</strong> {isEn ? 'or' : 'или'}{' '}
            <strong style={{ color: T.text }}>Zone Editor</strong>.
            {isEn ? ' You will see a table with DNS records like this:' : ' Ще видиш таблица с DNS записи — ето как изглежда:'}
          </p>
          <img
            src="/dns-example.png"
            alt={isEn ? 'Example DNS records' : 'Пример за DNS записи'}
            style={{ width: '100%', borderRadius: T.radiusSm, border: `1px solid ${T.border}`, marginBottom: 12, display: 'block' }}
          />
          <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: T.radiusSm }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.7 }}>
              <strong style={{ color: '#7C2D12' }}>{isEn ? 'Important' : '⚠️ Важно'}</strong>{' '}
              {isEn
                ? 'If there is already a '
                : '— ако вече има '}
              <strong>{isEn ? 'CNAME for "www"' : 'CNAME с „www"'}</strong> {isEn ? 'or' : 'или'} <strong>{isEn ? 'A record for "@"' : 'A запис с „@"'}</strong>{isEn ? ', delete it before adding the new one.' : ', изтрий ги преди да добавяш новите.'}
            </p>
          </div>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} title={isEn ? 'Add the two DNS records' : 'Добави двата DNS записа'} done={false}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            {isEn ? 'Click "Add Record" and add both records below. Use the copy button so nothing is mistyped:' : 'Натисни „Add Record" и добави и двата записа по-долу. Използвай бутона „Копирай" за да не сбъркаш:'}
          </p>

          {instructions.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {instructions.map((ins, i) => (
                <DnsRecordCard key={i} record={ins} copied={copied} onCopy={copyVal} locale={locale} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 14px', background: '#F4F4F5', borderRadius: T.radiusSm, fontSize: 13, color: T.muted }}>
              {isEn ? 'Loading instructions…' : 'Инструкциите се зареждат…'}
            </div>
          )}

          {verifications.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                {isEn ? 'Also add the verification record below. It is needed only once to confirm domain ownership:' : 'Освен горния запис, добави и верификационен запис (нужен е еднократно, за да потвърдим собствеността на домейна):'}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {verifications.map((v, i) => (
                  <DnsRecordCard key={i} record={v} copied={copied} onCopy={copyVal} isVerification locale={locale} />
                ))}
              </div>
            </div>
          )}
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} title={isEn ? 'Wait and check' : 'Изчакай и провери'} done={false}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            {isEn ? 'Changes usually propagate within ' : 'Промените се разпространяват обикновено между '}
            <strong style={{ color: T.text }}>{isEn ? '15 minutes and 24 hours' : '15 мин. и 24 часа'}</strong>.
            {isEn ? ' We check automatically and will let you know when it is ready. You can also check manually:' : ' Ние проверяваме автоматично — ще те уведомим щом е готово. Можеш и ръчно:'}
          </p>
          <button
            type="button"
            style={btn('ghost')}
            onClick={() => void refreshDomainStatus()}
            disabled={busyKey === 'domain-refresh' || busyKey === 'domain'}
          >
            <RefreshCw
              size={14}
              style={busyKey === 'domain-refresh' ? { animation: 'spin 1s linear infinite' } : undefined}
            />
            {busyKey === 'domain-refresh' ? (isEn ? 'Checking…' : 'Проверяваме…') : (isEn ? 'Check now' : 'Провери сега')}
          </button>
          {isPending && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: T.subtle, lineHeight: 1.5 }}>
              {isEn ? 'We are checking automatically. The page will refresh when the domain is connected.' : 'Проверяваме автоматично. Страницата ще се обнови при успешно свързване.'}
            </p>
          )}
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: T.radiusSm }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              <strong style={{ color: '#1E3A8A' }}>{isEn ? 'Browser says "Not secure"?' : 'ℹ Браузърът казва „Not secure"?'} </strong>
              {isEn ? 'This is normal. The SSL certificate is issued automatically up to 30 minutes after the DNS records are in place. You do not need to do anything.' : 'Нормално е — SSL сертификатът се издава автоматично до 30 мин. след DNS. Не правиш нищо.'}
            </p>
          </div>
        </StepCard>

      </div>
    </Section>
  );
}

/* ── QR Modal ─────────────────────────────────────────────── */
function QrModal({ url, salonName, onClose }: { url: string; salonName: string; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<import('qr-code-styling').default | null>(null);

  useEffect(() => {
    let mounted = true;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!mounted || !qrRef.current) return;
      qrRef.current.innerHTML = '';
      const qr = new QRCodeStyling({
        width: 240,
        height: 240,
        data: url,
        margin: 8,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { color: '#C2185B', type: 'dots' },
        cornersSquareOptions: { color: '#AD1457', type: 'extra-rounded' },
        cornersDotOptions: { color: '#880E4F', type: 'dot' },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: { crossOrigin: 'anonymous' },
      });
      qr.append(qrRef.current);
      qrInstance.current = qr;
    });
    return () => { mounted = false; };
  }, [url]);

  const handleDownload = async () => {
    if (!qrInstance.current) return;
    // Build a full poster canvas: title + salon name + QR + URL
    const qrBlob = await qrInstance.current.getRawData('png');
    if (!qrBlob) return;
    const qrImg = await createImageBitmap(qrBlob as Blob);

    const W = 800, H = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Pink top accent strip
    const grad = ctx.createLinearGradient(0, 0, W, 120);
    grad.addColorStop(0, '#e11d48');
    grad.addColorStop(0.5, '#db2777');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 120);

    // "Резервирайте онлайн!" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Резервирайте онлайн!', W / 2, 78);

    // Salon name
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.fillText(salonName, W / 2, 210);

    // Instruction
    ctx.fillStyle = '#71717a';
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillText('Сканирайте с камерата на телефона', W / 2, 270);

    // QR code centered
    const qrSize = 420;
    const qrX = (W - qrSize) / 2;
    ctx.drawImage(qrImg, qrX, 310, qrSize, qrSize);

    // URL at bottom
    ctx.fillStyle = '#db2777';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(url.replace('https://', ''), W / 2, 800);

    // Bottom gradient line
    const gradLine = ctx.createLinearGradient(80, 0, W - 80, 0);
    gradLine.addColorStop(0, '#e11d48');
    gradLine.addColorStop(1, '#a855f7');
    ctx.strokeStyle = gradLine;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 850); ctx.lineTo(W - 80, 850);
    ctx.stroke();

    // Download
    const link = document.createElement('a');
    link.download = `qr-${salonName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 28, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          maxWidth: 320, width: '100%',
        }}
      >
        {/* Header gradient band */}
        <div style={{
          width: '100%', padding: '20px 24px 18px',
          background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Резервирайте онлайн!
          </p>
          {salonName && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {salonName}
            </p>
          )}
        </div>

        {/* QR code */}
        <div style={{ padding: '20px 24px 4px' }}>
          <div ref={qrRef} style={{ borderRadius: 16, overflow: 'hidden', lineHeight: 0 }} />
        </div>

        {/* URL */}
        <p style={{ margin: '8px 0 20px', fontSize: 12, color: '#71717A', textAlign: 'center', wordBreak: 'break-all', padding: '0 20px' }}>
          {url}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              flex: 1, padding: '13px', borderRadius: 14, border: 'none',
              background: tokens.color.primary,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Свали за печат
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '13px 18px', borderRadius: 14, border: '1.5px solid #e4e4e7',
              background: '#fff', color: '#71717a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
