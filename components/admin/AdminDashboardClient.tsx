'use client';

import Link from 'next/link';
import {
  BriefcaseBusiness,
  Bell,
  CalendarClock,
  Clock3,
  Globe,
  Image as ImageIcon,
  Scissors,
  UserRound,
  ExternalLink,
  LogOut,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  ChevronRight,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import DomainPurchaseSection from '@/components/admin/DomainPurchaseSection';
import type { AdminSitePayload, BookingRecord, WorkingHours } from '@/lib/admin-site';
import { getHostAwareSalonPath, getPlatformPublicUrl } from '@/lib/domain-routing';

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
  { id: 'hours',         label: 'Работно време',  Icon: Clock3 },
  { id: 'bookings',      label: 'Резервации',     Icon: CalendarClock },
  { id: 'domain',        label: 'Домейн',         Icon: Globe },
  { id: 'notifications', label: 'Известия',       Icon: Bell },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  slug: string;
  ownerEmail: string;
  initialSite: AdminSitePayload;
  initialBookings: BookingRecord[];
};

type BookingStatus = BookingRecord['status'];

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

function useIsMobileLayout(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
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
  bg:       '#F5F4F1',
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
  const [domainInput, setDomainInput] = useState(initialSite.customDomain);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton]   = useState(false);

  const isMobile = useIsMobileLayout();
  const currentHost   = typeof window !== 'undefined' ? window.location.host : null;
  const sitePath      = getHostAwareSalonPath({ host: currentHost, slug });
  const claimPath     = getHostAwareSalonPath({ host: currentHost, slug, path: 'claim' });
  const signInPath    = getHostAwareSalonPath({ host: currentHost, slug, path: 'admin/sign-in' });
  const domainMeta    = getDomainMeta(site);

  const filteredBookings = useMemo(() =>
    statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter),
    [bookings, statusFilter]
  );

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab');
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

  async function saveSiteSettings() {
    setError(''); setNotice(''); setBusyKey('site');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: site.name, category: site.category, phone: site.phone, city: site.city, address: site.address, about: site.about, instagram: site.instagram, facebook: site.facebook, tiktok: site.tiktok, googleMapsUrl: site.googleMapsUrl, googlePlaceId: site.googlePlaceId }),
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

  async function saveImages() {
    setError(''); setNotice(''); setBusyKey('images');
    try {
      const res = await fetch(`/api/admin/site-images?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: site.coverImageUrl, logoImageUrl: site.logoImageUrl, galleryImages: site.galleryImages, ownerPublicPhotoUrl: site.ownerPublicPhotoUrl }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Снимките са запазени.');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
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
        body: JSON.stringify({ workingHours: site.workingHours }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, workingHours: data.workingHours as WorkingHours }));
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

  async function uploadSingleFile(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`/api/upload?slug=${encodeURIComponent(slug)}`, { method: 'POST', body: fd });
    const d = await guardResponse(res);
    return String(d.url ?? '');
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) return; setBusyKey('upload-cover'); setError('');
    try { const url = await uploadSingleFile(file); setSite(p => ({ ...p, coverImageUrl: url, logoImageUrl: p.logoImageUrl || url })); setNotice('Cover качена. Натисни „Запази снимките".'); }
    catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return; setBusyKey('upload-logo'); setError('');
    try { const url = await uploadSingleFile(file); setSite(p => ({ ...p, logoImageUrl: url })); setNotice('Лого качено. Натисни „Запази снимките".'); }
    catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function handleOwnerPhotoUpload(file: File | null) {
    if (!file) return; setBusyKey('upload-owner'); setError('');
    try { const url = await uploadSingleFile(file); setSite(p => ({ ...p, ownerPublicPhotoUrl: url })); setNotice('Снимката е качена. Натисни „Запази профила".'); }
    catch (e) { handleErr(e); } finally { setBusyKey(''); }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || !files.length) return; setBusyKey('upload-gallery'); setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadSingleFile(f));
      setSite(p => ({ ...p, galleryImages: [...p.galleryImages, ...urls], coverImageUrl: p.coverImageUrl || urls[0] || p.coverImageUrl }));
      setNotice('Галерията е качена. Натисни „Запази снимките".');
    } catch (e) { handleErr(e); } finally { setBusyKey(''); }
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
  const inp: CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const btn = (variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost'): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: variant === 'primary' ? T.radiusSm : T.radiusSm,
    border: variant === 'primary' ? `1px solid ${T.accent}` : variant === 'danger' ? 'none' : `1px solid ${T.border}`,
    background: variant === 'primary' ? T.accent : 'transparent',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#EF4444' : T.text,
    padding: variant === 'sm-ghost' ? '6px 12px' : '8px 16px',
    fontSize: variant === 'sm-ghost' ? 13 : 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  });
  const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 };

  /* ── Nav tab switch ── */
  const switchTab = (id: TabId) => { setActiveTab(id); setError(''); setNotice(''); };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Top nav ───────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: T.surface, borderBottom: `1px solid ${T.border}`, height: 56 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>c</div>
            <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.name || slug}</span>
            {!isMobile && (
              <span style={{ fontSize: 12, color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{ownerEmail}</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link
              href={sitePath}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...btn('sm-ghost'), textDecoration: 'none' }}
            >
              <ExternalLink size={13} />
              {!isMobile && 'Виж сайта'}
            </Link>
            {showInstallButton && (
              <button type="button" onClick={() => void installAsApp()} style={btn('sm-ghost')}>
                Инсталирай
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              disabled={busyKey === 'logout'}
              style={{ ...btn('sm-ghost'), color: T.muted }}
              title="Изход"
            >
              <LogOut size={14} />
              {!isMobile && (busyKey === 'logout' ? 'Излизане…' : 'Изход')}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body layout ───────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'flex-start' }}>

        {/* ── Sidebar (desktop) ─────────────────────── */}
        {!isMobile && (
          <aside style={{
            width: 220, flexShrink: 0,
            position: 'sticky', top: 56, height: 'calc(100dvh - 56px)',
            overflowY: 'auto', borderRight: `1px solid ${T.border}`,
            background: T.surface, padding: '16px 10px',
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
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 16px 100px' : '28px 32px 48px' }}>

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
                <Field label="Адрес"><input value={site.address} onChange={e => setSite(p => ({ ...p, address: e.target.value }))} style={inp} /></Field>
                <Field label="Instagram"><input value={site.instagram} onChange={e => setSite(p => ({ ...p, instagram: e.target.value }))} style={inp} /></Field>
                <Field label="Facebook"><input value={site.facebook} onChange={e => setSite(p => ({ ...p, facebook: e.target.value }))} style={inp} /></Field>
                <Field label="TikTok"><input value={site.tiktok} onChange={e => setSite(p => ({ ...p, tiktok: e.target.value }))} style={inp} /></Field>
                <Field label="Google Maps URL"><input value={site.googleMapsUrl} onChange={e => setSite(p => ({ ...p, googleMapsUrl: e.target.value }))} style={inp} /></Field>
                <Field label="Google Place ID"><input value={site.googlePlaceId} onChange={e => setSite(p => ({ ...p, googlePlaceId: e.target.value }))} placeholder="ChIJ…" style={inp} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="За салона">
                  <textarea value={site.about} onChange={e => setSite(p => ({ ...p, about: e.target.value }))} style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} />
                </Field>
              </div>
            </Section>
          )}

          {/* ── Снимки ── */}
          {activeTab === 'images' && (
            <Section
              title="Снимки"
              desc="Cover, лого и галерия за публичния сайт."
              action={<button type="button" onClick={saveImages} style={btn('primary')} disabled={busyKey === 'images'}>{busyKey === 'images' ? 'Запазваме…' : 'Запази снимките'}</button>}
            >
              <div style={grid2}>
                <Field label="Cover">
                  <FileUploadBtn label="Качи cover" busy={busyKey === 'upload-cover'}>
                    <input type="file" accept="image/*" onChange={e => void handleCoverUpload(e.target.files?.[0] ?? null)} />
                  </FileUploadBtn>
                  <input value={site.coverImageUrl} onChange={e => setSite(p => ({ ...p, coverImageUrl: e.target.value }))} style={{ ...inp, marginTop: 6 }} placeholder="https://…" />
                  {site.coverImageUrl && <PreviewImg src={site.coverImageUrl} alt="Cover" />}
                </Field>

                <Field label="Лого">
                  <FileUploadBtn label="Качи лого" busy={busyKey === 'upload-logo'}>
                    <input type="file" accept="image/*" onChange={e => void handleLogoUpload(e.target.files?.[0] ?? null)} />
                  </FileUploadBtn>
                  <input value={site.logoImageUrl} onChange={e => setSite(p => ({ ...p, logoImageUrl: e.target.value }))} style={{ ...inp, marginTop: 6 }} placeholder="https://…" />
                  {site.logoImageUrl && <PreviewImg src={site.logoImageUrl} alt="Лого" />}
                </Field>
              </div>

              <div style={{ marginTop: 20 }}>
                <Field label="Галерия">
                  <FileUploadBtn label="Добави снимки" busy={busyKey === 'upload-gallery'}>
                    <input type="file" accept="image/*" multiple onChange={e => void handleGalleryUpload(e.target.files)} />
                  </FileUploadBtn>
                </Field>
                {site.galleryImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))', gap: 10, marginTop: 12 }}>
                    {site.galleryImages.map((url, i) => (
                      <div key={`${url}-${i}`} style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: 'hidden', background: T.surface }}>
                        <img src={url} alt={`Gallery ${i + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: '6px 8px', display: 'flex', gap: 6 }}>
                          <button type="button" style={{ ...btn('sm-ghost'), flex: 1, fontSize: 11, padding: '4px 8px' }} onClick={() => setSite(p => ({ ...p, coverImageUrl: url }))}>Cover</button>
                          <button type="button" style={{ ...btn('sm-ghost'), color: '#EF4444', padding: '4px 8px' }} onClick={() => setSite(p => ({ ...p, galleryImages: p.galleryImages.filter((_, j) => j !== i), coverImageUrl: p.coverImageUrl === url ? (p.galleryImages.find((_, j) => j !== i) ?? '') : p.coverImageUrl }))}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    <input type="file" accept="image/*" onChange={e => void handleOwnerPhotoUpload(e.target.files?.[0] ?? null)} />
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
              desc="Добави, редактирай и премахвай услуги."
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" style={btn('ghost')} onClick={() => setSite(p => ({ ...p, services: [...p.services, { name: '', price: 0, duration_min: 30 }] }))}>
                    <Plus size={14} />Добави
                  </button>
                  <button type="button" style={btn('primary')} onClick={saveServices} disabled={busyKey === 'services'}>{busyKey === 'services' ? 'Запазваме…' : 'Запази'}</button>
                </div>
              }
            >
              {site.services.length === 0 ? (
                <EmptyState title="Няма услуги" desc='Натисни "Добави" за да добавиш първата услуга.' />
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {site.services.map((svc, i) => (
                    <div key={`svc-${i}`} style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 14, background: T.surface }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'end' }}>
                        <Field label="Услуга">
                          <input value={svc.name} onChange={e => setSite(p => ({ ...p, services: p.services.map((s, j) => j === i ? { ...s, name: e.target.value } : s) }))} style={inp} placeholder="Напр. Подстригване" />
                        </Field>
                        <Field label="Цена (лв)">
                          <input type="number" value={svc.price} onChange={e => setSite(p => ({ ...p, services: p.services.map((s, j) => j === i ? { ...s, price: Number(e.target.value) || 0 } : s) }))} style={{ ...inp, width: 80 }} />
                        </Field>
                        <Field label="Мин">
                          <input type="number" value={svc.duration_min} onChange={e => setSite(p => ({ ...p, services: p.services.map((s, j) => j === i ? { ...s, duration_min: Number(e.target.value) || 30 } : s) }))} style={{ ...inp, width: 70 }} />
                        </Field>
                        <button type="button" style={{ ...btn('ghost'), color: '#EF4444', padding: '8px 10px', alignSelf: 'flex-end' }} onClick={() => setSite(p => ({ ...p, services: p.services.filter((_, j) => j !== i) }))}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ── Работно време ── */}
          {activeTab === 'hours' && (
            <Section
              title="Работно време"
              desc="Настрой часовете за всеки ден от седмицата."
              action={<button type="button" onClick={saveHours} style={btn('primary')} disabled={busyKey === 'hours'}>{busyKey === 'hours' ? 'Запазваме…' : 'Запази'}</button>}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {DAYS.map(day => {
                  const d = site.workingHours[day.key];
                  return (
                    <div key={day.key} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '130px 1fr auto auto', gap: 10, alignItems: 'center', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, opacity: d.closed ? 0.55 : 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{day.label}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="time" value={d.open} disabled={d.closed} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], open: e.target.value } } }))} style={{ ...inp, width: 'auto', flex: 1 }} />
                        <span style={{ color: T.muted, fontSize: 12 }}>–</span>
                        <input type="time" value={d.close} disabled={d.closed} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], close: e.target.value } } }))} style={{ ...inp, width: 'auto', flex: 1 }} />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.muted, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        <input type="checkbox" checked={d.closed} onChange={e => setSite(p => ({ ...p, workingHours: { ...p.workingHours, [day.key]: { ...p.workingHours[day.key], closed: e.target.checked } } }))} />
                        Почивен
                      </label>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Резервации ── */}
          {activeTab === 'bookings' && (
            <Section
              title="Резервации"
              desc={`Общо ${bookings.length} резервации`}
              action={
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | BookingStatus)} style={{ ...inp, width: 'auto', paddingRight: 28, cursor: 'pointer' }}>
                  <option value="all">Всички</option>
                  <option value="pending">Чакащи</option>
                  <option value="confirmed">Потвърдени</option>
                  <option value="completed">Завършени</option>
                  <option value="cancelled">Отказани</option>
                </select>
              }
            >
              {filteredBookings.length === 0 ? (
                <EmptyState title="Няма резервации" desc="Когато клиент резервира през сайта, ще я видиш тук." />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {filteredBookings.map(b => {
                    const cfg = STATUS_CFG[b.status];
                    return (
                      <div key={b.id} style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '14px 16px', background: T.surface }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 600 }}>{b.client_name}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 600 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                {cfg.label}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                              {b.service_name}
                              {typeof b.service_price === 'number' ? ` · ${b.service_price} лв` : ''}
                              {typeof b.service_duration === 'number' ? ` · ${b.service_duration} мин` : ''}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: T.muted }}>
                              {b.date} · {b.time} · {b.client_phone}
                              {b.client_email ? ` · ${b.client_email}` : ''}
                            </p>
                            {b.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: T.subtle }}>Бележка: {b.notes}</p>}
                          </div>
                          <select
                            value={b.status}
                            onChange={e => void updateBookingStatus(b.id, e.target.value as BookingStatus)}
                            style={{ ...inp, width: 'auto', cursor: 'pointer', flexShrink: 0 }}
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

          {/* ── Домейн ── */}
          {activeTab === 'domain' && (
            <Section
              title="Домейн"
              desc="Свържи собствен домейн към сайта."
            >
              {/* Platform URL */}
              <div style={{ padding: '12px 14px', background: '#F4F4F5', borderRadius: T.radiusSm, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Автоматичен адрес</p>
                <a href={getPlatformPublicUrl(slug)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: T.text, textDecoration: 'none', fontWeight: 500 }}>{getPlatformPublicUrl(slug)} <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></a>
              </div>

              {/* Connect form */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
                <Field label="Собствен домейн" style={{ flex: 1 }}>
                  <input value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="example.com" style={inp} />
                </Field>
                <button type="button" onClick={connectDomain} style={btn('primary')} disabled={busyKey === 'domain'}>{busyKey === 'domain' ? 'Свързваме…' : 'Свържи'}</button>
                {site.customDomain && (
                  <button type="button" onClick={() => void refreshDomainStatus(false)} style={btn('ghost')} disabled={busyKey === 'domain-refresh'}>
                    <RefreshCw size={13} style={{ animation: busyKey === 'domain-refresh' ? 'spin 1s linear infinite' : 'none' }} />
                    {!isMobile && 'Провери'}
                  </button>
                )}
              </div>

              {/* Status */}
              {site.customDomain && (
                <div style={{ padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {site.domainStatus === 'active'
                      ? <CheckCircle2 size={15} style={{ color: '#10B981', flexShrink: 0 }} />
                      : site.domainStatus === 'error'
                        ? <XCircle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
                        : <RefreshCw size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{site.customDomain}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>— {formatDomainStatus(site.domainStatus)}</span>
                  </div>
                  {domainMeta.checkedAt && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: T.subtle }}>Последна проверка: {new Date(domainMeta.checkedAt).toLocaleString('bg-BG')}</p>
                  )}
                </div>
              )}

              {/* DNS instructions */}
              {domainMeta.dnsInstructions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>DNS Записи</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {domainMeta.dnsInstructions.map((d, i) => (
                      <div key={`dns-${i}`} style={{ padding: '10px 12px', background: '#F4F4F5', borderRadius: T.radiusSm, fontFamily: 'monospace', fontSize: 12 }}>
                        <span style={{ color: T.muted }}>{d.type} {d.host}</span>
                        <span style={{ color: T.text, marginLeft: 8, wordBreak: 'break-all' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {domainMeta.verificationInstructions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Верификация</p>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {domainMeta.verificationInstructions.map((d, i) => (
                      <div key={`ver-${i}`} style={{ padding: '10px 12px', background: '#FEF3C7', borderRadius: T.radiusSm, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{d.type} {d.host}</span>
                        <div style={{ wordBreak: 'break-all', marginTop: 2 }}>{d.value}</div>
                        {d.reason && <div style={{ marginTop: 4, color: T.muted }}>{d.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DomainPurchaseSection slug={slug} siteName={site.name} siteEmail={site.email} sitePhone={site.phone} siteAddress={site.address} siteCity={site.city} />
            </Section>
          )}

          {/* ── Известия ── */}
          {activeTab === 'notifications' && (
            <Section title="Известия" desc="Настрой нотификациите за резервации.">
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
                        <code style={{ display: 'block', marginTop: 10, padding: '10px 14px', borderRadius: T.radiusSm, background: '#F4F4F5', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                          /start {site.onboardingCode}
                        </code>
                      ) : (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: T.subtle }}>Кодът се генерира при активиране на акаунта.</p>
                      )}
                    </>
                  )}
                </InfoCard>

                {/* Google Reviews */}
                <InfoCard
                  title="Google Reviews"
                  status={site.googlePlaceId ? 'connected' : 'pending'}
                >
                  <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    {site.googlePlaceId
                      ? 'Google Place ID е зададен. Клиентите ще получат покана за отзив след завършена услуга.'
                      : 'Добави Google Place ID в раздел Сайт, за да активираш автоматичните покани за отзиви.'}
                  </p>
                </InfoCard>
              </div>
            </Section>
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      {isMobile && (
        <nav aria-label="Навигация" style={{ position: 'fixed', left: 10, right: 10, bottom: 10, zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div style={{ background: 'rgba(255,255,255,0.96)', border: `1px solid ${T.border}`, borderRadius: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', backdropFilter: 'blur(16px)', padding: '4px 6px', display: 'flex', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} type="button" onClick={() => switchTab(id)}
                  style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 10px', borderRadius: 18, border: 'none', background: active ? '#F4F4F5' : 'transparent', color: active ? T.text : T.muted, cursor: 'pointer', minWidth: 52 }}>
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>{label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function Section({ title, desc, action, children }: { title: string; desc: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{title}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{desc}</p>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <label style={{ display: 'grid', gap: 5, ...style }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '0.02em' }}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', border: `1px dashed ${T.border}`, borderRadius: T.radiusSm }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.muted }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: T.subtle }}>{desc}</p>
    </div>
  );
}

function PreviewImg({ src, alt, round = false }: { src: string; alt: string; round?: boolean }) {
  return (
    <img src={src} alt={alt} style={{ display: 'block', marginTop: 8, width: round ? 80 : '100%', height: round ? 80 : 140, objectFit: 'cover', borderRadius: round ? '50%' : T.radiusSm, border: `1px solid ${T.border}` }} />
  );
}

function FileUploadBtn({ label, busy, children }: { label: string; busy: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontWeight: 500, color: T.text, cursor: busy ? 'wait' : 'pointer', background: T.surface }}>
      <Upload size={13} />
      {busy ? 'Качваме…' : label}
      <span style={{ display: 'none' }}>{children}</span>
    </label>
  );
}

function InfoCard({ title, status, children }: { title: string; status: 'connected' | 'pending'; children: ReactNode }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '14px 16px', background: T.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {status === 'connected'
          ? <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
          : <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#E5E7EB', flexShrink: 0, display: 'inline-block' }} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</span>
        <span style={{ fontSize: 11, color: status === 'connected' ? '#10B981' : T.subtle, marginLeft: 'auto' }}>
          {status === 'connected' ? 'Свързан' : 'Не е свързан'}
        </span>
      </div>
      {children}
    </div>
  );
}

function Toast({ tone, onDismiss, children }: { tone: 'success' | 'error'; onDismiss: () => void; children: ReactNode }) {
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

