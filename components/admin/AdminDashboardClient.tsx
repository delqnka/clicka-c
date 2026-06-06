'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChatWidget } from '@/components/marketing/chat-widget';
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
  LogOut,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  ChevronRight,
  Copy,
  Check,
  Menu,
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
  LazySmsTabPanel,
  LazySpecialistTabPanel,
  LazyStaffTabPanel,
} from '@/components/admin/lazy-admin-tabs';
import { AccountTabPanel } from '@/components/admin/tabs/account-tab-panel';
import { PriceListServicesImport } from '@/components/admin/price-list-services-import';
import { OnboardingChecklist } from '@/components/admin/OnboardingChecklist';
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
import { mergeUniqueImageLists } from '@/lib/admin-image-utils';
import { ADMIN_COMPACT_SAVE_BTN } from '@/components/admin/admin-theme';
import type { BookingBlock } from '@/lib/booking-blocks';
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
import {
  SMS_PACK_CREDITS,
  SMS_PACK_PRICE_EUR,
  smsCreditsPerBooking,
  type SmsReminderMode,
} from '@/lib/sms-shared';

const DomainPurchaseSection = dynamic(
  () => import('@/components/admin/DomainPurchaseSection'),
  { ssr: false }
);
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
  { key: 'monday',    label: 'Понеделник' },
  { key: 'tuesday',   label: 'Вторник' },
  { key: 'wednesday', label: 'Сряда' },
  { key: 'thursday',  label: 'Четвъртък' },
  { key: 'friday',    label: 'Петък' },
  { key: 'saturday',  label: 'Събота' },
  { key: 'sunday',    label: 'Неделя' },
] as const;

const TABS = [
  { id: 'site',          label: 'Сайт',          Icon: BriefcaseBusiness },
  { id: 'images',        label: 'Снимки',         Icon: ImageIcon },
  { id: 'specialist',    label: 'Специалист',     Icon: UserRound },
  { id: 'staff',         label: 'Служители',      Icon: UsersRound },
  { id: 'services',      label: 'Услуги',         Icon: Scissors },
  { id: 'offers',        label: 'Оферти',         Icon: Tag },
  { id: 'brands',        label: 'Брандове',       Icon: Sparkles },
  { id: 'blog',          label: 'Блог',           Icon: Newspaper },
  { id: 'hours',         label: 'Работно време',  Icon: Clock3 },
  { id: 'bookings',      label: 'Резервации',     Icon: CalendarClock },
  { id: 'clients',       label: 'Клиенти',        Icon: Users },
  { id: 'domain',        label: 'Домейн',         Icon: Globe },
  { id: 'payments',     label: 'Плащания',       Icon: CreditCard },
  { id: 'integrations', label: 'Интеграции',     Icon: Plug },
  { id: 'sms',          label: 'SMS',            Icon: MessageSquare },
  { id: 'legal',         label: 'Правни',         Icon: FileText },
  { id: 'account',       label: 'Профил',         Icon: KeyRound },
] as const;

const TAB_BAR_IDS = new Set<TabId>(['bookings', 'clients', 'services', 'site']);
const TAB_BAR_TABS = TABS.filter(t => TAB_BAR_IDS.has(t.id));

const SHEET_GROUPS: { label: string; ids: TabId[] }[] = [
  { label: 'Съдържание', ids: ['images', 'offers', 'brands', 'blog'] },
  { label: 'Екип',       ids: ['specialist', 'staff'] },
  { label: 'Настройки',  ids: ['hours', 'domain', 'payments', 'sms', 'integrations', 'legal', 'account'] },
];
const NAVBAR_TABS = TABS.filter(t => !TAB_BAR_IDS.has(t.id));

const ICON_GRADIENT = 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)';
const PWA_HOME_STORAGE_KEY = (slug: string) => `admin-pwa-homescreen:${slug}`;

function getPwaInstallGuide(ua: string): { title: string; note: string; steps: string[] } {
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (!isIos) {
    return {
      title: 'Добави на началния екран',
      note: '',
      steps: ['От менюто на браузъра (⋮) избери „Инсталирай приложение“ или „Добави на началния екран“.'],
    };
  }
  if (/crios/i.test(ua)) {
    return {
      title: 'Добави в Chrome (iPhone)',
      note: 'Apple не позволява на Chrome да инсталира с един бутон — добавянето е ръчно, както по-долу.',
      steps: [
        'Натисни ⋯ (трите точки) долу вдясно в Chrome',
        'Избери „Share“ / „Сподели“',
        'Плъзни надолу и натисни „Add to Home Screen“ / „Добави на началния екран“',
        'Потвърди с „Add“ / „Добави“',
      ],
    };
  }
  if (/fxios/i.test(ua)) {
    return {
      title: 'Добави в Firefox (iPhone)',
      note: 'На iPhone инсталацията е само ръчна през менюто на браузъра.',
      steps: [
        'Натисни менюто (≡) в Firefox',
        'Избери „Share“ / „Сподели“',
        '„Add to Home Screen“ / „Добави на началния екран“',
      ],
    };
  }
  return {
    title: 'Добави в Safari',
    note: 'На iPhone автоматична инсталация работи само през Safari.',
    steps: [
      'Натисни Share (□↑) долу в средата на екрана',
      'Избери „Добави на началния екран“',
      'Потвърди с „Добави“',
    ],
  };
}

type TabId = (typeof TABS)[number]['id'];

type Props = {
  slug: string;
  ownerEmail: string;
  initialSite: AdminSitePayload;
  initialOffers?: AdminSalonOffer[];
  initialAccount?: { loginEmail: string; hasPassword: boolean; pendingEmail?: string | null };
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

function formatDomainStatus(s: string) {
  const map: Record<string, string> = {
    active: 'Активен', pending_verification: 'Чака верификация',
    pending_dns: 'Чака DNS', error: 'Грешка',
  };
  return map[s] ?? s ?? 'Не е свързан';
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

/* ─── Status config ───────────────────────────────────── */
const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:   { label: 'Чакаща',     bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  confirmed: { label: 'Потвърдена', bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  completed: { label: 'Завършена',  bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  cancelled: { label: 'Отказана',   bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

/* ─── Design tokens (module-level so sub-components can use them) ─ */
const T = {
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  border:   '#E5E3DE',
  text:     '#18181B',
  muted:    '#71717A',
  subtle:   '#A1A1AA',
  accent:   '#18181B',
  radius:   12,
  radiusLg: 16,
  radiusSm: 8,
} as const;

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboardClient({
  slug,
  ownerEmail,
  initialSite,
  initialOffers = [],
  initialAccount,
}: Props) {
  const [site, setSite]           = useState(initialSite);
  const siteRef = useRef(site);
  siteRef.current = site;
  const [bookings, setBookings]   = useState<BookingRecord[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [staffMembers, setStaffMembers] = useState<import('@/lib/staff-members').StaffMember[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('site');
  const [siteInitialSection, setSiteInitialSection] = useState<string | undefined>(undefined);
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
    googleConnected: false,
    googleConfigured: false,
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
  const [blogPosts, setBlogPosts] = useState<AdminSalonBlogPost[]>([]);
  const [blogSectionTitle, setBlogSectionTitle] = useState('');
  const [blogLoaded, setBlogLoaded] = useState(false);
  const blogPostsRef = useRef<AdminSalonBlogPost[]>([]);
  const blogSaveBusyRef = useRef(false);
  const blogSaveAgainRef = useRef(false);
  const [priceListUrls, setPriceListUrls] = useState<string[]>([]);
  const [priceListAnalyzing, setPriceListAnalyzing] = useState(false);
  const [smsDraftEnabled, setSmsDraftEnabled] = useState(initialSite.smsEnabled);
  const [smsDraftMode, setSmsDraftMode] = useState<SmsReminderMode>(initialSite.smsReminderMode);
  const [smsTransactions, setSmsTransactions] = useState<
    {
      id: string;
      kind: string;
      delta: number;
      balance_after: number | null;
      note: string | null;
      client_phone: string | null;
      created_at: string;
    }[]
  >([]);
  const [smsPanelLoading, setSmsPanelLoading] = useState(false);
  const [smsPendingReminders, setSmsPendingReminders] = useState(0);
  const [tgCodeCopied, setTgCodeCopied] = useState(false);
  const [tgBannerHidden, setTgBannerHidden] = useState(false);
  const [galleryPending, setGalleryPending] = useState<Set<string>>(() => new Set());
  const [portfolioPending, setPortfolioPending] = useState<Set<string>>(() => new Set());
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
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
    if (t === 'notifications') t = p.get('smsPurchase') ? 'sms' : 'integrations';
    if (t && TABS.some(tab => tab.id === t)) setActiveTab(t as TabId);
  }, []);

  // Prevent browser back-swipe from leaving the admin
  useEffect(() => {
    const url = window.location.href;
    // Push several entries so multiple swipes stay on admin
    window.history.pushState({ admin: true }, '', url);
    window.history.pushState({ admin: true }, '', url);
    window.history.pushState({ admin: true }, '', url);
    const onPopState = (e: PopStateEvent) => {
      if (!e.state?.admin) {
        window.history.pushState({ admin: true }, '', url);
        window.history.pushState({ admin: true }, '', url);
      } else {
        window.history.pushState({ admin: true }, '', url);
      }
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
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!window.location.pathname.includes('/admin')) return;
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          const script =
            reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
          if (script.includes('sw-admin.js')) void reg.unregister();
        }
      })
      .catch(() => { /* ignore */ });
    void navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin' }).catch(() => { /* ignore */ });
  }, []);

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
        googleConnected?: boolean;
        googleConfigured?: boolean;
        feedUrl?: string;
        webcalUrl?: string;
        externalIcsUrl?: string;
      };
      if (!res.ok) throw new Error('status_failed');
      setCalendarIntegrationStatus({
        loading: false,
        googleConnected: data.googleConnected === true,
        googleConfigured: data.googleConfigured === true,
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
    const hasExternal = calendarIntegrationStatus.externalIcsUrl || calendarIntegrationStatus.googleConnected;
    const hasBlocks = (site.bookingBlocks ?? []).length > 0;
    if (!hasExternal && !hasBlocks) return;
    void loadExternalCalendarOverlay();
  }, [
    activeTab,
    calendarIntegrationStatus.externalIcsUrl,
    calendarIntegrationStatus.googleConnected,
    site.bookingBlocks,
    loadExternalCalendarOverlay,
  ]);


  const connectGoogleCalendar = useCallback(() => {
    window.location.href = `/api/admin/calendar/google/connect?slug=${encodeURIComponent(slug)}`;
  }, [slug]);

  const disconnectGoogleCalendar = useCallback(async () => {
    setBusyKey('calendar-disconnect');
    setError('');
    try {
      const res = await fetch(`/api/admin/calendar/google?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
      });
      await guardResponse(res);
      setNotice('Google Calendar връзката е премахната.');
      await loadCalendarIntegrationStatus();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }, [slug, loadCalendarIntegrationStatus]);

  const resyncGoogleCalendar = useCallback(async () => {
    setBusyKey('calendar-resync');
    setError('');
    try {
      const res = await fetch(`/api/admin/calendar/google?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
      });
      await guardResponse(res);
      setNotice('Синхронизацията с Google Calendar започна.');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }, [slug]);

  useEffect(() => {
    if (activeTab !== 'integrations') return;
    void loadGoogleReviewsStatus();
    void loadCalendarIntegrationStatus();
  }, [activeTab, loadGoogleReviewsStatus, loadCalendarIntegrationStatus]);

  useEffect(() => {
    if (bookingsLoaded) return;
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
  }, [bookingsLoaded, slug]);

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
    setSmsDraftEnabled(site.smsEnabled);
    setSmsDraftMode(site.smsReminderMode);
  }, [site.smsEnabled, site.smsReminderMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'notifications') {
      setActiveTab(params.get('smsPurchase') ? 'sms' : 'integrations');
    }
    if (params.get('calendar') === 'connected') {
      setActiveTab('integrations');
      setNotice('Google Calendar е свързан. Резервациите се синхронизират автоматично.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('calendar') === 'error') {
      setActiveTab('integrations');
      setError('Google Calendar не беше свързан. Опитайте отново.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('smsPurchase') === 'success') {
      setActiveTab('sms');
      setNotice(`Добавени са ${SMS_PACK_CREDITS} SMS. Балансът е обновен.`);
      window.history.replaceState({}, '', window.location.pathname);
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

  useEffect(() => {
    if (activeTab !== 'sms') return;
    let cancelled = false;
    const run = async () => {
      setSmsPanelLoading(true);
      try {
        const res = await fetch(`/api/admin/sms?slug=${encodeURIComponent(slug)}`);
        const data = await readJson(res);
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Грешка');
        if (cancelled) return;
        const payload = data as {
          balance: number;
          enabled: boolean;
          reminderMode: SmsReminderMode;
          pendingReminders: number;
          transactions: typeof smsTransactions;
        };
        setSite((p) => ({
          ...p,
          smsBalance: payload.balance,
          smsEnabled: payload.enabled,
          smsReminderMode: payload.reminderMode,
        }));
        setSmsDraftEnabled(payload.enabled);
        setSmsDraftMode(payload.reminderMode);
        setSmsPendingReminders(payload.pendingReminders);
        setSmsTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
      } catch (e) {
        if (!cancelled) handleErr(e);
      } finally {
        if (!cancelled) setSmsPanelLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, slug]);

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

  function handleSlugSaved(newSlug: string) {
    // Redirect to the new subdomain admin page
    const newHost = `${newSlug}.${ROOT_DOMAIN}`;
    window.location.href = `https://${newHost}/admin`;
  }

  async function saveSiteSettings() {
    setError(''); setNotice(''); setBusyKey('site');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      setNotice('Информацията е запазена.');
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
      setNotice('Профилът е запазен.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function persistImages(
    payload: {
      coverImageUrl: string;
      logoImageUrl: string;
      galleryImages: string[];
      portfolioImages: string[];
      ownerPublicPhotoUrl: string;
    },
    opts?: { silent?: boolean },
  ) {
    if (!opts?.silent) {
      setError('');
      setNotice('');
    }
    setBusyKey(opts?.silent ? 'images-auto' : 'images');
    const galleryImages = payload.galleryImages.filter(u => u && !u.startsWith('blob:'));
    const portfolioImages = payload.portfolioImages.filter(u => u && !u.startsWith('blob:'));
    let coverImageUrl = payload.coverImageUrl;
    if (coverImageUrl.startsWith('blob:')) {
      coverImageUrl = galleryImages[0] ?? '';
    }
    try {
      const res = await fetch(`/api/admin/site-images?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverImageUrl,
          logoImageUrl: payload.logoImageUrl,
          galleryImages,
          portfolioImages,
          ownerPublicPhotoUrl: payload.ownerPublicPhotoUrl,
        }),
      });
      const data = await guardResponse(res) as { site: Partial<AdminSitePayload> };
      setSite((prev) => ({ ...prev, ...data.site }));
      if (!opts?.silent) setNotice('Снимките са запазени.');
    } catch (e) {
      if (!opts?.silent) handleErr(e);
      else setError('Снимките са качени, но не успяхме да ги запазим. Натисни „Запази".');
    } finally {
      setBusyKey('');
    }
  }

  async function saveImages() {
    const merged = mergeUniqueImageLists(site.portfolioImages, site.galleryImages);
    await persistImages({
      coverImageUrl: site.coverImageUrl,
      logoImageUrl: site.logoImageUrl,
      galleryImages: merged,
      portfolioImages: merged,
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
      setNotice('Услугите са запазени.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function saveHours() {
    setError(''); setNotice(''); setBusyKey('hours');
    try {
      const res = await fetch(`/api/admin/site-hours?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: site.workingHours, bookingBlocks: site.bookingBlocks }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({
        ...prev,
        workingHours: data.workingHours as WorkingHours,
        bookingBlocks: (data.bookingBlocks ?? []) as BookingBlock[],
      }));
      setNotice('Работното време е запазено.');
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
      setNotice(data.domainStatus === 'active' ? 'Домейнът е активен.' : 'Домейнът е записан. Добави DNS записите и изчакай верификация.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function removeDomain() {
    if (!confirm('Сигурен ли си, че искаш да премахнеш домейна?')) return;
    setError(''); setNotice(''); setBusyKey('domain-remove');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      await guardResponse(res);
      setSite(prev => ({ ...prev, customDomain: '', domainStatus: '', domainConfig: null }));
      setDomainInput('');
      setNotice('Домейнът е премахнат.');
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
      if (!silent) setNotice(data.domainStatus === 'active' ? 'Домейнът е активен.' : 'Статусът е обновен.');
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
      setNotice('Статусът е обновен.');
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

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-cover');
    setError('');
    const preview = URL.createObjectURL(file);
    setSite(p => ({ ...p, coverImageUrl: preview }));
    try {
      const url = await uploadSingleFile(file);
      const nextSite: AdminSitePayload = {
        ...site,
        coverImageUrl: url,
        logoImageUrl: site.logoImageUrl || url,
      };
      setSite(nextSite);
      if (isMobile) {
        await persistImages(
          {
            coverImageUrl: nextSite.coverImageUrl,
            logoImageUrl: nextSite.logoImageUrl,
            galleryImages: nextSite.galleryImages,
            portfolioImages: nextSite.portfolioImages,
            ownerPublicPhotoUrl: nextSite.ownerPublicPhotoUrl,
          },
          { silent: true },
        );
        setNotice('Cover е качен и запазен.');
      } else {
        setNotice('Cover качена. Натисни „Запази снимките".');
      }
    } catch (e) {
      handleErr(e);
      setSite(p => ({
        ...p,
        coverImageUrl: p.coverImageUrl === preview ? '' : p.coverImageUrl,
      }));
    } finally {
      URL.revokeObjectURL(preview);
      setBusyKey('');
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-logo');
    setError('');
    const preview = URL.createObjectURL(file);
    setSite(p => ({ ...p, logoImageUrl: preview }));
    try {
      const url = await uploadSingleFile(file);
      const nextSite: AdminSitePayload = { ...site, logoImageUrl: url };
      setSite(nextSite);
      if (isMobile) {
        await persistImages(
          {
            coverImageUrl: nextSite.coverImageUrl,
            logoImageUrl: nextSite.logoImageUrl,
            galleryImages: nextSite.galleryImages,
            portfolioImages: nextSite.portfolioImages,
            ownerPublicPhotoUrl: nextSite.ownerPublicPhotoUrl,
          },
          { silent: true },
        );
        setNotice('Лого е качено и запазено.');
      } else {
        setNotice('Лого качено. Натисни „Запази снимките".');
      }
    } catch (e) {
      handleErr(e);
      setSite(p => ({
        ...p,
        logoImageUrl: p.logoImageUrl === preview ? '' : p.logoImageUrl,
      }));
    } finally {
      URL.revokeObjectURL(preview);
      setBusyKey('');
    }
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

  async function uploadAdminImageList(
    files: FileList | File[] | null,
    input: HTMLInputElement | null | undefined,
    target: 'gallery' | 'portfolio',
  ) {
    const images = imageFilesFromInput(files);
    if (!images.length) {
      setError('Моля, избери само изображения (JPG, PNG, WebP, GIF).');
      return;
    }

    const listKey = target === 'gallery' ? 'galleryImages' : 'portfolioImages';
    const busyUploadKey = target === 'gallery' ? 'upload-gallery' : 'upload-portfolio';
    const setPending = target === 'gallery' ? setGalleryPending : setPortfolioPending;
    const setProgress = target === 'gallery' ? setGalleryUploadProgress : setPortfolioUploadProgress;
    const label = target === 'gallery' ? 'салона' : 'портфолиото';

    const snapshot = siteRef.current;
    const filterStable = (urls: string[]) => urls.filter((u) => u && !u.startsWith('blob:'));
    const stableBefore =
      target === 'portfolio'
        ? mergeUniqueImageLists(
            filterStable(snapshot.portfolioImages),
            filterStable(snapshot.galleryImages),
          )
        : filterStable(snapshot[listKey]);

    const previews = images.map((file) => ({
      file,
      blob: URL.createObjectURL(file),
    }));
    const blobUrls = previews.map((p) => p.blob);

    setPending((prev) => {
      const next = new Set(prev);
      blobUrls.forEach((b) => next.add(b));
      return next;
    });
    setSite((p) => {
      const stable =
        target === 'portfolio'
          ? mergeUniqueImageLists(
              filterStable(p.portfolioImages),
              filterStable(p.galleryImages),
            )
          : p[listKey].filter((u) => !u.startsWith('blob:'));
      const nextList = [...stable, ...blobUrls];
      return {
        ...p,
        ...(target === 'portfolio'
          ? { portfolioImages: nextList, galleryImages: nextList }
          : { [listKey]: nextList }),
        ...(target === 'gallery' && (!p.coverImageUrl || p.coverImageUrl.startsWith('blob:'))
          ? { coverImageUrl: nextList[0] ?? '' }
          : {}),
      };
    });

    setBusyKey(busyUploadKey);
    setProgress({ done: 0, total: images.length });
    setError('');

    const uploadedUrls: string[] = [];
    let progressDone = 0;

    try {
      await mapWithConcurrency(previews, isMobile ? 3 : 2, async ({ file, blob }) => {
        try {
          const url = await uploadSingleFile(file);
          uploadedUrls.push(url);
          setSite((p) => {
            const current =
              target === 'portfolio'
                ? mergeUniqueImageLists(
                    filterStable(p.portfolioImages),
                    filterStable(p.galleryImages),
                  )
                : p[listKey];
            const nextList = current.map((u) => (u === blob ? url : u));
            return {
              ...p,
              ...(target === 'portfolio'
                ? { portfolioImages: nextList, galleryImages: nextList }
                : { [listKey]: nextList }),
              ...(target === 'gallery' && (!p.coverImageUrl || p.coverImageUrl === blob)
                ? { coverImageUrl: url }
                : {}),
            };
          });
        } catch (e) {
          setSite((p) => {
            const current =
              target === 'portfolio'
                ? mergeUniqueImageLists(
                    filterStable(p.portfolioImages),
                    filterStable(p.galleryImages),
                  )
                : p[listKey];
            const nextList = current.filter((u) => u !== blob);
            return target === 'portfolio'
              ? { ...p, portfolioImages: nextList, galleryImages: nextList }
              : { ...p, [listKey]: nextList };
          });
          throw e;
        } finally {
          URL.revokeObjectURL(blob);
          setPending((prev) => {
            const next = new Set(prev);
            next.delete(blob);
            return next;
          });
          progressDone += 1;
          setProgress({ done: progressDone, total: images.length });
        }
      });

      const finalList = [...stableBefore, ...uploadedUrls];
      const latest = siteRef.current;
      const persistPayload = {
        coverImageUrl:
          target === 'gallery' && (!latest.coverImageUrl || latest.coverImageUrl.startsWith('blob:'))
            ? (finalList[0] ?? latest.coverImageUrl)
            : latest.coverImageUrl,
        logoImageUrl: latest.logoImageUrl,
        galleryImages: target === 'portfolio' || target === 'gallery' ? finalList : filterStable(latest.galleryImages),
        portfolioImages:
          target === 'portfolio' || target === 'gallery'
            ? finalList
            : filterStable(latest.portfolioImages),
        ownerPublicPhotoUrl: latest.ownerPublicPhotoUrl,
      };

      setSite((p) => ({
        ...p,
        ...(target === 'portfolio'
          ? { portfolioImages: finalList, galleryImages: finalList }
          : { [listKey]: finalList }),
        ...(target === 'gallery'
          ? {
              coverImageUrl:
                p.coverImageUrl && !p.coverImageUrl.startsWith('blob:')
                  ? p.coverImageUrl
                  : (finalList[0] ?? ''),
            }
          : {}),
      }));

      await persistImages(persistPayload, { silent: true });
      setNotice(
        uploadedUrls.length === 1
          ? `Снимката е качена и запазена в ${label}.`
          : `${uploadedUrls.length} снимки са качени и запазени в ${label}.`,
      );
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
      setProgress(null);
      if (input) input.value = '';
    }
  }

  async function handleGalleryUpload(
    files: FileList | File[] | null,
    input?: HTMLInputElement | null,
  ) {
    await uploadAdminImageList(files, input, 'gallery');
  }

  async function handlePortfolioUpload(
    files: FileList | File[] | null,
    input?: HTMLInputElement | null,
  ) {
    await uploadAdminImageList(files, input, 'portfolio');
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
    border: isMobile ? '1.5px solid transparent' : `1px solid ${T.border}`,
    background: '#fff',
    boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)' : undefined,
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
  const switchTab = (id: TabId) => { setActiveTab(id); setError(''); setNotice(''); setNavOpen(false); };
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
      setNotice('Офертите са запазени.');
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

  async function saveSmsSettings() {
    setError('');
    setNotice('');
    setBusyKey('sms-settings');
    try {
      const res = await fetch(`/api/admin/sms?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: smsDraftEnabled,
          reminderMode: smsDraftMode,
        }),
      });
      const data = await guardResponse(res) as {
        enabled: boolean;
        reminderMode: SmsReminderMode;
      };
      setSite((p) => ({
        ...p,
        smsEnabled: data.enabled,
        smsReminderMode: data.reminderMode,
      }));
      setSmsDraftEnabled(data.enabled);
      setSmsDraftMode(data.reminderMode);
      setNotice('SMS настройките са запазени.');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
    }
  }

  async function buySmsPack() {
    setError('');
    setBusyKey('sms-checkout');
    try {
      const res = await fetch(`/api/admin/sms-checkout?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
      });
      const data = await guardResponse(res) as { checkoutUrl?: string };
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else throw new Error('Липсва линк за плащане.');
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
      {/* Background grid + gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 60% at 80% 0%, rgba(219,39,119,0.07) 0%, rgba(168,85,247,0.05) 50%, transparent 80%)' }} />
      </div>

      {/* ── Top nav ───────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isMobile ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isMobile ? '0.5px solid rgba(0,0,0,0.06)' : `1px solid ${T.border}`,
        height: isMobile ? 52 : 56,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 16px' : '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Отвори меню"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(219,39,119,0.28)',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <Menu size={18} />
            </button>
          ) : null}
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
            {!isMobile && (
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>c</div>
            )}
            <span style={{ fontSize: isMobile ? 17 : 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{site.name || slug}</span>
            {!isMobile && (
              <span style={{ fontSize: 12, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{ownerEmail}</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
            {site.siteStatus !== 'active' && (
              <button
                type="button"
                onClick={() => void publishSite()}
                disabled={busyKey === 'publish'}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  borderRadius: isMobile ? 12 : T.radiusSm, border: 'none',
                  background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
                  color: '#fff',
                  padding: isMobile ? '8px 14px' : '6px 14px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: busyKey === 'publish' ? 0.7 : 1,
                }}
              >
                {busyKey === 'publish' ? '…' : (isMobile ? 'Публикувай' : 'Публикувай сайта')}
              </button>
            )}
            <a
              href={sitePublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Виж сайта"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: isMobile ? 36 : undefined, height: isMobile ? 36 : undefined,
                borderRadius: isMobile ? 10 : T.radiusSm,
                border: isMobile ? 'none' : `1px solid ${T.border}`,
                background: isMobile ? ICON_GRADIENT : 'transparent',
                boxShadow: isMobile ? '0 6px 16px rgba(219,39,119,0.22)' : 'none',
                textDecoration: 'none', color: isMobile ? '#fff' : T.muted,
                padding: isMobile ? 0 : '6px 12px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              <ExternalLink size={isMobile ? 16 : 13} />
              {!isMobile && <span style={{ marginLeft: 6 }}>Виж сайта</span>}
            </a>
            {showInstallButton && !isMobile && (
              <button type="button" onClick={triggerPwaInstall} style={btn('sm-ghost')}>
                Инсталирай
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              disabled={busyKey === 'logout'}
              aria-label="Изход"
              title="Изход"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: isMobile ? 36 : undefined, height: isMobile ? 36 : undefined,
                borderRadius: isMobile ? 10 : T.radiusSm,
                border: isMobile ? 'none' : `1px solid ${T.border}`,
                background: isMobile ? '#F4F4F5' : 'transparent',
                color: T.muted,
                padding: isMobile ? 0 : '6px 12px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              <LogOut size={14} />
              {!isMobile && <span style={{ marginLeft: 6 }}>{busyKey === 'logout' ? 'Излизане…' : 'Изход'}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom sheet nav ───────────────────── */}
      {isMobile && navOpen && (
        <>
          <button
            type="button"
            aria-label="Затвори менюто (фон)"
            onClick={() => setNavOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 55,
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'rgba(0,0,0,0.32)',
              cursor: 'pointer',
              animation: 'fadeIn 200ms ease',
            }}
          />
          <div
            ref={mobileNavSheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Навигация"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 56,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
              fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
              animation: 'slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: 'min(92dvh, calc(100dvh - 12px))',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
              touchAction: 'pan-y',
            }}
          >
            <button
              type="button"
              aria-label="Затвори менюто"
              className="admin-sheet-handle"
              onClick={() => {
                if (sheetDragRef.current.offset > 10) return;
                setNavOpen(false);
              }}
              onTouchStart={(e) => onSheetDragStart(e.touches[0]?.clientY ?? 0)}
              onTouchMove={(e) => {
                onSheetDragMove(e.touches[0]?.clientY ?? 0);
                if (sheetDragRef.current.offset > 8) e.preventDefault();
              }}
              onTouchEnd={() => onSheetDragEnd()}
              onTouchCancel={() => onSheetDragEnd()}
              style={{
                display: 'flex',
                width: '100%',
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 16px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'grab',
                flexShrink: 0,
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                aria-hidden
                style={{ width: 44, height: 5, borderRadius: 3, background: '#A1A1AA', pointerEvents: 'none' }}
              />
            </button>

            <div
              style={{
                padding: '0 12px 8px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {SHEET_GROUPS.map(group => {
                const visibleTabs = TABS.filter(
                  t => group.ids.includes(t.id) && (t.id !== 'staff' || site.plan === 'team')
                );
                if (visibleTabs.length === 0) return null;
                const isGroupOpen = openGroups.has(group.label);
                const isSettings = group.label === 'Настройки';
                return (
                  <div key={group.label}>
                    <button
                      type="button"
                      onClick={() => setOpenGroups(prev => {
                        const next = new Set(prev);
                        if (next.has(group.label)) next.delete(group.label);
                        else next.add(group.label);
                        return next;
                      })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '2px 4px 8px 4px',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <p style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        margin: 0,
                        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
                        background: ICON_GRADIENT,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        color: 'transparent',
                      }}>{group.label}</p>
                      <svg
                        width={14} height={14} viewBox="0 0 24 24" fill="none"
                        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          transform: isGroupOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 220ms ease',
                          flexShrink: 0,
                        }}
                      >
                        <defs>
                          <linearGradient id={`chev-${group.label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#e11d48" />
                            <stop offset="50%" stopColor="#db2777" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        <polyline points="6 9 12 15 18 9" stroke={`url(#chev-${group.label})`} />
                      </svg>
                    </button>
                    <div style={{
                      overflow: 'hidden',
                      maxHeight: isGroupOpen ? '600px' : '0px',
                      opacity: isGroupOpen ? 1 : 0,
                      transition: 'max-height 300ms ease, opacity 220ms ease',
                    }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                      paddingBottom: isGroupOpen ? 0 : 0,
                    }}>
                      {visibleTabs.map(({ id, label, Icon }) => {
                        const active = activeTab === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => switchTab(id)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              padding: '8px 6px',
                              borderRadius: 12,
                              border: active ? '1.5px solid #C084FC' : `1px solid ${T.border}`,
                              background: active ? 'linear-gradient(135deg, rgba(225,29,72,0.06) 0%, rgba(168,85,247,0.06) 100%)' : '#fff',
                              cursor: 'pointer',
                              minHeight: 64,
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: active ? 32 : 28, height: active ? 32 : 28,
                              borderRadius: 999,
                              background: active ? ICON_GRADIENT : 'transparent',
                              color: active ? '#fff' : '#18181B',
                              boxShadow: active ? '0 6px 16px rgba(219,39,119,0.22)' : 'none',
                              transition: 'all 180ms ease',
                            }}>
                              <Icon size={active ? 20 : 18} strokeWidth={active ? 2.25 : 1.75} />
                            </div>
                            <span style={{
                              fontSize: 11,
                              fontWeight: active ? 600 : 400,
                              letterSpacing: '-0.01em',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              color: active ? 'transparent' : '#18181B',
                              background: active ? ICON_GRADIENT : 'none',
                              WebkitBackgroundClip: active ? 'text' : 'unset',
                              backgroundClip: active ? 'text' : 'unset',
                            }}>
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {isSettings && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setNavOpen(false);
                            window.dispatchEvent(new Event('clicka:open-chat'));
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: `1px solid ${T.border}`,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#18181B',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: 999,
                            background: ICON_GRADIENT, color: '#fff', flexShrink: 0,
                          }}>
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </span>
                          Чат поддръжка
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                margin: '0 12px',
                paddingTop: 10,
                borderTop: `1px solid ${T.border}`,
                flexShrink: 0,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <a
                href={sitePublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setNavOpen(false)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 10px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  background: ICON_GRADIENT,
                  boxShadow: '0 6px 16px rgba(219,39,119,0.22)',
                }}
              >
                <ExternalLink size={16} /> Виж сайта
              </a>
              {!pwaOnHomeScreen ? (
                <button
                  type="button"
                  aria-label="Добави на началния екран"
                  onClick={triggerPwaInstall}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    background: '#fff',
                    color: T.text,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              ) : (
                <div
                  aria-label="Добавено на началния екран"
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid #BBF7D0',
                    background: '#F0FDF4',
                  }}
                >
                  <Check size={20} strokeWidth={2.5} style={{ color: '#22C55E' }} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {pwaInstallOpen && (() => {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const guide = getPwaInstallGuide(ua);
        const isIos = /iphone|ipad|ipod/i.test(ua);
        const canNativeInstall = Boolean(installPromptEvent) && !isIos;
        return (
          <>
            <button
              type="button"
              aria-label="Затвори"
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
                        setNotice('Приложението се добавя на екрана.');
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
                    background: ICON_GRADIENT,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  <Plus size={18} /> Инсталирай сега
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
                Готово — добавих го
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
                Затвори
              </button>
            </div>
          </>
        );
      })()}

      {/* ── Body layout ───────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

        {/* ── Sidebar (desktop) ─────────────────────── */}
        {!isMobile && (
          <aside style={{
            width: 196, flexShrink: 0,
            position: 'sticky', top: 56, height: 'calc(100dvh - 56px)',
            overflowY: 'auto', borderRight: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '14px 8px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: T.radiusSm,
                    border: active ? '1px solid #E4E4E7' : '1px solid transparent',
                    width: '100%', textAlign: 'left',
                    background: '#fff',
                    color: active ? T.text : T.muted,
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'background 120ms, color 120ms',
                  }}
                >
                  <Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />}
                </button>
              );
            })}

            <div style={{ flex: 1 }} />

            <a
              href="https://t.me/clickabg_support"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: T.radiusSm,
                border: '1px solid transparent',
                width: '100%', textAlign: 'left',
                background: 'transparent',
                color: T.muted,
                fontSize: 14, fontWeight: 400,
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'background 120ms, color 120ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = '#f4f4f5';
                (e.currentTarget as HTMLAnchorElement).style.color = T.text;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                (e.currentTarget as HTMLAnchorElement).style.color = T.muted;
              }}
            >
              <LifeBuoy size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Поддръжка</span>
            </a>

          </aside>
        )}

        {/* ── Main content ──────────────────────────── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile
              ? '16px 12px calc(88px + env(safe-area-inset-bottom)) 12px'
              : '28px 32px 48px',
          }}
        >

          {/* Toast messages */}
          {error  && <Toast tone="error"   onDismiss={() => setError('')}>{error}</Toast>}
          {notice && <Toast tone="success" onDismiss={() => setNotice('')}>{notice}</Toast>}

          {/* ── Plan renewal banner ── */}
          {(() => {
            const expiresAt = site.planExpiresAt ? new Date(site.planExpiresAt) : null;
            if (!expiresAt || isNaN(expiresAt.getTime())) return null;
            const now = new Date();
            const msLeft = expiresAt.getTime() - now.getTime();
            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            const expired = msLeft <= 0;
            const nearExpiry = !expired && daysLeft <= 30;
            if (!expired && !nearExpiry) return null;

            const planLabel = site.plan === 'team' ? 'TEAM' : 'SOLO';
            const periodLabel = site.billingPeriod === '6m' ? '6 месеца' : '12 месеца';
            const renewKey: string = `${site.plan}_${site.billingPeriod ?? '12m'}`;
            const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const renewUrl = `${appUrl}/create?plan=${encodeURIComponent(renewKey)}`;

            return (
              <div
                style={{
                  marginBottom: 20,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: `1.5px solid ${expired ? '#fca5a5' : '#fcd34d'}`,
                  background: expired ? '#fff5f5' : '#fffbeb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CreditCard size={18} style={{ color: expired ? '#ef4444' : '#d97706', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: expired ? '#b91c1c' : '#92400e', margin: 0 }}>
                      {expired
                        ? `Планът ${planLabel} е изтекъл`
                        : `Планът ${planLabel} изтича след ${daysLeft} ${daysLeft === 1 ? 'ден' : 'дни'}`}
                    </p>
                    <p style={{ fontSize: 12, color: expired ? '#dc2626' : '#b45309', margin: '2px 0 0' }}>
                      {expired
                        ? 'Подновете, за да запазите достъпа до всички функции.'
                        : `Текущ период: ${periodLabel}. Подновете навреме, за да нямате прекъсване.`}
                    </p>
                  </div>
                </div>
                <a
                  href={renewUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: expired
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <RefreshCw size={14} />
                  Поднови абонамента
                </a>
              </div>
            );
          })()}

          {/* ── Onboarding checklist ── */}
          {activeTab === 'site' && (
            <OnboardingChecklist site={site} onGoToTab={(tab, subtab) => { setSiteInitialSection(subtab); switchTab(tab as TabId); }} />
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
                  <ExternalLink size={14} style={{ color: '#db2777', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#db2777',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{publicSiteHost}</span>
                </a>
                {/* Copy button */}
                <button
                  type="button"
                  title="Копирай линка"
                  onClick={() => {
                    void navigator.clipboard.writeText(sitePublicUrl).then(() => setNotice('Линкът е копиран!'));
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
                  title="QR код"
                  onClick={() => setQrOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: ICON_GRADIENT, color: '#fff',
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(219,39,119,0.30)',
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

              <LazySiteTabPanel site={site} setSite={setSite} inp={inp} btn={btn} busyKey={busyKey} saveSiteSettings={saveSiteSettings} isMobile={isMobile} currentSlug={slug} rootDomain={ROOT_DOMAIN} onSlugSaved={handleSlugSaved} onNavigateToDomain={() => setActiveTab('domain')} initialSection={siteInitialSection as 'basics' | 'address' | 'about' | 'faq' | 'amenities' | undefined} />
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
              handleCoverUpload={handleCoverUpload}
              handleLogoUpload={handleLogoUpload}
              handlePortfolioUpload={handlePortfolioUpload}
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
            />
          ) : null}

          {activeTab === 'staff' ? (
            <LazyStaffTabPanel
              salonSlug={slug}
              initialStaff={staffMembers}
              planLimit={site.plan === 'team' ? 3 : 1}
              salonServices={site.services}
            />
          ) : null}

          {/* ── Услуги ── */}
          {activeTab === 'services' && (
            <Section
              title="Услуги"
              desc={isMobile ? undefined : 'Управлявай услугите и категориите на салона.'}
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
                      background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
                      boxShadow: '0 4px 12px rgba(219,39,119,0.18)',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setServiceModalOpen(true)}
                  >
                    <Plus size={13} />
                    Добави
                  </button>
                  <AdminSaveBtn
                    label="Запази"
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
              title="Оферти"
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
                      background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={14} strokeWidth={2.25} />
                    Добави
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveOffers()}
                    disabled={busyKey === 'offers'}
                    style={{
                      ...ADMIN_COMPACT_SAVE_BTN,
                      opacity: busyKey === 'offers' ? 0.7 : 1,
                      cursor: busyKey === 'offers' ? 'wait' : 'pointer',
                    }}
                  >
                    {busyKey === 'offers' ? 'Запазване…' : 'Запази'}
                  </button>
                </div>
              }
            >
              <LazySalonOffersSection
                offers={offers}
                isMobile={isMobile}
                busyKey={busyKey}
                inp={inp}
                onChange={setOffers}
                onUploadImages={handleOfferImagesUpload}
              />
            </Section>
          )}

          {activeTab === 'brands' && (
            <LazyBrandsTabPanel
              initialBrandIds={site.brandIds}
              isMobile={isMobile}
            />
          )}

          {activeTab === 'blog' && (
            <Section
              title="Блог"
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
                      background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={14} strokeWidth={2.25} />
                    Нова статия
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
                      {busyKey === 'blog' ? 'Запазване…' : 'Запази'}
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
            <LazyHoursTabPanel site={site} setSite={setSite} isMobile={isMobile} inp={inp} btn={btn} busyKey={busyKey} saveHours={saveHours} />
          ) : null}

          {/* ── Резервации ── */}
          {activeTab === 'bookings' && (
            <Section
              title="Резервации"
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                    {bookings.length} общо
                  </span>
                  {!isMobile ? (
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as BookingListFilter)} style={{ ...inp, width: 'auto', paddingRight: 28, cursor: 'pointer' }}>
                      <option value="all">Всички</option>
                      <option value="upcoming">Предстоящи</option>
                      <option value="pending">Чакащи</option>
                      <option value="completed">Завършени</option>
                      <option value="cancelled">Отказани</option>
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
              title="Клиенти"
              action={
                <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                  {clients.length} уникални
                </span>
              }
            >
              <ClientsPanel clients={clients} isMobile={isMobile} T={T} />
            </Section>
          )}

          {/* ── Домейн ── */}
          {activeTab === 'domain' && (
            <DomainTab
              slug={slug}
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
            <AccountTabPanel slug={slug} inp={inp} initialAccount={initialAccount} />
          ) : null}

          {activeTab === 'payments' ? (
            <LazyPaymentsTabPanel slug={slug} btn={btn} />
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
              onConnectGoogleCalendar={connectGoogleCalendar}
              onDisconnectGoogleCalendar={disconnectGoogleCalendar}
              onResyncGoogleCalendar={resyncGoogleCalendar}
              onSaveExternalIcsUrl={saveExternalIcsUrl}
            />
          ) : null}

          {activeTab === 'sms' ? (
            <LazySmsTabPanel
              site={site}
              smsDraftEnabled={smsDraftEnabled}
              setSmsDraftEnabled={setSmsDraftEnabled}
              smsDraftMode={smsDraftMode}
              setSmsDraftMode={setSmsDraftMode}
              smsPanelLoading={smsPanelLoading}
              smsPendingReminders={smsPendingReminders}
              smsTransactions={smsTransactions}
              btn={btn}
              busyKey={busyKey}
              saveSmsSettings={saveSmsSettings}
              buySmsPack={buySmsPack}
            />
          ) : null}

        </main>
      </div>

      {/* ── Telegram connect banner ───────────────────── */}
      {!site.telegramChatId && !tgBannerHidden && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 84 : 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 420,
          zIndex: 49,
          background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
          borderRadius: 16,
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(219,39,119,.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#fff',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, opacity: 0.9 }}>
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.038 9.593c-.152.678-.549.843-1.112.524l-3.078-2.268-1.484 1.428c-.164.164-.302.302-.619.302l.221-3.131 5.703-5.152c.248-.221-.054-.344-.383-.123L7.12 14.073l-3.031-.947c-.658-.206-.671-.658.138-.975l11.84-4.564c.548-.197 1.028.134.495.661z"/>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>Свържи Telegram</p>
            {site.onboardingCode && (
              <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.75, lineHeight: 1.3 }}>
                1. Отвори бота →{'  '}
                2. Изпрати кода:{' '}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
                    setTgCodeCopied(true);
                    setTimeout(() => setTgCodeCopied(false), 2000);
                  }}
                  title="Копирай кода"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '1px 7px',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: '0.05em',
                    color: '#e11d48',
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                  }}
                >
                  {site.onboardingCode}
                  {tgCodeCopied ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (site.onboardingCode) {
                navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
              }
              window.open('https://t.me/clicka_booking_bot', '_blank');
            }}
            style={{
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Отвори →
          </button>
          <button
            type="button"
            aria-label="Скрий банера"
            onClick={() => setTgBannerHidden(true)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 999,
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Mobile bottom tab bar (glass pill) ───────── */}
      {isMobile && (
        <nav
          aria-label="Навигация"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
            zIndex: 50,
            pointerEvents: 'none',
            width: 'calc(100% - 32px)',
            maxWidth: 320,
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: 4,
              padding: '8px 10px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.68)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.72)',
              boxShadow:
                '0 14px 50px rgba(15,23,42,0.2), 0 6px 20px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            {TAB_BAR_TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id && !navOpen;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => switchTab(id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '4px 6px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    minHeight: 48,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: active ? 36 : 30,
                      height: active ? 36 : 30,
                      borderRadius: 999,
                      background: active ? ICON_GRADIENT : 'transparent',
                      color: active ? '#fff' : '#18181B',
                      boxShadow: active ? '0 8px 20px rgba(219,39,119,0.28)' : 'none',
                      transition: 'all 180ms ease',
                    }}
                  >
                    <Icon size={active ? 22 : 20} strokeWidth={active ? 2.25 : 1.85} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      letterSpacing: '-0.01em',
                      color: active ? '#db2777' : '#18181B',
                      lineHeight: 1,
                    }}
                  >
                    {label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .admin-mobile-root input:focus, .admin-mobile-root textarea:focus, .admin-mobile-root select:focus {
          border-color: #18181B !important;
          outline: none;
        }
        .admin-mobile-root button:active:not(.admin-sheet-handle) {
          transform: scale(0.97);
        }
        .admin-sheet-handle:active {
          transform: none;
          opacity: 0.85;
        }
      `}</style>
      <ChatWidget mobileBottomOffset={0} hideBubble={isMobile} />
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
    backgroundImage: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
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
        bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: T.radiusSm, border: `1px solid ${tone === 'error' ? '#FECACA' : '#A7F3D0'}`, background: tone === 'error' ? '#FEF2F2' : '#ECFDF5', marginBottom: 16 }}>
      {tone === 'error'
        ? <XCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
        : <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 13, color: tone === 'error' ? '#991B1B' : '#065F46', lineHeight: 1.5 }}>{children}</span>
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
      background: done ? '#F0FDF4' : T.surface,
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

function DnsRecordCard({ record, copied, onCopy, isVerification = false }: {
  record: DomainInstruction;
  copied: string;
  onCopy: (value: string, key: string) => void;
  isVerification?: boolean;
}) {
  const typeLabels: Record<string, string> = { CNAME: 'CNAME — пренасочване към нашия сървър', A: 'A — IP адрес', TXT: 'TXT — верификационен текст' };
  const type = String(record.type ?? '').toUpperCase();
  const host = String(record.host ?? '');
  const value = String(record.value ?? '');
  const hostKey = `host-${host}-${value}`;
  const valueKey = `val-${host}-${value}`;

  return (
    <div style={{ border: `1px solid ${isVerification ? '#DDD6FE' : T.border}`, borderRadius: T.radiusSm, overflow: 'hidden', background: isVerification ? '#FAF5FF' : '#F9F9F8' }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${isVerification ? '#DDD6FE' : T.border}`, background: isVerification ? '#EDE9FE' : '#F4F4F5' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isVerification ? '#5B21B6' : T.text, letterSpacing: '0.04em' }}>
          {typeLabels[type] ?? type}
        </span>
      </div>
      <div style={{ padding: '12px', display: 'grid', gap: 8 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.03em' }}>ПОЛЕ "ХОС" / "NAME" / "SUBDOMAIN"</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, padding: '7px 10px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host || '@'}
            </code>
            <button
              type="button"
              onClick={() => onCopy(host || '@', hostKey)}
              style={{ padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.muted, flexShrink: 0 }}
            >
              {copied === hostKey ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
              {copied === hostKey ? 'Копирано' : 'Копирай'}
            </button>
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.03em' }}>ПОЛЕ "СТОЙНОСТ" / "VALUE" / "POINTS TO"</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, padding: '7px 10px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 12, fontFamily: 'monospace', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </code>
            <button
              type="button"
              onClick={() => onCopy(value, valueKey)}
              style={{ padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.muted, flexShrink: 0 }}
            >
              {copied === valueKey ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
              {copied === valueKey ? 'Копирано' : 'Копирай'}
            </button>
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.03em' }}>ПОЛЕ "TTL"</p>
          <code style={{ display: 'inline-block', padding: '7px 10px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: 'monospace', color: T.muted }}>Automatic</code>
        </div>
      </div>
    </div>
  );
}

function DomainTab({
  site, isMobile, domainInput, setDomainInput, domainMeta,
  busyKey, connectDomain, refreshDomainStatus, removeDomain, inp, btn,
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
  slug: string;
}) {
  const [copied, setCopied] = useState('');

  function copyVal(value: string, key: string) {
    navigator.clipboard.writeText(value).catch(() => null);
    setCopied(key);
    setTimeout(() => setCopied(k => k === key ? '' : k), 2000);
  }

  const hasDomain = Boolean(site.customDomain);
  const isActive = site.domainStatus === 'active';
  const maxW: CSSProperties = { maxWidth: isMobile ? '100%' : 560 };

  /* ── No domain yet ── */
  if (!hasDomain) {
    return (
      <Section title="Собствен домейн" desc="Свържи своя домейн — например moisalon.com или www.friziorvanesa.bg.">
        <div style={maxW}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: 24 }}>
            <p style={{ margin: '0 0 18px', fontSize: 14, color: T.muted, lineHeight: 1.7 }}>
              Имаш ли собствен домейн? Въведи го по-долу и ние ще те преведем стъпка по стъпка как да го свържеш.
            </p>
            <Field label="Твоят домейн">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  placeholder="moisalon.com"
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter' && domainInput.trim()) void connectDomain(); }}
                />
                <button
                  type="button"
                  style={{ ...btn('primary'), background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)', opacity: (busyKey === 'domain' || !domainInput.trim()) ? 0.5 : 1 }}
                  disabled={busyKey === 'domain' || !domainInput.trim()}
                  onClick={() => void connectDomain()}
                >
                  {busyKey === 'domain' ? 'Проверяваме…' : 'Напред →'}
                </button>
              </div>
            </Field>
            <p style={{ margin: '14px 0 0', fontSize: 12, color: T.subtle, lineHeight: 1.6 }}>
              Нямаш домейн? Можеш да закупиш от{' '}
              <strong style={{ color: T.muted }}>register.bg</strong>,{' '}
              <strong style={{ color: T.muted }}>superhosting.bg</strong> или{' '}
              <strong style={{ color: T.muted }}>GoDaddy</strong>.
            </p>
          </div>
        </div>
      </Section>
    );
  }

  /* ── Active domain ── */
  if (isActive) {
    return (
      <Section title="Собствен домейн" desc="Домейнът е активен и свързан към твоя сайт.">
        <div style={{ ...maxW, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: T.radiusLg }}>
            <CheckCircle2 size={22} style={{ color: '#10B981', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065F46' }}>Домейнът е свързан успешно</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#047857', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.customDomain}</p>
            </div>
            <a href={`https://${site.customDomain}`} target="_blank" rel="noreferrer" style={{ ...btn('sm-ghost'), textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={13} />
              {!isMobile && 'Отвори'}
            </a>
          </div>
          <button
            type="button"
            style={{ ...btn('ghost'), color: '#EF4444', borderColor: '#FECACA', justifyContent: 'flex-start' }}
            onClick={() => void removeDomain()}
            disabled={busyKey === 'domain-remove'}
          >
            <Trash2 size={14} />
            {busyKey === 'domain-remove' ? 'Премахваме…' : 'Премахни домейна'}
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
      title="Свърши свързването на домейна"
      desc={`Следвай стъпките по-долу за ${site.customDomain}`}
    >
      <div style={{ ...maxW, display: 'grid', gap: 14 }}>

        {/* Domain + status bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg }}>
          <Globe size={15} style={{ color: T.muted, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.customDomain}</span>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 600, flexShrink: 0 }}>
            {formatDomainStatus(site.domainStatus ?? '')}
          </span>
          <button type="button" style={{ ...btn('sm-ghost'), padding: '5px 8px', flexShrink: 0 }} onClick={() => void removeDomain()} disabled={busyKey === 'domain-remove'} title="Премахни домейна">
            <Trash2 size={13} style={{ color: '#EF4444' }} />
          </button>
        </div>

        {/* Step 1 */}
        <StepCard step={1} title="Влез при регистратора на домейна" done={false}>
          <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            Отиди на сайта, от който си купил домейна си. Примерни регистратори:{' '}
            <strong style={{ color: T.text }}>Register.bg</strong>,{' '}
            <strong style={{ color: T.text }}>Superhosting.bg</strong>,{' '}
            <strong style={{ color: T.text }}>GoDaddy</strong>,{' '}
            <strong style={{ color: T.text }}>Namecheap</strong> или друг.
            Влез в акаунта си там и намери управлението на домейна.
          </p>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} title='Намери DNS настройките' done={false}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            В управлението на домейна търси раздел или бутон, който се казва:{' '}
            <strong style={{ color: T.text }}>DNS Settings</strong>,{' '}
            <strong style={{ color: T.text }}>Manage DNS</strong>,{' '}
            <strong style={{ color: T.text }}>DNS Management</strong> или{' '}
            <strong style={{ color: T.text }}>Zone Editor</strong>.
            Там ще видиш списък с DNS записи.
          </p>
          <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: T.radiusSm }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.7 }}>
              <strong style={{ color: '#7C2D12' }}>⚠️ Важно — изтрий съществуващите записи първо!</strong><br />
              Преди да добавиш новите стойности, провери дали в списъка вече има:{' '}
              <strong>CNAME запис с Host „www"</strong> или <strong>A запис с Host „@"</strong>.
              Ако имаш такива — <strong>изтрий ги</strong> (бутон "Delete" или "Remove" до тях).
              Само след това добавяй новите записи от Стъпка 3.
            </p>
          </div>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} title="Добави двата DNS записа" done={false}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            Натисни <strong style={{ color: T.text }}>"Добави нов запис"</strong> или{' '}
            <strong style={{ color: T.text }}>"Add Record"</strong> и добави{' '}
            <strong style={{ color: T.text }}>и двата записа по-долу</strong>{' '}
            (използвай бутона "Копирай" за да не сбъркаш):
          </p>

          {instructions.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {instructions.map((ins, i) => (
                <DnsRecordCard key={i} record={ins} copied={copied} onCopy={copyVal} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 14px', background: '#F4F4F5', borderRadius: T.radiusSm, fontSize: 13, color: T.muted }}>
              Инструкциите се зареждат…
            </div>
          )}

          {verifications.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                Освен горния запис, добави и верификационен запис (нужен е еднократно, за да потвърдим собствеността на домейна):
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {verifications.map((v, i) => (
                  <DnsRecordCard key={i} record={v} copied={copied} onCopy={copyVal} isVerification />
                ))}
              </div>
            </div>
          )}
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} title="Изчакай и провери" done={false}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            След като добавиш записите, промените се разпространяват из интернет.
            Обикновено отнема между{' '}
            <strong style={{ color: T.text }}>15 минути и 48 часа</strong>{' '}
            — зависи от регистратора. Не се притеснявай, ако не стане веднага.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.75 }}>
            Ние проверяваме автоматично на всеки няколко секунди. Можеш и ти да проверите ръчно:
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
            {busyKey === 'domain-refresh' ? 'Проверяваме…' : 'Провери сега'}
          </button>
          {isPending && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: T.subtle, lineHeight: 1.5 }}>
              Проверяваме автоматично. Страницата ще се обнови при успешно свързване.
            </p>
          )}
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#F0F4F8', border: `1px solid #BFDBFE`, borderRadius: T.radiusSm }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
              <strong style={{ color: '#1E3A8A' }}>ℹ "Not secure"?</strong> {' '}
              Браузъра казва това докато SSL сертификатът се издава (обикновено 5-30 мин след разпространение на DNS).
              Това е нормално и ще мине автоматично. Не делай нищо допълнително.
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

    // Small footer
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText('clicka.bg', W / 2, 920);

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
              background: 'linear-gradient(135deg, #e11d48 0%, #db2777 50%, #a855f7 100%)',
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

