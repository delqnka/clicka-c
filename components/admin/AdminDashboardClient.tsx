'use client';

import Link from 'next/link';
import {
  BriefcaseBusiness,
  MessageSquare,
  Plug,
  CalendarClock,
  Clock3,
  FileText,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Scissors,
  Tag,
  UserRound,
  Users,
  Save,
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
} from 'lucide-react';
import type { CSSProperties, DragEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminGalleryAddBtn } from '@/components/admin/admin-gallery-add-btn';
import { GalleryReorderGrid } from '@/components/admin/gallery-reorder-grid';
import { AddressAutocompleteField } from '@/components/admin/address-autocomplete-field';
import { SalonFaqVisitorFields } from '@/components/admin/salon-faq-visitor-fields';
import DomainPurchaseSection from '@/components/admin/DomainPurchaseSection';
import { PriceListServicesImport } from '@/components/admin/price-list-services-import';
import { SalonOffersSection } from '@/components/admin/SalonOffersSection';
import type { AdminSalonOffer } from '@/lib/salon-offers';
import type { AdminSitePayload, BookingRecord, WorkingHours } from '@/lib/admin-site';
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
  type LegalDocumentPath,
} from '@/lib/domain-routing';
import { LegalCustomDocumentsEditor } from '@/components/admin/legal-custom-documents-editor';
import { defaultLegalInfoStored, type LegalInfoStored } from '@/lib/legal-custom-documents';
import { LEGAL_DOCUMENT_LABELS } from '@/lib/legal-documents-shared';
import { formatSalonPrice } from '@/lib/salon-currency';
import {
  SMS_PACK_CREDITS,
  SMS_PACK_PRICE_EUR,
  smsCreditsPerBooking,
  type SmsReminderMode,
} from '@/lib/sms-shared';

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
  { id: 'services',      label: 'Услуги',         Icon: Scissors },
  { id: 'offers',        label: 'Оферти',         Icon: Tag },
  { id: 'hours',         label: 'Работно време',  Icon: Clock3 },
  { id: 'bookings',      label: 'Резервации',     Icon: CalendarClock },
  { id: 'clients',       label: 'Клиенти',        Icon: Users },
  { id: 'domain',        label: 'Домейн',         Icon: Globe },
  { id: 'integrations', label: 'Интеграции',     Icon: Plug },
  { id: 'sms',          label: 'SMS',            Icon: MessageSquare },
  { id: 'legal',         label: 'Правни',         Icon: FileText },
] as const;

const TAB_BAR_IDS = new Set<TabId>(['site', 'images', 'services', 'bookings', 'clients']);
const NAVBAR_TABS = TABS.filter(t => !TAB_BAR_IDS.has(t.id));
const TAB_BAR_TABS = TABS.filter(t => TAB_BAR_IDS.has(t.id));

const NAVBAR_GRADIENTS: Record<string, [string, string]> = {
  images:     ['#FF9966', '#FF5E62'],
  specialist: ['#a955ff', '#ea51ff'],
  hours:      ['#56CCF2', '#2F80ED'],
  offers:     ['#F97316', '#EF4444'],
  domain:     ['#80FF72', '#7EE8FA'],
  integrations: ['#6366F1', '#8B5CF6'],
  sms:        ['#22C55E', '#14B8A6'],
  legal:      ['#ffa9c6', '#f434e2'],
};

type TabId = (typeof TABS)[number]['id'];

type Props = {
  slug: string;
  ownerEmail: string;
  initialSite: AdminSitePayload;
  initialBookings: BookingRecord[];
};

type BookingStatus = BookingRecord['status'];
type ClientSummary = {
  key: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
};
type GoogleReviewsStatus = {
  loading: boolean;
  connected: boolean;
  count: number;
  source: 'openrouter' | 'none' | null;
  reason: string | null;
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

function ymdKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const CALENDAR_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function useIsMobileLayout(bp = 768) {
  const [m, setM] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${bp - 1}px)`).matches;
  });
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
export default function AdminDashboardClient({ slug, ownerEmail, initialSite, initialBookings }: Props) {
  const [site, setSite]           = useState(initialSite);
  const [bookings, setBookings]   = useState(initialBookings);
  const [activeTab, setActiveTab] = useState<TabId>('site');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [error, setError]         = useState('');
  const [notice, setNotice]       = useState('');
  const [busyKey, setBusyKey]     = useState('');
  const [googleReviewsStatus, setGoogleReviewsStatus] = useState<GoogleReviewsStatus>({
    loading: false,
    connected: false,
    count: 0,
    source: null,
    reason: null,
  });
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState(initialSite.customDomain);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton]   = useState(false);
  const [legalInfo, setLegalInfo] = useState<LegalInfoStored>(
    () => initialSite.legalInfo ?? defaultLegalInfoStored(),
  );
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalNotice, setLegalNotice] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [newServiceDraft, setNewServiceDraft] = useState({
    name: '',
    category: '',
    description: '',
    price: 0,
    duration_min: 30,
  });
  const [offers, setOffers] = useState<AdminSalonOffer[]>([]);
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
  const [galleryPending, setGalleryPending] = useState<Set<string>>(() => new Set());
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

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

  const filteredBookings = useMemo(() =>
    statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter),
    [bookings, statusFilter]
  );
  const visibleBookings = useMemo(
    () =>
      selectedCalendarDate
        ? filteredBookings.filter(b => String(b.date) === selectedCalendarDate)
        : filteredBookings,
    [filteredBookings, selectedCalendarDate]
  );
  const bookingsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of filteredBookings) {
      const key = String(b.date ?? '').trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [filteredBookings]);
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
    const map = new Map<string, ClientSummary>();
    for (const b of bookings) {
      const phone = String(b.client_phone ?? '').trim();
      const email = String(b.client_email ?? '').trim().toLowerCase();
      const name = String(b.client_name ?? '').trim();
      const key = email || phone || b.id;
      const spent = typeof b.service_price === 'number' ? b.service_price : 0;
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
  }, [bookings]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    let t = p.get('tab');
    if (t === 'notifications') t = p.get('smsPurchase') ? 'sms' : 'integrations';
    if (t && TABS.some(tab => tab.id === t)) setActiveTab(t as TabId);
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) { setShowInstallButton(true); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPromptEvent(e as BeforeInstallPromptEvent); setShowInstallButton(true); };
    const onInstalled = () => { setInstallPromptEvent(null); setShowInstallButton(false); setNotice('Приложението е добавено.'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

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
          source: null,
          reason: 'missing_place_id',
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
          source?: 'openrouter' | 'none';
          reason?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'probe_failed');
        setGoogleReviewsStatus({
          loading: false,
          connected: data.connected === true,
          count: Number(data.count ?? 0) || 0,
          source: data.source ?? 'none',
          reason: data.reason ?? null,
        });
      } catch {
        setGoogleReviewsStatus({
          loading: false,
          connected: false,
          count: 0,
          source: 'none',
          reason: 'probe_failed',
        });
      }
    },
    [hasGoogleReviewsCandidate, site.googleMapsUrl, site.googlePlaceId, slug],
  );

  useEffect(() => {
    if (activeTab !== 'integrations') return;
    void loadGoogleReviewsStatus();
  }, [activeTab, loadGoogleReviewsStatus]);

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
    if (activeTab !== 'offers') return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/site-offers?slug=${encodeURIComponent(slug)}`);
        const data = await readJson(res);
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Грешка');
        if (cancelled) return;
        const list = (data as { offers?: AdminSalonOffer[] }).offers;
        setOffers(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) handleErr(e);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, slug]);

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
        }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Информацията е запазена.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function saveSpecialist() {
    setError(''); setNotice(''); setBusyKey('specialist');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: site.ownerName, ownerPublicRole: site.ownerPublicRole, ownerPublicPhotoUrl: site.ownerPublicPhotoUrl }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Профилът е запазен.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function persistImages(
    payload: {
      coverImageUrl: string;
      logoImageUrl: string;
      galleryImages: string[];
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
    let coverImageUrl = payload.coverImageUrl;
    if (!coverImageUrl || coverImageUrl.startsWith('blob:')) {
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
          ownerPublicPhotoUrl: payload.ownerPublicPhotoUrl,
        }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      if (!opts?.silent) setNotice('Снимките са запазени.');
    } catch (e) {
      if (!opts?.silent) handleErr(e);
      else setError('Снимките са качени, но не успяхме да ги запазим. Натисни дискетата.');
    } finally {
      setBusyKey('');
    }
  }

  async function saveImages() {
    await persistImages({
      coverImageUrl: site.coverImageUrl,
      logoImageUrl: site.logoImageUrl,
      galleryImages: site.galleryImages,
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

  async function uploadSingleFile(file: File, opts?: { compress?: boolean }) {
    const prepared =
      opts?.compress === false ? file : await prepareImageForUpload(file, { maxDim: isMobile ? 1400 : 1600 });
    const fd = new FormData();
    fd.append('file', prepared);
    const res = await fetch(`/api/upload?slug=${encodeURIComponent(slug)}`, { method: 'POST', body: fd });
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
    if (!file) return; setBusyKey('upload-owner'); setError('');
    try { const url = await uploadSingleFile(file); setSite(p => ({ ...p, ownerPublicPhotoUrl: url })); setNotice('Снимката е качена. Натисни „Запази профила".'); }
    catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function handleGalleryUpload(
    files: FileList | File[] | null,
    input?: HTMLInputElement | null,
  ) {
    const images = imageFilesFromInput(files);
    if (!images.length) {
      setError('Моля, избери само изображения (JPG, PNG, WebP, GIF).');
      return;
    }

    const previews = images.map(file => ({
      file,
      blob: URL.createObjectURL(file),
    }));
    const blobUrls = previews.map(p => p.blob);

    setGalleryPending(prev => {
      const next = new Set(prev);
      blobUrls.forEach(b => next.add(b));
      return next;
    });
    setSite(p => {
      const stable = p.galleryImages.filter(u => !u.startsWith('blob:'));
      const nextGallery = [...stable, ...blobUrls];
      return {
        ...p,
        galleryImages: nextGallery,
        coverImageUrl: p.coverImageUrl && !p.coverImageUrl.startsWith('blob:')
          ? p.coverImageUrl
          : (nextGallery[0] ?? ''),
      };
    });

    setBusyKey('upload-gallery');
    setGalleryUploadProgress({ done: 0, total: images.length });
    setError('');

    const uploadedUrls: string[] = [];
    let progressDone = 0;

    try {
      await mapWithConcurrency(previews, isMobile ? 3 : 2, async ({ file, blob }) => {
        try {
          const url = await uploadSingleFile(file);
          uploadedUrls.push(url);
          setSite(p => ({
            ...p,
            galleryImages: p.galleryImages.map(u => (u === blob ? url : u)),
            coverImageUrl:
              !p.coverImageUrl || p.coverImageUrl === blob ? url : p.coverImageUrl,
          }));
        } catch (e) {
          setSite(p => ({
            ...p,
            galleryImages: p.galleryImages.filter(u => u !== blob),
          }));
          throw e;
        } finally {
          URL.revokeObjectURL(blob);
          setGalleryPending(prev => {
            const next = new Set(prev);
            next.delete(blob);
            return next;
          });
          progressDone += 1;
          setGalleryUploadProgress({ done: progressDone, total: images.length });
        }
      });

      let nextSite = site;
      setSite(p => {
        const galleryImages = p.galleryImages.filter(u => !u.startsWith('blob:'));
        const coverImageUrl =
          p.coverImageUrl && !p.coverImageUrl.startsWith('blob:')
            ? p.coverImageUrl
            : (galleryImages[0] ?? '');
        nextSite = { ...p, galleryImages, coverImageUrl };
        return nextSite;
      });

      if (isMobile) {
        await persistImages(
          {
            coverImageUrl: nextSite.coverImageUrl,
            logoImageUrl: nextSite.logoImageUrl,
            galleryImages: nextSite.galleryImages,
            ownerPublicPhotoUrl: nextSite.ownerPublicPhotoUrl,
          },
          { silent: true },
        );
        setNotice(
          uploadedUrls.length === 1
            ? 'Снимката е качена и запазена.'
            : `${uploadedUrls.length} снимки са качени и запазени.`,
        );
      } else {
        setNotice(
          uploadedUrls.length === 1
            ? 'Снимката е качена. Натисни „Запази снимките".'
            : `${uploadedUrls.length} снимки са качени. Натисни „Запази снимките".`,
        );
      }
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyKey('');
      setGalleryUploadProgress(null);
      if (input) input.value = '';
    }
  }

  async function runPriceListAnalysis(urls: string[]) {
    if (!urls.length) return;
    setPriceListAnalyzing(true);
    setError('');
    try {
      const extracted = await analyzePriceListImages(urls);
      if (!extracted.length) {
        setError('Не открихме услуги на снимката. Опитай с по-ясна снимка.');
        return;
      }
      let added = 0;
      setSite(p => {
        const merged = mergeServiceLists(p.services, extracted);
        added = merged.length - p.services.length;
        return { ...p, services: merged };
      });
      setNotice(
        added > 0
          ? `Добавени ${added} услуги от ценоразписа. Натисни „Запази".`
          : 'Услугите от ценоразписа вече са в списъка. Натисни „Запази", ако си правил промени.',
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

  async function installAsApp() {
    setError('');
    if (/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())) { setNotice('На iPhone: Share → Add to Home Screen.'); return; }
    if (!installPromptEvent) { setNotice('Инсталацията не е налична. Пробвай от Chrome.'); return; }
    await installPromptEvent.prompt();
    const r = await installPromptEvent.userChoice;
    if (r.outcome === 'accepted') { setNotice('Приложението се инсталира.'); setShowInstallButton(false); setInstallPromptEvent(null); }
  }

  /* ── Shared styles ── */
  const inp: CSSProperties = {
    width: '100%',
    padding: isMobile ? '14px 16px' : '9px 12px',
    minHeight: isMobile ? 48 : undefined,
    borderRadius: isMobile ? 14 : T.radiusSm,
    border: isMobile ? '1.5px solid transparent' : `1px solid ${T.border}`,
    background: isMobile ? '#F4F4F5' : T.surface,
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
    setSite((p) => ({
      ...p,
      services: [
        ...p.services,
        {
          name: newServiceDraft.name.trim(),
          category: newServiceDraft.category.trim(),
          description: newServiceDraft.description.trim(),
          price: Math.max(0, Number(newServiceDraft.price) || 0),
          duration_min: Math.max(5, Number(newServiceDraft.duration_min) || 30),
        },
      ],
    }));
    setNewServiceDraft({ name: '', category: '', description: '', price: 0, duration_min: 30 });
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
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      {/* Background grid + gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)', backgroundSize: '6rem 4rem' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle 800px at 100% 200px, #d5c5ff, transparent)' }} />
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
                background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(124,58,237,0.32)',
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
                  background: T.accent, color: '#fff',
                  padding: isMobile ? '8px 14px' : '6px 14px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
                background: isMobile ? '#F4F4F5' : 'transparent',
                textDecoration: 'none', color: T.muted,
                padding: isMobile ? 0 : '6px 12px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              <ExternalLink size={isMobile ? 16 : 13} />
              {!isMobile && <span style={{ marginLeft: 6 }}>Виж сайта</span>}
            </a>
            {showInstallButton && !isMobile && (
              <button type="button" onClick={() => void installAsApp()} style={btn('sm-ghost')}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setNavOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', animation: 'fadeIn 200ms ease' }} />
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 max(20px, env(safe-area-inset-bottom, 20px))',
              animation: 'slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: '70dvh', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', cursor: 'pointer' }}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setNavOpen(false); }}
              role="button"
              aria-label="Затвори менюто"
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D4D4D8' }} />
            </div>

            <div style={{ padding: '4px 16px 8px' }}>
              {NAVBAR_TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchTab(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 12px', borderRadius: 14, border: 'none',
                      background: active ? '#F4F4F5' : 'transparent',
                      color: T.text,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                      minHeight: 52,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: active ? 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)' : '#F4F4F5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'background 200ms ease',
                    }}>
                      <Icon size={20} strokeWidth={1.8} style={{ color: active ? '#fff' : '#000' }} />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: active ? 600 : 400, letterSpacing: '-0.01em' }}>{label}</span>
                    {active && <ChevronRight size={16} style={{ marginLeft: 'auto', color: T.subtle }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ margin: '0 16px', paddingTop: 12, borderTop: `1px solid #F4F4F5` }}>
              <a href={sitePublicUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', borderRadius: 12, textDecoration: 'none', color: T.muted, fontSize: 15 }}>
                <ExternalLink size={18} /> Виж сайта
              </a>
              {showInstallButton && (
                <button type="button" onClick={() => void installAsApp()} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', borderRadius: 12, border: 'none', background: 'none', color: T.muted, fontSize: 15, cursor: 'pointer', width: '100%' }}>
                  <Plus size={18} /> Добави на екрана
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Body layout ───────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>

        {/* ── Sidebar (desktop) ─────────────────────── */}
        {!isMobile && (
          <aside style={{
            width: 220, flexShrink: 0,
            position: 'sticky', top: 56, height: 'calc(100dvh - 56px)',
            overflowY: 'auto', borderRight: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '16px 10px',
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
                    padding: '9px 12px', borderRadius: T.radiusSm,
                    border: 'none', width: '100%', textAlign: 'left',
                    background: active ? '#F4F4F5' : 'transparent',
                    color: active ? T.text : T.muted,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'background 120ms, color 120ms',
                  }}
                >
                  <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />}
                </button>
              );
            })}

            {/* Sidebar footer */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <Link href={claimPath} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: T.radiusSm, textDecoration: 'none', color: T.muted, fontSize: 13 }}>
                <ExternalLink size={14} />
                Claim page
              </Link>
            </div>
          </aside>
        )}

        {/* ── Main content ──────────────────────────── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile
              ? '20px 20px calc(80px + env(safe-area-inset-bottom)) 20px'
              : '28px 32px 48px',
          }}
        >

          {/* Toast messages */}
          {error  && <Toast tone="error"   onDismiss={() => setError('')}>{error}</Toast>}
          {notice && <Toast tone="success" onDismiss={() => setNotice('')}>{notice}</Toast>}

          {/* ── Сайт ── */}
          {activeTab === 'site' && (
            <Section
              title="Сайт"
              desc="Основна информация, показвана в публичната страница."
              action={<button type="button" onClick={saveSiteSettings} style={btn('primary')} disabled={busyKey === 'site'}>{busyKey === 'site' ? 'Запазваме…' : 'Запази'}</button>}
            >
              <div style={grid2}>
                <Field label="Име на салона"><input value={site.name} onChange={e => setSite(p => ({ ...p, name: e.target.value }))} style={inp} /></Field>
                <Field label="Категория"><input value={site.category} onChange={e => setSite(p => ({ ...p, category: e.target.value }))} style={inp} /></Field>
                <Field label="Телефон"><input value={site.phone} onChange={e => setSite(p => ({ ...p, phone: e.target.value }))} style={inp} /></Field>
                <Field label="Имейл"><input value={site.email} readOnly style={{ ...inp, color: T.muted, cursor: 'default' }} /></Field>
                <Field label="Град"><input value={site.city} onChange={e => setSite(p => ({ ...p, city: e.target.value }))} style={inp} /></Field>
                <AddressAutocompleteField
                  label="Адрес"
                  value={site.address}
                  inputStyle={inp}
                  onChange={address => setSite(p => ({ ...p, address }))}
                  onSelect={({ address, city, lat, lng, googleMapsUrl }) =>
                    setSite(p => ({
                      ...p,
                      address,
                      city: city || p.city,
                      latitude: lat,
                      longitude: lng,
                      googleMapsUrl,
                    }))
                  }
                />
                <Field label="Instagram"><input value={site.instagram} onChange={e => setSite(p => ({ ...p, instagram: e.target.value }))} style={inp} /></Field>
                <Field label="Facebook"><input value={site.facebook} onChange={e => setSite(p => ({ ...p, facebook: e.target.value }))} style={inp} /></Field>
                <Field label="TikTok"><input value={site.tiktok} onChange={e => setSite(p => ({ ...p, tiktok: e.target.value }))} style={inp} /></Field>
                <Field label="Google Maps URL"><input value={site.googleMapsUrl} onChange={e => setSite(p => ({ ...p, googleMapsUrl: e.target.value }))} style={inp} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <GooglePlaceIdField
                  value={site.googlePlaceId}
                  onChange={googlePlaceId => setSite(p => ({ ...p, googlePlaceId }))}
                  isMobile={isMobile}
                  inputStyle={inp}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="За салона">
                  <textarea value={site.about} onChange={e => setSite(p => ({ ...p, about: e.target.value }))} style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} />
                </Field>
              </div>
              <SalonFaqVisitorFields
                faqItems={site.faqItems}
                visitorInfo={site.visitorInfo}
                visitorAdditionalInfo={site.visitorAdditionalInfo}
                inputStyle={inp}
                onChangeFaq={faqItems => setSite(p => ({ ...p, faqItems }))}
                onChangeVisitorInfo={visitorInfo => setSite(p => ({ ...p, visitorInfo }))}
                onChangeAdditionalInfo={visitorAdditionalInfo =>
                  setSite(p => ({ ...p, visitorAdditionalInfo }))
                }
              />
              {site.googleMapsUrl ? (
                <iframe
                  src={site.googleMapsUrl}
                  title="Локация на картата"
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: isMobile ? 160 : 200,
                    marginTop: 14,
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                  }}
                />
              ) : null}
            </Section>
          )}

          {/* ── Снимки ── */}
          {activeTab === 'images' && (
            <Section
              title="Снимки"
              desc={isMobile ? undefined : 'Cover, лого и галерия за публичния сайт.'}
              compact={isMobile}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <AdminGalleryAddBtn
                    busy={busyKey === 'upload-gallery'}
                    onUpload={handleGalleryUpload}
                  />
                  <AdminSaveBtn
                    label="Запази снимките"
                    busy={busyKey === 'images' || busyKey === 'images-auto'}
                    mobile={isMobile}
                    onClick={() => void saveImages()}
                  />
                </div>
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                  gap: isMobile ? 20 : 12,
                }}
              >
                <ImageAssetField
                  label="Cover"
                  uploadLabel="Качи cover"
                  busy={busyKey === 'upload-cover'}
                  mobile={isMobile}
                  imageUrl={site.coverImageUrl}
                  onUpload={files => void handleCoverUpload(files?.[0] ?? null)}
                >
                  {!isMobile && (
                    <input
                      value={site.coverImageUrl}
                      onChange={e => setSite(p => ({ ...p, coverImageUrl: e.target.value }))}
                      style={{ ...inp, marginTop: 6 }}
                      placeholder="https://…"
                    />
                  )}
                </ImageAssetField>

                <ImageAssetField
                  label="Лого"
                  uploadLabel="Качи лого"
                  busy={busyKey === 'upload-logo'}
                  mobile={isMobile}
                  imageUrl={site.logoImageUrl}
                  roundPreview
                  onUpload={files => void handleLogoUpload(files?.[0] ?? null)}
                >
                  {!isMobile && (
                    <input
                      value={site.logoImageUrl}
                      onChange={e => setSite(p => ({ ...p, logoImageUrl: e.target.value }))}
                      style={{ ...inp, marginTop: 6 }}
                      placeholder="https://…"
                    />
                  )}
                </ImageAssetField>
              </div>

              <div style={{ marginTop: isMobile ? 24 : 20 }}>
                <Field
                  label={
                    site.galleryImages.length > 0
                      ? isMobile
                        ? `Галерия · ${site.galleryImages.length}`
                        : `Галерия (${site.galleryImages.length} снимки)`
                      : 'Галерия'
                  }
                >
                  {galleryUploadProgress ? (
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.45 }}>
                      Качваме {galleryUploadProgress.done}/{galleryUploadProgress.total}…
                    </p>
                  ) : site.galleryImages.length > 0 ? (
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: T.subtle, lineHeight: 1.45 }}>
                      {isMobile
                        ? 'Снимките се появяват веднага; на телефон се запазват автоматично. Задръж ~0.5 сек. и плъзни за нов ред.'
                        : 'Задръж снимка ~0.5 сек., после плъзни за нов ред. Натисни дискетата, за да запазиш.'}
                    </p>
                  ) : null}
                  <GalleryDropZone busy={busyKey === 'upload-gallery'} mobile={isMobile} onUpload={handleGalleryUpload}>
                    {site.galleryImages.length > 0 ? (
                      <GalleryReorderGrid
                        images={site.galleryImages}
                        coverImageUrl={site.coverImageUrl}
                        isMobile={isMobile}
                        pendingUrls={galleryPending}
                        btnSmGhost={btn('sm-ghost')}
                        onReorder={next => {
                          setSite(p => ({ ...p, galleryImages: next }));
                          setNotice('Редът е променен. Натисни дискетата, за да запазиш.');
                        }}
                        onSetCover={url => setSite(p => ({ ...p, coverImageUrl: url }))}
                        onRemove={i =>
                          setSite(p => {
                            const removed = p.galleryImages[i];
                            const galleryImages = p.galleryImages.filter((_, j) => j !== i);
                            return {
                              ...p,
                              galleryImages,
                              coverImageUrl:
                                p.coverImageUrl === removed
                                  ? (galleryImages[0] ?? '')
                                  : p.coverImageUrl,
                            };
                          })
                        }
                      />
                    ) : (
                      <div
                        style={{
                          padding: isMobile ? '40px 20px' : '28px 16px',
                          textAlign: 'center',
                          border: isMobile ? 'none' : `1.5px dashed ${T.border}`,
                          borderRadius: isMobile ? 20 : 14,
                          background: isMobile ? '#FAFAFA' : 'transparent',
                          color: T.muted,
                          fontSize: isMobile ? 14 : 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {isMobile
                          ? 'Натисни + за да добавиш снимки'
                          : 'Няма снимки в галерията. Натисни зеления + или плъзни файлове тук.'
                        }
                      </div>
                    )}
                  </GalleryDropZone>
                </Field>
              </div>
            </Section>
          )}

          {/* ── Специалист ── */}
          {activeTab === 'specialist' && (
            <Section
              title="Специалист"
              desc='Захранва секцията „Вашият специалист" в сайта.'
              action={<button type="button" onClick={saveSpecialist} style={btn('primary')} disabled={busyKey === 'specialist'}>{busyKey === 'specialist' ? 'Запазваме…' : 'Запази профила'}</button>}
            >
              <div style={grid2}>
                <Field label="Име"><input value={site.ownerName} onChange={e => setSite(p => ({ ...p, ownerName: e.target.value }))} style={inp} /></Field>
                <Field label="Роля"><input value={site.ownerPublicRole} onChange={e => setSite(p => ({ ...p, ownerPublicRole: e.target.value }))} style={inp} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="Снимка на специалиста">
                  <FileUploadBtn label="Качи снимка" busy={busyKey === 'upload-owner'}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => void handleOwnerPhotoUpload(e.target.files?.[0] ?? null)} />
                  </FileUploadBtn>
                  <input value={site.ownerPublicPhotoUrl} onChange={e => setSite(p => ({ ...p, ownerPublicPhotoUrl: e.target.value }))} style={{ ...inp, marginTop: 6 }} placeholder="https://…" />
                  {site.ownerPublicPhotoUrl && <PreviewImg src={site.ownerPublicPhotoUrl} alt="Специалист" round />}
                </Field>
              </div>
            </Section>
          )}

          {/* ── Услуги ── */}
          {activeTab === 'services' && (
            <Section
              title="Услуги"
              desc={isMobile ? undefined : 'Управлявай услугите и категориите на салона.'}
              compact={isMobile}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    style={{
                      ...btn('ghost'),
                      border: 'none',
                      color: '#fff',
                      background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)',
                      boxShadow: '0 8px 20px rgba(124,58,237,0.28)',
                    }}
                    onClick={() => setServiceModalOpen(true)}
                  >
                    <Plus size={14} />
                    Добави услуга
                  </button>
                  <AdminSaveBtn
                    label="Запази услугите"
                    busy={busyKey === 'services'}
                    mobile={isMobile}
                    onClick={() => void saveServices()}
                  />
                </div>
              }
            >
              {site.services.length === 0 && !priceListAnalyzing ? (
                <EmptyState
                  title="Няма услуги"
                  desc="Добави първата си услуга от бутона горе."
                />
              ) : (
                <div style={{ display: 'grid', gap: isMobile ? 12 : 10 }}>
                  {Array.from(
                    site.services.reduce((map, svc, i) => {
                      const key = String((svc as { category?: string }).category ?? '').trim() || 'Без категория';
                      const arr = map.get(key) ?? [];
                      arr.push({ svc, i });
                      map.set(key, arr);
                      return map;
                    }, new Map<string, { svc: (typeof site.services)[number]; i: number }[]>())
                  ).map(([category, items]) => (
                    <div key={category} style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: '2px 2px 0', fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {category}
                      </p>
                      {items.map(({ svc, i }) => (
                        <div
                          key={`svc-${i}`}
                          style={{
                            border: 'none',
                            borderBottom: `1px solid ${T.border}`,
                            borderRadius: 0,
                            padding: isMobile ? '16px 0' : '14px 0',
                            background: 'transparent',
                            position: 'relative',
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Премахни услуга"
                            onClick={() =>
                              setSite((p) => ({ ...p, services: p.services.filter((_, j) => j !== i) }))
                            }
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: `1px solid ${T.border}`,
                              background: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#111',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={14} />
                          </button>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr auto auto auto',
                              gap: isMobile ? 10 : 10,
                              alignItems: 'end',
                            }}
                          >
                            <Field label="Услуга" style={isMobile ? { gridColumn: '1 / -1' } : undefined}>
                              <input
                                value={svc.name}
                                onChange={e =>
                                  setSite(p => ({
                                    ...p,
                                    services: p.services.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)),
                                  }))
                                }
                                style={svcInp}
                                placeholder="Напр. Подстригване"
                              />
                            </Field>
                            <Field label="Категория" style={isMobile ? { gridColumn: '1 / -1' } : undefined}>
                              <input
                                value={(svc as { category?: string }).category ?? ''}
                                onChange={e =>
                                  setSite(p => ({
                                    ...p,
                                    services: p.services.map((s, j) => (j === i ? { ...s, category: e.target.value } : s)),
                                  }))
                                }
                                style={svcInp}
                                placeholder="Напр. Коса"
                              />
                            </Field>
                            <Field label="Описание" style={isMobile ? { gridColumn: '1 / -1' } : { gridColumn: '1 / -1' }}>
                              <input
                                value={(svc as { description?: string }).description ?? ''}
                                onChange={e =>
                                  setSite(p => ({
                                    ...p,
                                    services: p.services.map((s, j) => (j === i ? { ...s, description: e.target.value } : s)),
                                  }))
                                }
                                style={svcInp}
                                placeholder="Кратко описание на услугата"
                              />
                            </Field>
                            <Field label="Цена (€)">
                              <input
                                type="number"
                                value={svc.price}
                                onChange={e =>
                                  setSite(p => ({
                                    ...p,
                                    services: p.services.map((s, j) => (j === i ? { ...s, price: Number(e.target.value) || 0 } : s)),
                                  }))
                                }
                                style={{ ...svcInp, width: isMobile ? '100%' : 80 }}
                              />
                            </Field>
                            <Field label="Мін">
                              <input
                                type="number"
                                value={svc.duration_min}
                                onChange={e =>
                                  setSite(p => ({
                                    ...p,
                                    services: p.services.map((s, j) => (j === i ? { ...s, duration_min: Number(e.target.value) || 30 } : s)),
                                  }))
                                }
                                style={{ ...svcInp, width: isMobile ? '100%' : 70 }}
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {activeTab === 'offers' && (
            <Section
              title="Оферти"
              desc="Специални промоции на сайта — снимки, описание, лимит на резервации и отделен модал за записване."
              compact={isMobile}
            >
              <SalonOffersSection
                offers={offers}
                isMobile={isMobile}
                busyKey={busyKey}
                inp={inp}
                btn={btn}
                onChange={setOffers}
                onUploadImages={handleOfferImagesUpload}
                onSave={saveOffers}
              />
            </Section>
          )}

          {activeTab === 'services' && serviceModalOpen ? (
            <div
              role="presentation"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                overflow: 'hidden',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                padding: isMobile ? 0 : 16,
              }}
              onClick={() => setServiceModalOpen(false)}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.36)' }} aria-hidden />
              <div
                role="dialog"
                aria-modal
                aria-labelledby="add-service-modal-title"
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 520,
                  maxHeight: isMobile ? 'min(92dvh, 100%)' : 'calc(100dvh - 32px)',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: isMobile ? '20px 20px 0 0' : 16,
                  background: '#fff',
                  border: `1px solid ${T.border}`,
                  overflow: 'hidden',
                  ...(isMobile ? { marginTop: 'auto' } : {}),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    padding: 16,
                  }}
                >
                  <p id="add-service-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
                    Добави услуга
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <PriceListServicesImport
                      compact
                      urls={priceListUrls}
                      busy={busyKey === 'upload-pricelist'}
                      analyzing={priceListAnalyzing}
                      isMobile={isMobile}
                      onUpload={handlePriceListUpload}
                      onRemove={removePriceListAt}
                      onReanalyze={() => void runPriceListAnalysis(priceListUrls)}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    <Field label="Име"><input style={inp} value={newServiceDraft.name} onChange={(e) => setNewServiceDraft((p) => ({ ...p, name: e.target.value }))} /></Field>
                    <Field label="Категория"><input style={inp} value={newServiceDraft.category} onChange={(e) => setNewServiceDraft((p) => ({ ...p, category: e.target.value }))} /></Field>
                    <Field label="Описание"><input style={inp} value={newServiceDraft.description} onChange={(e) => setNewServiceDraft((p) => ({ ...p, description: e.target.value }))} /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Field label="Цена (€)"><input type="number" style={inp} value={newServiceDraft.price} onChange={(e) => setNewServiceDraft((p) => ({ ...p, price: Number(e.target.value) || 0 }))} /></Field>
                      <Field label="Мин"><input type="number" style={inp} value={newServiceDraft.duration_min} onChange={(e) => setNewServiceDraft((p) => ({ ...p, duration_min: Number(e.target.value) || 30 }))} /></Field>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
                    borderTop: `1px solid ${T.border}`,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    background: '#fff',
                  }}
                >
                  <button type="button" style={btn('ghost')} onClick={() => setServiceModalOpen(false)}>Отказ</button>
                  <button
                    type="button"
                    style={{ ...btn('primary'), border: 'none', background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)' }}
                    onClick={() => {
                      if (!newServiceDraft.name.trim()) return;
                      addManualService();
                    }}
                  >
                    Добави
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Работно време ── */}
          {activeTab === 'hours' && (
            <Section
              title="Работно време"
              desc="Настрой часовете и блокирай конкретни дни/часове."
              action={<button type="button" onClick={saveHours} style={btn('primary')} disabled={busyKey === 'hours'}>{busyKey === 'hours' ? 'Запазваме…' : 'Запази'}</button>}
            >
              <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
                {DAYS.map(day => {
                  const d = site.workingHours[day.key];
                  return (
                    <div key={day.key} style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '130px 1fr auto auto',
                      gap: isMobile ? 12 : 10,
                      alignItems: 'center',
                      padding: isMobile ? '16px 18px' : '12px 14px',
                      border: isMobile ? 'none' : `1px solid ${T.border}`,
                      borderRadius: isMobile ? 18 : T.radiusSm,
                      background: T.surface,
                      boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                      opacity: d.closed ? 0.5 : 1,
                      transition: 'opacity 200ms ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobile ? 16 : 14, fontWeight: isMobile ? 600 : 500, letterSpacing: '-0.01em' }}>{day.label}</span>
                        {isMobile && (
                          <button
                            type="button"
                            onClick={() => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], closed: !d.closed } } }))}
                            style={{
                              width: 48, height: 28, borderRadius: 14, border: 'none',
                              background: d.closed ? '#E5E7EB' : T.accent,
                              position: 'relative', cursor: 'pointer',
                              transition: 'background 200ms ease',
                            }}
                          >
                            <div style={{
                              width: 22, height: 22, borderRadius: 11,
                              background: '#fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              position: 'absolute', top: 3,
                              left: d.closed ? 3 : 23,
                              transition: 'left 200ms ease',
                            }} />
                          </button>
                        )}
                      </div>
                      {!d.closed && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="time" value={d.open} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], open: e.target.value } } }))} style={{ ...inp, width: 'auto', flex: 1 }} />
                          <span style={{ color: T.muted, fontSize: 13 }}>–</span>
                          <input type="time" value={d.close} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], close: e.target.value } } }))} style={{ ...inp, width: 'auto', flex: 1 }} />
                        </div>
                      )}
                      {d.closed && isMobile && (
                        <span style={{ fontSize: 14, color: T.subtle }}>Почивен ден</span>
                      )}
                      {!isMobile && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.muted, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                          <input type="checkbox" checked={d.closed} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], closed: e.target.checked } } }))} />
                          Почивен
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: T.text }}>
                  Изключения (блокирани дни и часове)
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {site.bookingBlocks.map((block, i) => (
                    <div
                      key={`${block.date}-${block.start ?? 'allday'}-${i}`}
                      style={{
                        border: isMobile ? 'none' : `1px solid ${T.border}`,
                        borderRadius: isMobile ? 16 : T.radiusSm,
                        padding: isMobile ? '14px 14px' : '10px 12px',
                        background: T.surface,
                        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '160px 110px 110px auto', gap: 8 }}>
                        <input
                          type="date"
                          value={block.date}
                          onChange={(e) =>
                            setSite((p) => ({
                              ...p,
                              bookingBlocks: p.bookingBlocks.map((b, j) =>
                                j === i ? { ...b, date: e.target.value } : b
                              ),
                            }))
                          }
                          style={inp}
                        />
                        <input
                          type="time"
                          value={block.start ?? ''}
                          onChange={(e) =>
                            setSite((p) => ({
                              ...p,
                              bookingBlocks: p.bookingBlocks.map((b, j) =>
                                j === i ? { ...b, allDay: false, start: e.target.value || '00:00' } : b
                              ),
                            }))
                          }
                          disabled={block.allDay}
                          style={inp}
                        />
                        <input
                          type="time"
                          value={block.end ?? ''}
                          onChange={(e) =>
                            setSite((p) => ({
                              ...p,
                              bookingBlocks: p.bookingBlocks.map((b, j) =>
                                j === i ? { ...b, allDay: false, end: e.target.value || '23:59' } : b
                              ),
                            }))
                          }
                          disabled={block.allDay}
                          style={inp}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: isMobile ? '1 / -1' : undefined }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted }}>
                            <input
                              type="checkbox"
                              checked={block.allDay}
                              onChange={(e) =>
                                setSite((p) => ({
                                  ...p,
                                  bookingBlocks: p.bookingBlocks.map((b, j) =>
                                    j === i
                                      ? e.target.checked
                                        ? { ...b, allDay: true, start: undefined, end: undefined }
                                        : { ...b, allDay: false, start: b.start || '09:00', end: b.end || '10:00' }
                                      : b
                                  ),
                                }))
                              }
                            />
                            Цял ден
                          </label>
                          <button
                            type="button"
                            style={{ ...btn('ghost'), color: '#EF4444', padding: '6px 10px' }}
                            onClick={() =>
                              setSite((p) => ({
                                ...p,
                                bookingBlocks: p.bookingBlocks.filter((_, j) => j !== i),
                              }))
                            }
                          >
                            Премахни
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    style={{ ...btn('ghost'), justifyContent: 'center' }}
                    onClick={() => {
                      const today = new Date();
                      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      setSite((p) => ({
                        ...p,
                        bookingBlocks: [...p.bookingBlocks, { date, allDay: true }],
                      }));
                    }}
                  >
                    <Plus size={14} />
                    Добави блокиран ден/часове
                  </button>
                </div>
              </div>
            </Section>
          )}

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
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | BookingStatus)} style={{ ...inp, width: 'auto', paddingRight: 28, cursor: 'pointer' }}>
                      <option value="all">Всички</option>
                      <option value="pending">Чакащи</option>
                      <option value="confirmed">Потвърдени</option>
                      <option value="completed">Завършени</option>
                      <option value="cancelled">Отказани</option>
                    </select>
                  ) : null}
                </div>
              }
            >
              {/* Mobile filter chips */}
              {isMobile && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                  {([['all', 'Всички'], ['pending', 'Чакащи'], ['confirmed', 'Потвърдени'], ['completed', 'Завършени'], ['cancelled', 'Отказани']] as const).map(([val, lbl]) => {
                    const isActive = statusFilter === val;
                    const count = val === 'all' ? bookings.length : bookings.filter(b => b.status === val).length;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setStatusFilter(val)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px',
                          borderRadius: 100, border: 'none',
                          background: isActive ? T.accent : '#F4F4F5',
                          color: isActive ? '#fff' : T.muted,
                          fontSize: 13, fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {lbl}
                        {count > 0 && <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  marginBottom: 14,
                  border: isMobile ? 'none' : `1px solid ${T.border}`,
                  borderRadius: isMobile ? 18 : 14,
                  background: T.surface,
                  padding: isMobile ? '14px 14px 12px' : '14px 16px',
                  boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    style={{ ...btn('ghost'), padding: '6px 10px' }}
                  >
                    ←
                  </button>
                  <p style={{ margin: 0, fontSize: isMobile ? 15 : 14, fontWeight: 700, textTransform: 'capitalize' }}>
                    {calendarMonthLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    style={{ ...btn('ghost'), padding: '6px 10px' }}
                  >
                    →
                  </button>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
                  {CALENDAR_DAY_NAMES.map((day) => (
                    <div key={day} style={{ textAlign: 'center', fontSize: 11, color: T.subtle, fontWeight: 700 }}>
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: calendarMeta.mondayFirstOffset }).map((_, i) => (
                    <div key={`offset-${i}`} />
                  ))}
                  {Array.from({ length: calendarMeta.daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const key = ymdKey(calendarMeta.year, calendarMeta.month, day);
                    const count = bookingsCountByDate.get(key) ?? 0;
                    const active = selectedCalendarDate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedCalendarDate(prev => (prev === key ? null : key))}
                        style={{
                          border: 'none',
                          borderRadius: 12,
                          minHeight: 42,
                          background: active ? T.accent : count > 0 ? '#4F46E5' : '#F4F4F5',
                          color: active || count > 0 ? '#fff' : T.text,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '6px 4px',
                        }}
                      >
                        <div>{day}</div>
                        {count > 0 ? <div style={{ fontSize: 10, opacity: 0.85 }}>{count}</div> : null}
                      </button>
                    );
                  })}
                </div>
                {selectedCalendarDate ? (
                  <p style={{ margin: '10px 2px 0', fontSize: 12, color: T.muted }}>
                    Филтър: {formatBgDateDMY(selectedCalendarDate)}{' '}
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate(null)}
                      style={{ border: 'none', background: 'none', color: T.accent, cursor: 'pointer', padding: 0 }}
                    >
                      (изчисти)
                    </button>
                  </p>
                ) : null}
              </div>

              {visibleBookings.length === 0 ? (
                <EmptyState title="Няма резервации" desc="Когато клиент резервира през сайта, ще я видиш тук." />
              ) : (
                <div style={{ display: 'grid', gap: isMobile ? 12 : 8 }}>
                  {visibleBookings.map(b => {
                    const cfg = STATUS_CFG[b.status];
                    return (
                      <div key={b.id} style={{
                        border: isMobile ? 'none' : `1px solid ${T.border}`,
                        borderRadius: isMobile ? 18 : T.radiusSm,
                        padding: isMobile ? '16px 18px' : '14px 16px',
                        background: T.surface,
                        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{b.client_name}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 600 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                {cfg.label}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: isMobile ? 14 : 13, color: T.text, lineHeight: 1.5, fontWeight: 500 }}>
                              {b.service_name}
                              {typeof b.service_price === 'number' ? ` · ${formatSalonPrice(b.service_price)}` : ''}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                              {formatBgDateDMY(b.date)} · {b.time}
                              {typeof b.service_duration === 'number' ? ` · ${b.service_duration} мин` : ''}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: T.subtle }}>
                              {b.client_phone}
                              {b.client_email ? ` · ${b.client_email}` : ''}
                            </p>
                            {b.notes && <p style={{ margin: '6px 0 0', fontSize: 12, color: T.subtle, fontStyle: 'italic' }}>{b.notes}</p>}
                          </div>
                          <select
                            value={b.status}
                            onChange={e => void updateBookingStatus(b.id, e.target.value as BookingStatus)}
                            style={{
                              ...inp,
                              width: isMobile ? '100%' : 'auto',
                              cursor: 'pointer', flexShrink: 0,
                              marginTop: isMobile ? 8 : 0,
                              background: isMobile ? '#F4F4F5' : T.surface,
                              textAlign: 'center',
                            }}
                          >
                            <option value="pending">Чакаща</option>
                            <option value="confirmed">Потвърдена</option>
                            <option value="completed">Завършена</option>
                            <option value="cancelled">Отказана</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              {clients.length === 0 ? (
                <EmptyState title="Няма клиенти" desc="Когато имаш резервации, тук ще се появят клиентите ти." />
              ) : (
                <div style={{ display: 'grid', gap: isMobile ? 12 : 8 }}>
                  {clients.map(client => (
                    <div
                      key={client.key}
                      style={{
                        border: isMobile ? 'none' : `1px solid ${T.border}`,
                        borderRadius: isMobile ? 18 : T.radiusSm,
                        padding: isMobile ? '16px 18px' : '14px 16px',
                        background: T.surface,
                        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 600 }}>{client.name}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>
                            {client.phone || 'Няма телефон'}
                            {client.email ? ` · ${client.email}` : ''}
                          </p>
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: T.subtle }}>
                            Последна резервация: {new Date(client.lastVisit).toLocaleString('bg-BG', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, color: T.subtle }}>Посещения</p>
                          <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{client.visits}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
                            {formatSalonPrice(client.totalSpent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          {/* ── Правни документи ── */}
          {activeTab === 'legal' && (
            <Section title="Правни документи" desc="Попълни фирмените данни за автоматични шаблони или включи собствен текст за условия, GDPR и бисквитки.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Официално наименование на фирмата</label>
                  <input
                    style={inp}
                    value={legalInfo.companyName}
                    onChange={e => setLegalInfo(p => ({ ...p, companyName: e.target.value }))}
                    placeholder="напр. Ню Лукс ООД"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4 }}>ЕИК / Булстат</label>
                  <input
                    style={inp}
                    value={legalInfo.eik}
                    onChange={e => setLegalInfo(p => ({ ...p, eik: e.target.value }))}
                    placeholder="напр. 123456789"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4 }}>МОЛ (материалноотговорно лице / управител)</label>
                  <input
                    style={inp}
                    value={legalInfo.managerName}
                    onChange={e => setLegalInfo(p => ({ ...p, managerName: e.target.value }))}
                    placeholder="напр. Деляна Иванова"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Адрес на управление</label>
                  <input
                    style={inp}
                    value={legalInfo.address}
                    onChange={e => setLegalInfo(p => ({ ...p, address: e.target.value }))}
                    placeholder="напр. гр. София, ул. Витоша 1"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4 }}>Имейл за връзка (за правни документи)</label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    style={inp}
                    value={legalInfo.contactEmail}
                    onChange={e => setLegalInfo(p => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="напр. info@salon.bg"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={saveLegalInfo}
                    disabled={legalSaving}
                    style={{ ...btn('primary'), opacity: legalSaving ? 0.6 : 1 }}
                  >
                    {legalSaving ? 'Запазване…' : 'Запази'}
                  </button>
                  {legalNotice && (
                    <span style={{ fontSize: 13, color: legalNotice.includes('Грешка') ? '#EF4444' : '#047857' }}>{legalNotice}</span>
                  )}
                </div>
                <div style={{ padding: '12px 14px', borderRadius: T.radiusSm, background: '#F4F4F5', marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    След запазване документите са публични на{' '}
                    <strong style={{ color: T.text }}>{publicSiteHost}</strong>
                    {isSalonCustomDomainLive(site.domainStatus) ? ' (свързаният ти домейн)' : ''}:
                  </p>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none', fontSize: 13, color: T.muted, lineHeight: 1.85 }}>
                    {legalDocLinks.map(({ kind, url }) => (
                      <li key={kind}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: T.accent, fontWeight: 500, wordBreak: 'break-all' }}
                        >
                          {url}
                        </a>
                        <span style={{ color: T.subtle }}> — {LEGAL_DOCUMENT_LABELS[kind]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <LegalCustomDocumentsEditor
                  value={legalInfo.customDocuments}
                  inputStyle={inp}
                  onChange={customDocuments => setLegalInfo(p => ({ ...p, customDocuments }))}
                />
              </div>
            </Section>
          )}

          {/* ── Интеграции ── */}
          {activeTab === 'integrations' && (
            <Section title="Интеграции" desc="Telegram известия и Google отзиви на сайта.">
              <div style={{ display: 'grid', gap: 10 }}>
                {/* Telegram */}
                <InfoCard
                  title="Telegram"
                  status={site.telegramChatId ? 'connected' : 'pending'}
                >
                  {site.telegramChatId ? (
                    <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Telegram е свързан. Ще получаваш известия при нова резервация.</p>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                        Отвори{' '}
                        <a href="https://t.me/clicka_booking_bot" target="_blank" rel="noreferrer" style={{ color: T.text, fontWeight: 600 }}>@clicka_booking_bot</a>
                        {' '}в Telegram и изпрати:
                      </p>
                      {site.onboardingCode ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`/start ${site.onboardingCode}`).catch(() => null);
                            setBusyKey('copied-tg');
                            setTimeout(() => setBusyKey(k => k === 'copied-tg' ? '' : k), 2000);
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 10, padding: '10px 14px', borderRadius: T.radiusSm, background: '#F4F4F5', border: 'none', cursor: 'pointer', transition: 'background 150ms' }}
                        >
                          <code style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                            /start {site.onboardingCode}
                          </code>
                          {busyKey === 'copied-tg'
                            ? <Check size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                            : <Copy size={15} style={{ color: T.muted, flexShrink: 0 }} />
                          }
                        </button>
                      ) : (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: T.subtle }}>Кодът се генерира при активиране на акаунта.</p>
                      )}
                    </>
                  )}
                </InfoCard>

                <InfoCard
                  title="Google Reviews"
                  status={googleReviewsStatus.connected ? 'connected' : 'pending'}
                >
                  <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    {hasGoogleReviewsCandidate
                      ? googleReviewsStatus.loading
                        ? 'Проверяваме през OpenRouter (може да отнеме до половин минута)...'
                        : googleReviewsStatus.connected
                          ? `Ревютата са активни (${googleReviewsStatus.count}) чрез OpenRouter. Запази в „Сайт“, ако още не си.`
                          : googleReviewsStatus.reason === 'missing_openrouter_key'
                            ? 'Липсва OPENROUTER_API_KEY на сървъра — без него отзивите не се зареждат.'
                            : googleReviewsStatus.reason === 'openrouter_api_error'
                              ? 'OpenRouter върна грешка. Провери ключа и модела (OPENROUTER_REVIEWS_MODEL).'
                              : googleReviewsStatus.reason === 'probe_failed'
                                ? 'Неуспешна проверка. Опитай отново или провери дали си влязъл в админ панела.'
                                : 'Не успяхме да заредим отзиви. Провери Place ID / Maps линка и натисни „Обнови статуса“.'
                      : (
                        <>
                          Добави Google Place ID или Maps линк в раздел <strong>Сайт</strong> — виж{' '}
                          <a
                            href={GOOGLE_PLACE_ID_FINDER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: T.accent, fontWeight: 600 }}
                          >
                            Place ID Finder
                          </a>
                          .
                        </>
                      )}
                  </p>
                  {hasGoogleReviewsCandidate ? (
                    <button
                      type="button"
                      onClick={() => void loadGoogleReviewsStatus({ cacheBust: true })}
                      disabled={googleReviewsStatus.loading}
                      style={{
                        ...btn('sm-ghost'),
                        marginTop: 8,
                        opacity: googleReviewsStatus.loading ? 0.65 : 1,
                        cursor: googleReviewsStatus.loading ? 'wait' : 'pointer',
                      }}
                    >
                      {googleReviewsStatus.loading ? (
                        <>
                          <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: -2, animation: 'spin 1s linear infinite' }} />
                          Обновяваме…
                        </>
                      ) : (
                        'Обнови статуса'
                      )}
                    </button>
                  ) : null}
                </InfoCard>
              </div>
            </Section>
          )}

          {/* ── SMS ── */}
          {activeTab === 'sms' && (
            <Section title="SMS" desc="Напомняния към клиенти преди резервация и покупка на пакети.">
              <div style={{ display: 'grid', gap: 10 }}>
                <InfoCard
                  title="SMS напомняния"
                  status={site.smsEnabled && site.smsBalance > 0 ? 'connected' : 'pending'}
                >
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>
                        {site.smsBalance}
                      </span>
                      <span style={{ fontSize: 14, color: T.muted }}>налични SMS</span>
                      {smsPanelLoading ? (
                        <span style={{ fontSize: 12, color: T.subtle }}>Обновяваме…</span>
                      ) : null}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
                      Пакет: <strong>{SMS_PACK_CREDITS} SMS за {SMS_PACK_PRICE_EUR} €</strong>.
                      При режим „24ч + 1ч“ всяка резервация използва <strong>2 SMS</strong>.
                      При „1 час“ — <strong>1 SMS</strong>. При 0 баланс изпращането спира автоматично.
                    </p>
                    {smsPendingReminders > 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: T.subtle }}>
                        Планирани напомняния: {smsPendingReminders}
                      </p>
                    ) : null}

                    <div style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.text }}>Кога да изпращаме</p>
                      {(
                        [
                          { id: 'off' as const, label: 'Изключено' },
                          { id: '1h' as const, label: '1 час преди часа' },
                          { id: '24h_and_1h' as const, label: '24 часа + 1 час преди' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            color: T.text,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="sms-mode"
                            checked={smsDraftMode === opt.id}
                            onChange={() => {
                              setSmsDraftMode(opt.id);
                              if (opt.id !== 'off') setSmsDraftEnabled(true);
                              if (opt.id === 'off') setSmsDraftEnabled(false);
                            }}
                          />
                          {opt.label}
                          {opt.id !== 'off' ? (
                            <span style={{ color: T.subtle }}>
                              ({smsCreditsPerBooking(opt.id)} SMS / резервация)
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => void saveSmsSettings()}
                        style={btn('primary')}
                        disabled={busyKey === 'sms-settings'}
                      >
                        {busyKey === 'sms-settings' ? 'Запазваме…' : 'Запази SMS настройки'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void buySmsPack()}
                        style={btn('ghost')}
                        disabled={busyKey === 'sms-checkout'}
                      >
                        {busyKey === 'sms-checkout'
                          ? 'Пренасочваме…'
                          : `Купи ${SMS_PACK_CREDITS} SMS (${SMS_PACK_PRICE_EUR} €)`}
                      </button>
                    </div>

                    {smsTransactions.length > 0 ? (
                      <div style={{ marginTop: 4 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.text }}>
                          Последна активност
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                          {smsTransactions.slice(0, 8).map((tx) => (
                            <li
                              key={tx.id}
                              style={{
                                fontSize: 12,
                                color: T.muted,
                                borderTop: `1px solid ${T.border}`,
                                paddingTop: 6,
                              }}
                            >
                              <span style={{ color: tx.delta > 0 ? '#16a34a' : T.text, fontWeight: 600 }}>
                                {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                              </span>
                              {' · '}
                              {tx.note || tx.kind}
                              {tx.client_phone ? ` · ${tx.client_phone}` : ''}
                              {' · '}
                              {new Date(tx.created_at).toLocaleString('bg-BG')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </InfoCard>
              </div>
            </Section>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ────────────────────── */}
      {isMobile && (
        <nav aria-label="Навигация" style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}>
            {TAB_BAR_TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id && !navOpen;
              return (
                <button key={id} type="button" onClick={() => switchTab(id)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '12px 4px 6px', border: 'none', background: 'transparent',
                    color: '#000',
                    cursor: 'pointer', minHeight: 58,
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative',
                  }}>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: active ? 34 : 28,
                      height: active ? 34 : 28,
                      borderRadius: 999,
                      background: active ? 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)' : 'transparent',
                      color: active ? '#fff' : '#000',
                      boxShadow: active ? '0 8px 20px rgba(124,58,237,0.35)' : 'none',
                      transition: 'all 180ms ease',
                    }}
                  >
                    <Icon size={active ? 22 : 20} strokeWidth={active ? 2.3 : 1.5} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '-0.01em', color: '#000' }}>{label.split(' ')[0]}</span>
                  {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 3, borderRadius: 3, background: 'linear-gradient(135deg, #FF4FD8 0%, #7C3AED 100%)' }} />}
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
        .admin-mobile-root button:active {
          transform: scale(0.97);
        }
      `}</style>
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
  onClick,
}: {
  label: string;
  busy: boolean;
  mobile: boolean;
  onClick: () => void;
}) {
  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={label}
        title={label}
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          border: 'none',
          background: T.accent,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(24,24,27,0.18)',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
      >
        {busy ? <RefreshCw size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} strokeWidth={2.25} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        border: 'none',
        background: T.accent,
        color: '#fff',
        padding: '7px 14px',
        fontSize: 13,
        fontWeight: 600,
        cursor: busy ? 'wait' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {busy ? <RefreshCw size={14} /> : <Save size={14} strokeWidth={2.25} />}
      {busy ? 'Запазваме…' : label}
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

const GOOGLE_PLACE_ID_FINDER_URL =
  'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder';

function GooglePlaceIdField({
  value,
  onChange,
  isMobile,
  inputStyle,
}: {
  value: string;
  onChange: (googlePlaceId: string) => void;
  isMobile: boolean;
  inputStyle: CSSProperties;
}) {
  return (
    <Field label="Google Place ID">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ChIJ…"
        style={inputStyle}
        autoComplete="off"
        spellCheck={false}
      />
      <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.55, color: T.subtle }}>
        Тук се показват Google отзивите на сайта ти и се изпращат покани за отзив. Открий ID в{' '}
        <a
          href={GOOGLE_PLACE_ID_FINDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.accent, fontWeight: 600, textDecoration: 'underline' }}
        >
          Google Place ID Finder
        </a>
        — попълни адреса на салона на картата и копирай стойността от прозореца (обикновено започва с{' '}
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>ChIJ</span>).
      </p>
      <a
        href={GOOGLE_PLACE_ID_FINDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Отвори Google Place ID Finder — инструкция с карта"
        style={{ display: 'block', marginTop: 10, maxWidth: isMobile ? '100%' : 520 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/google-place-id-guide.png"
          alt="Пример: попълваш адреса на салона в Google Place ID Finder и копираш Place ID от прозореца на картата"
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            display: 'block',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        />
      </a>
    </Field>
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
        bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
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
              Не е нужно да разбираш от технически термини — ще обясним всичко на разбираем език.
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
                  style={btn('primary')}
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

