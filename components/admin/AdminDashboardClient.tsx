'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import DomainPurchaseSection from '@/components/admin/DomainPurchaseSection';
import type { AdminSitePayload, BookingRecord, WorkingHours } from '@/lib/admin-site';
import { getHostAwareSalonPath, getPlatformPublicUrl } from '@/lib/domain-routing';

const DAYS = [
  { key: 'monday', label: 'Понеделник' },
  { key: 'tuesday', label: 'Вторник' },
  { key: 'wednesday', label: 'Сряда' },
  { key: 'thursday', label: 'Четвъртък' },
  { key: 'friday', label: 'Петък' },
  { key: 'saturday', label: 'Събота' },
  { key: 'sunday', label: 'Неделя' },
] as const;

const TABS = [
  { id: 'site', label: 'Сайт' },
  { id: 'images', label: 'Снимки' },
  { id: 'specialist', label: 'Специалист' },
  { id: 'services', label: 'Услуги' },
  { id: 'hours', label: 'Работно време' },
  { id: 'domain', label: 'Домейн' },
  { id: 'bookings', label: 'Резервации' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  slug: string;
  ownerEmail: string;
  initialSite: AdminSitePayload;
  initialBookings: BookingRecord[];
};

type BookingStatus = BookingRecord['status'];

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

type DomainInstruction = {
  type?: string;
  host?: string;
  value?: string;
  reason?: string | null;
};

function getDomainMeta(site: AdminSitePayload) {
  const config = (site.domainConfig ?? {}) as Record<string, unknown>;
  const dnsInstructions = Array.isArray(config.dnsInstructions)
    ? (config.dnsInstructions as DomainInstruction[])
    : [];
  const verificationInstructions = Array.isArray(config.verificationInstructions)
    ? (config.verificationInstructions as DomainInstruction[])
    : [];

  return {
    dnsInstructions,
    verificationInstructions,
    configuredBy:
      typeof config.configuredBy === 'string' ? config.configuredBy : '',
    misconfigured:
      typeof config.misconfigured === 'boolean' ? config.misconfigured : null,
    verified: config.verified === true,
    checkedAt: typeof config.checkedAt === 'string' ? config.checkedAt : '',
  };
}

function isPendingDomainStatus(status: string) {
  return ['pending_dns', 'pending_verification'].includes(status);
}

function formatDomainStatus(status: string) {
  switch (status) {
    case 'active':
      return 'Активен';
    case 'pending_verification':
      return 'Чака верификация';
    case 'pending_dns':
      return 'Чака DNS';
    case 'error':
      return 'Грешка';
    default:
      return status || 'Не е свързан';
  }
}

export default function AdminDashboardClient({
  slug,
  ownerEmail,
  initialSite,
  initialBookings,
}: Props) {
  const [site, setSite] = useState(initialSite);
  const [bookings, setBookings] = useState(initialBookings);
  const [activeTab, setActiveTab] = useState<TabId>('site');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState<string>('');
  const [domainInput, setDomainInput] = useState(initialSite.customDomain);
  const currentHost = typeof window !== 'undefined' ? window.location.host : null;
  const platformPublicUrl = getPlatformPublicUrl(slug);
  const sitePath = getHostAwareSalonPath({ host: currentHost, slug });
  const claimPath = getHostAwareSalonPath({ host: currentHost, slug, path: 'claim' });
  const signInPath = getHostAwareSalonPath({ host: currentHost, slug, path: 'admin/sign-in' });
  const domainMeta = getDomainMeta(site);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter(item => item.status === statusFilter);
  }, [bookings, statusFilter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');
    if (requestedTab && TABS.some(tab => tab.id === requestedTab)) {
      setActiveTab(requestedTab as TabId);
    }
  }, []);

  async function guardResponse(res: Response) {
    const data = await readJson(res);
    if (res.status === 401 && typeof data.redirectTo === 'string') {
      window.location.href = data.redirectTo;
      throw new Error('Пренасочване…');
    }
    if (!res.ok) throw new Error(data.error || 'Възникна грешка.');
    return data;
  }

  async function saveSiteSettings() {
    setError('');
    setNotice('');
    setBusyKey('site');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Информацията за сайта е запазена.');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function saveSpecialist() {
    setError('');
    setNotice('');
    setBusyKey('specialist');
    try {
      const res = await fetch(`/api/admin/site-settings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: site.ownerName,
          ownerPublicRole: site.ownerPublicRole,
          ownerPublicPhotoUrl: site.ownerPublicPhotoUrl,
        }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Профилът на специалиста е запазен.');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function saveImages() {
    setError('');
    setNotice('');
    setBusyKey('images');
    try {
      const res = await fetch(`/api/admin/site-images?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverImageUrl: site.coverImageUrl,
          logoImageUrl: site.logoImageUrl,
          galleryImages: site.galleryImages,
          ownerPublicPhotoUrl: site.ownerPublicPhotoUrl,
        }),
      });
      const data = await guardResponse(res);
      setSite(data.site as AdminSitePayload);
      setNotice('Снимките са запазени.');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function saveServices() {
    setError('');
    setNotice('');
    setBusyKey('services');
    try {
      const res = await fetch(`/api/admin/site-services?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: site.services }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, services: data.services as AdminSitePayload['services'] }));
      setNotice('Услугите са запазени.');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function saveHours() {
    setError('');
    setNotice('');
    setBusyKey('hours');
    try {
      const res = await fetch(`/api/admin/site-hours?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: site.workingHours }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({ ...prev, workingHours: data.workingHours as WorkingHours }));
      setNotice('Работното време е запазено.');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function connectDomain() {
    setError('');
    setNotice('');
    setBusyKey('domain');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, domain: domainInput }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({
        ...prev,
        customDomain: data.customDomain,
        domainStatus: data.domainStatus,
        domainConfig: {
          dnsInstructions: data.dnsInstructions,
          verificationInstructions: data.verificationInstructions,
          configuredBy: data.configuredBy,
          misconfigured: data.misconfigured,
          verified: data.verified,
          provider: data.provider,
          providerDetails: data.providerDetails,
          checkedAt: new Date().toISOString(),
        },
      }));
      setNotice(
        data.domainStatus === 'active'
          ? 'Домейнът е активен.'
          : 'Домейнът е записан. Добави DNS записите и изчакай верификация.'
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function refreshDomainStatus(silent = false) {
    if (!site.customDomain) return;
    if (!silent) {
      setError('');
      setNotice('');
    }
    setBusyKey('domain-refresh');
    try {
      const res = await fetch('/api/domain-connect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await guardResponse(res);
      setSite(prev => ({
        ...prev,
        customDomain: data.customDomain,
        domainStatus: data.domainStatus,
        domainConfig: {
          dnsInstructions: data.dnsInstructions,
          verificationInstructions: data.verificationInstructions,
          configuredBy: data.configuredBy,
          misconfigured: data.misconfigured,
          verified: data.verified,
          provider: data.provider,
          providerDetails: data.providerDetails,
          checkedAt: new Date().toISOString(),
        },
      }));
      if (!silent) {
        setNotice(
          data.domainStatus === 'active'
            ? 'Домейнът е вече активен.'
            : 'Статусът на домейна е обновен.'
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Грешка');
      }
    } finally {
      setBusyKey('');
    }
  }

  async function logout() {
    setBusyKey('logout');
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = signInPath;
    }
  }

  useEffect(() => {
    if (activeTab !== 'domain') return;
    if (!site.customDomain) return;
    if (!isPendingDomainStatus(site.domainStatus)) return;
    if (busyKey === 'domain' || busyKey === 'domain-refresh') return;

    const timeout = window.setTimeout(() => {
      void refreshDomainStatus(true);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [activeTab, site.customDomain, site.domainStatus, busyKey]);

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    setError('');
    const previous = bookings;
    setBookings(current => current.map(item => (item.id === bookingId ? { ...item, status } : item)));
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      await guardResponse(res);
      setNotice('Статусът на резервацията е обновен.');
    } catch (err: unknown) {
      setBookings(previous);
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    }
  }

  async function uploadSingleFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/upload?slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
      body: formData,
    });
    const data = await guardResponse(res);
    return String(data.url ?? '');
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-cover');
    setError('');
    try {
      const url = await uploadSingleFile(file);
      setSite(prev => ({
        ...prev,
        coverImageUrl: url,
        logoImageUrl: prev.logoImageUrl || url,
      }));
      setNotice('Cover снимката е качена. Натисни "Запази снимките".');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-logo');
    setError('');
    try {
      const url = await uploadSingleFile(file);
      setSite(prev => ({ ...prev, logoImageUrl: url }));
      setNotice('Логото е качено. Натисни "Запази снимките".');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function handleOwnerPhotoUpload(file: File | null) {
    if (!file) return;
    setBusyKey('upload-owner');
    setError('');
    try {
      const url = await uploadSingleFile(file);
      setSite(prev => ({ ...prev, ownerPublicPhotoUrl: url }));
      setNotice('Снимката на специалиста е качена. Натисни "Запази профила".');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusyKey('upload-gallery');
    setError('');
    try {
      const nextUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadSingleFile(file);
        nextUrls.push(url);
      }
      setSite(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...nextUrls],
        coverImageUrl: prev.coverImageUrl || nextUrls[0] || prev.coverImageUrl,
      }));
      setNotice('Галерията е качена. Натисни "Запази снимките".');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Пренасочване…') return;
      setError(err instanceof Error ? err.message : 'Грешка');
    } finally {
      setBusyKey('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#000', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(255,255,255,0.95)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Owner Dashboard
            </p>
            <h1 style={{ margin: '6px 0 0', fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.04em' }}>{site.name || slug}</h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}>
              Собственик: <strong>{ownerEmail}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={sitePath} style={linkButtonStyle}>
              Виж сайта
            </Link>
            <Link href={claimPath} style={linkGhostStyle}>
              Claim page
            </Link>
            <button type="button" onClick={logout} style={ghostButtonStyle} disabled={busyKey === 'logout'}>
              {busyKey === 'logout' ? 'Излизане…' : 'Изход'}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
                setNotice('');
              }}
              style={{
                borderRadius: 999,
                padding: '11px 16px',
                border: `1px solid ${activeTab === tab.id ? '#000' : 'rgba(0,0,0,0.12)'}`,
                background: '#fff',
                color: '#000',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 800 : 700,
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 14px 28px rgba(0,0,0,0.16)' : '0 8px 18px rgba(0,0,0,0.08)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <MessageBox tone="error">{error}</MessageBox> : null}
        {notice ? <MessageBox tone="success">{notice}</MessageBox> : null}

        {activeTab === 'site' ? (
          <Card>
            <SectionHeader
              title="Сайт"
              description="Редактирай основната информация, която се показва в публичната страница."
              action={
                <button type="button" onClick={saveSiteSettings} style={primaryButtonStyle} disabled={busyKey === 'site'}>
                  {busyKey === 'site' ? 'Запазваме…' : 'Запази'}
                </button>
              }
            />

            <div style={gridStyle}>
              <Field label="Име на салона">
                <input value={site.name} onChange={e => setSite(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Категория">
                <input value={site.category} onChange={e => setSite(prev => ({ ...prev, category: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Телефон">
                <input value={site.phone} onChange={e => setSite(prev => ({ ...prev, phone: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Имейл">
                <input value={site.email} readOnly style={{ ...inputStyle, opacity: 0.75 }} />
              </Field>
              <Field label="Град">
                <input value={site.city} onChange={e => setSite(prev => ({ ...prev, city: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Адрес">
                <input value={site.address} onChange={e => setSite(prev => ({ ...prev, address: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Instagram">
                <input value={site.instagram} onChange={e => setSite(prev => ({ ...prev, instagram: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Facebook">
                <input value={site.facebook} onChange={e => setSite(prev => ({ ...prev, facebook: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="TikTok">
                <input value={site.tiktok} onChange={e => setSite(prev => ({ ...prev, tiktok: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Google Maps URL">
                <input value={site.googleMapsUrl} onChange={e => setSite(prev => ({ ...prev, googleMapsUrl: e.target.value }))} style={inputStyle} />
              </Field>
            </div>

            <Field label="За салона">
              <textarea
                value={site.about}
                onChange={e => setSite(prev => ({ ...prev, about: e.target.value }))}
                style={{ ...inputStyle, minHeight: 150, resize: 'vertical' }}
              />
            </Field>
          </Card>
        ) : null}

        {activeTab === 'images' ? (
          <Card>
            <SectionHeader
              title="Снимки"
              description="Cover, лого и галерия за публичния сайт."
              action={
                <button type="button" onClick={saveImages} style={primaryButtonStyle} disabled={busyKey === 'images'}>
                  {busyKey === 'images' ? 'Запазваме…' : 'Запази снимките'}
                </button>
              }
            />

            <div style={gridStyle}>
              <Field label="Cover">
                <UploadControl label="Качи cover" busy={busyKey === 'upload-cover'}>
                  <input type="file" accept="image/*" onChange={e => void handleCoverUpload(e.target.files?.[0] ?? null)} />
                </UploadControl>
                <input value={site.coverImageUrl} onChange={e => setSite(prev => ({ ...prev, coverImageUrl: e.target.value }))} style={inputStyle} />
                {site.coverImageUrl ? <PreviewImage src={site.coverImageUrl} alt="Cover" /> : null}
              </Field>

              <Field label="Лого">
                <UploadControl label="Качи лого" busy={busyKey === 'upload-logo'}>
                  <input type="file" accept="image/*" onChange={e => void handleLogoUpload(e.target.files?.[0] ?? null)} />
                </UploadControl>
                <input value={site.logoImageUrl} onChange={e => setSite(prev => ({ ...prev, logoImageUrl: e.target.value }))} style={inputStyle} />
                {site.logoImageUrl ? <PreviewImage src={site.logoImageUrl} alt="Logo" /> : null}
              </Field>
            </div>

            <div style={{ marginTop: 20 }}>
              <Field label="Галерия">
                <UploadControl label="Добави снимки" busy={busyKey === 'upload-gallery'}>
                  <input type="file" accept="image/*" multiple onChange={e => void handleGalleryUpload(e.target.files)} />
                </UploadControl>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {site.galleryImages.map((url, index) => (
                  <div key={`${url}-${index}`} style={miniCardStyle}>
                    <PreviewImage src={url} alt={`Gallery ${index + 1}`} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" style={ghostButtonStyle} onClick={() => setSite(prev => ({ ...prev, coverImageUrl: url }))}>
                        Направи cover
                      </button>
                      <button
                        type="button"
                        style={ghostButtonStyle}
                        onClick={() =>
                          setSite(prev => ({
                            ...prev,
                            galleryImages: prev.galleryImages.filter((_, itemIndex) => itemIndex !== index),
                            coverImageUrl: prev.coverImageUrl === url ? prev.galleryImages.find((_, itemIndex) => itemIndex !== index) ?? '' : prev.coverImageUrl,
                          }))
                        }
                      >
                        Премахни
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : null}

        {activeTab === 'specialist' ? (
          <Card>
            <SectionHeader
              title="Специалист"
              description="Това захранва секцията „Вашият специалист“ в сайта."
              action={
                <button type="button" onClick={saveSpecialist} style={primaryButtonStyle} disabled={busyKey === 'specialist'}>
                  {busyKey === 'specialist' ? 'Запазваме…' : 'Запази профила'}
                </button>
              }
            />

            <div style={gridStyle}>
              <Field label="Име">
                <input value={site.ownerName} onChange={e => setSite(prev => ({ ...prev, ownerName: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Роля">
                <input value={site.ownerPublicRole} onChange={e => setSite(prev => ({ ...prev, ownerPublicRole: e.target.value }))} style={inputStyle} />
              </Field>
            </div>

            <Field label="Снимка на специалиста">
              <UploadControl label="Качи снимка" busy={busyKey === 'upload-owner'}>
                <input type="file" accept="image/*" onChange={e => void handleOwnerPhotoUpload(e.target.files?.[0] ?? null)} />
              </UploadControl>
              <input value={site.ownerPublicPhotoUrl} onChange={e => setSite(prev => ({ ...prev, ownerPublicPhotoUrl: e.target.value }))} style={inputStyle} />
              {site.ownerPublicPhotoUrl ? <PreviewImage src={site.ownerPublicPhotoUrl} alt="Specialist" round /> : null}
            </Field>
          </Card>
        ) : null}

        {activeTab === 'services' ? (
          <Card>
            <SectionHeader
              title="Услуги"
              description="Добави, редактирай и премахвай услуги в същия формат, който публичният сайт вече използва."
              action={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setSite(prev => ({
                        ...prev,
                        services: [...prev.services, { name: '', price: 0, duration_min: 30 }],
                      }))
                    }
                    style={ghostButtonStyle}
                  >
                    + Добави услуга
                  </button>
                  <button type="button" onClick={saveServices} style={primaryButtonStyle} disabled={busyKey === 'services'}>
                    {busyKey === 'services' ? 'Запазваме…' : 'Запази'}
                  </button>
                </div>
              }
            />

            <div style={{ display: 'grid', gap: 14 }}>
              {site.services.map((service, index) => (
                <div key={`service-${index}`} style={miniCardStyle}>
                  <div style={gridStyle}>
                    <Field label="Име">
                      <input
                        value={service.name}
                        onChange={e =>
                          setSite(prev => ({
                            ...prev,
                            services: prev.services.map((item, itemIndex) => (itemIndex === index ? { ...item, name: e.target.value } : item)),
                          }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Цена">
                      <input
                        type="number"
                        value={service.price}
                        onChange={e =>
                          setSite(prev => ({
                            ...prev,
                            services: prev.services.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, price: Number(e.target.value) || 0 } : item
                            ),
                          }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Продължителност (мин)">
                      <input
                        type="number"
                        value={service.duration_min}
                        onChange={e =>
                          setSite(prev => ({
                            ...prev,
                            services: prev.services.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, duration_min: Number(e.target.value) || 30 } : item
                            ),
                          }))
                        }
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <button
                    type="button"
                    style={ghostButtonStyle}
                    onClick={() =>
                      setSite(prev => ({
                        ...prev,
                        services: prev.services.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    Премахни
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {activeTab === 'hours' ? (
          <Card>
            <SectionHeader
              title="Работно време"
              description="Редактирай часовете в същия shape, който публичният сайт вече консумира."
              action={
                <button type="button" onClick={saveHours} style={primaryButtonStyle} disabled={busyKey === 'hours'}>
                  {busyKey === 'hours' ? 'Запазваме…' : 'Запази'}
                </button>
              }
            />

            <div style={{ display: 'grid', gap: 14 }}>
              {DAYS.map(day => {
                const dayValue = site.workingHours[day.key];
                return (
                  <div key={day.key} style={miniCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ fontSize: 15 }}>{day.label}</strong>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={dayValue.closed}
                          onChange={e =>
                            setSite(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: {
                                  ...prev.workingHours[day.key],
                                  closed: e.target.checked,
                                },
                              },
                            }))
                          }
                        />
                        Почивен ден
                      </label>
                    </div>

                    <div style={gridStyle}>
                      <Field label="От">
                        <input
                          type="time"
                          value={dayValue.open}
                          disabled={dayValue.closed}
                          onChange={e =>
                            setSite(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: {
                                  ...prev.workingHours[day.key],
                                  open: e.target.value,
                                },
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="До">
                        <input
                          type="time"
                          value={dayValue.close}
                          disabled={dayValue.closed}
                          onChange={e =>
                            setSite(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: {
                                  ...prev.workingHours[day.key],
                                  close: e.target.value,
                                },
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {activeTab === 'domain' ? (
          <Card>
            <SectionHeader
              title="Домейн"
              description="Всеки сайт получава автоматично свой адрес под clicka.bg. Тук можеш да свържеш и собствен домейн като override."
              action={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={connectDomain} style={primaryButtonStyle} disabled={busyKey === 'domain'}>
                    {busyKey === 'domain' ? 'Свързваме…' : 'Свържи домейн'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshDomainStatus(false)}
                    style={ghostButtonStyle}
                    disabled={!site.customDomain || busyKey === 'domain-refresh'}
                  >
                    {busyKey === 'domain-refresh' ? 'Проверявам…' : 'Провери отново'}
                  </button>
                </div>
              }
            />

            <div style={miniCardStyle}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Default address
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800 }}>
                <a href={platformPublicUrl} style={{ color: '#000', textDecoration: 'none' }}>
                  {platformPublicUrl}
                </a>
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                Това е автоматичният public URL за сайта, дори когато клиентът още няма собствен домейн.
              </p>
            </div>

            <Field label="Custom domain">
              <input value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="example.com" style={inputStyle} />
            </Field>

            <div style={{ ...miniCardStyle, marginTop: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Статус</p>
              <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800 }}>{formatDomainStatus(site.domainStatus)}</p>
              {site.customDomain ? (
                <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.6 }}>
                  Активен запис в профила: <strong>{site.customDomain}</strong>
                </p>
              ) : null}
              {domainMeta.configuredBy ? (
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                  Засечена конфигурация: <strong>{domainMeta.configuredBy}</strong>
                </p>
              ) : null}
              {domainMeta.checkedAt ? (
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                  Последна проверка: {new Date(domainMeta.checkedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            {domainMeta.verificationInstructions.length > 0 ? (
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                {domainMeta.verificationInstructions.map((instruction, index) => (
                  <div key={`verification-${index}`} style={miniCardStyle}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
                      {String(instruction.type ?? 'TXT')} {String(instruction.host ?? '')}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 15, wordBreak: 'break-all' }}>
                      {String(instruction.value ?? '')}
                    </p>
                    {instruction.reason ? (
                      <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                        {instruction.reason}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {domainMeta.dnsInstructions.length > 0 ? (
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                {domainMeta.dnsInstructions.map((instruction, index) => (
                  <div key={`dns-${index}`} style={miniCardStyle}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
                      {String(instruction.type ?? 'DNS')} {String(instruction.host ?? '@')}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 15, wordBreak: 'break-all' }}>
                      {String(instruction.value ?? '')}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <DomainPurchaseSection
              slug={slug}
              siteName={site.name}
              siteEmail={site.email}
              sitePhone={site.phone}
              siteAddress={site.address}
              siteCity={site.city}
            />
          </Card>
        ) : null}

        {activeTab === 'bookings' ? (
          <Card>
            <SectionHeader
              title="Резервации"
              description="Управлявай статуса на входящите заявки."
              action={
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | BookingStatus)} style={inputStyle}>
                  <option value="all">Всички</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              }
            />

            {filteredBookings.length === 0 ? (
              <div style={miniCardStyle}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Няма резервации</p>
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                  Когато клиент резервира през сайта, ще я видиш тук.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {filteredBookings.map(booking => (
                  <div key={booking.id} style={miniCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{booking.client_name}</p>
                        <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                          {booking.service_name}
                          {typeof booking.service_price === 'number' ? ` · ${booking.service_price} EUR` : ''}
                          {typeof booking.service_duration === 'number' ? ` · ${booking.service_duration} мин` : ''}
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                          {booking.date} · {booking.time} · {booking.client_phone}
                          {booking.client_email ? ` · ${booking.client_email}` : ''}
                        </p>
                        {booking.notes ? (
                          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
                            Бележка: {booking.notes}
                          </p>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusPill status={booking.status} />
                        <select
                          value={booking.status}
                          onChange={e => void updateBookingStatus(booking.id, e.target.value as BookingStatus)}
                          style={inputStyle}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 30,
        padding: 22,
        background: '#fff',
        boxShadow: '0 22px 46px rgba(0,0,0,0.12)',
      }}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.04em' }}>{title}</h2>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
      {children}
    </label>
  );
}

function PreviewImage({ src, alt, round = false }: { src: string; alt: string; round?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: 'block',
        width: round ? 112 : '100%',
        height: round ? 112 : 200,
        objectFit: 'cover',
        borderRadius: round ? '999px' : 20,
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 14px 28px rgba(0,0,0,0.14)',
        marginTop: 10,
      }}
    />
  );
}

function UploadControl({
  label,
  busy,
  children,
}: {
  label: string;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 999, padding: '10px 14px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', cursor: busy ? 'wait' : 'pointer', fontSize: 14, fontWeight: 800 }}>
        <span>{busy ? 'Качваме…' : label}</span>
        <span style={{ display: 'none' }}>{children}</span>
      </label>
    </div>
  );
}

function StatusPill({ status }: { status: BookingStatus }) {
  const label = status.toUpperCase();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 112,
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.12)',
        padding: '10px 12px',
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: '0.10em',
        boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
      }}
    >
      {label}
    </span>
  );
}

function MessageBox({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 20,
        border: `1px solid ${tone === 'error' ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
        background: '#fff',
        padding: '14px 16px',
        boxShadow: '0 14px 28px rgba(0,0,0,0.10)',
      }}
    >
      {children}
    </div>
  );
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 16,
  border: '1px solid rgba(0,0,0,0.14)',
  boxShadow: '0 10px 22px rgba(0,0,0,0.08)',
  background: '#fff',
  color: '#000',
  fontSize: 15,
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid #000',
  borderRadius: 999,
  background: '#000',
  color: '#fff',
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 800,
  boxShadow: '0 14px 28px rgba(0,0,0,0.16)',
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 999,
  background: '#fff',
  color: '#000',
  padding: '11px 15px',
  fontSize: 14,
  fontWeight: 800,
  boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
  cursor: 'pointer',
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #000',
  borderRadius: 999,
  background: '#000',
  color: '#fff',
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 800,
  textDecoration: 'none',
  boxShadow: '0 14px 28px rgba(0,0,0,0.16)',
};

const linkGhostStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 999,
  background: '#fff',
  color: '#000',
  padding: '11px 15px',
  fontSize: 14,
  fontWeight: 800,
  textDecoration: 'none',
  boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
};

const miniCardStyle: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.10)',
  borderRadius: 24,
  padding: 16,
  background: '#fff',
  boxShadow: '0 16px 30px rgba(0,0,0,0.12)',
};
