'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Upload } from 'lucide-react';

const CREATE_DRAFT_KEY = 'clicka-create-draft-v1';
const CREATE_PREVIEW_KEY = 'clicka-create-preview-v1';

/** Сървърът пропуска Stripe само при CLICKA_SKIP_CHECKOUT; този флаг само за текст на бутона. */
const SHOW_SKIP_PAYMENT_UI =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SKIP_CHECKOUT === '1';

/* ── Data ─────────────────────────────────────────────── */
const TEMPLATES = [
  { id: 1, name: 'Стандартен шаблон' },
];

// Единна “бяла” тема (без цветови варианти).
const MONO_THEME = {
  primary: '#111111',
  light: '#f3f4f6',
};

const PLANS = [
  { id: 'solo',   name: 'SOLO',   price: 299, daily: '0.82', desc: '1 специалист' },
  { id: 'ekip',   name: 'ЕКИП',   price: 399, daily: '1,09', desc: 'до 3 специалисти' },
  { id: 'studio', name: 'СТУДИО', price: 599, daily: '1.64', desc: 'неограничени специалисти' },
];

const FEATURES = [
  'Професионален сайт',
  'Резервационна система',
  'Хостинг',
  'Email напомняния към клиентите',
  'Неограничени резервации',
  'Мобилна версия',
  'Свързване на личен домейн с 1 бутон',
];

const CATEGORIES = [
  'Фризьорски салон', 'Маникюр', 'Педикюр', 'Вежди и мигли',
  'Козметик', 'Грим', 'Масаж', 'Друго',
];

const DAYS = [
  { key: 'monday',    label: 'Понеделник' },
  { key: 'tuesday',   label: 'Вторник' },
  { key: 'wednesday', label: 'Сряда' },
  { key: 'thursday',  label: 'Четвъртък' },
  { key: 'friday',    label: 'Петък' },
  { key: 'saturday',  label: 'Събота' },
  { key: 'sunday',    label: 'Неделя' },
];

const STEP_LABELS = ['План', 'Данни', 'Плащане'];

/* ── Types ────────────────────────────────────────────── */
type WorkingDay = { open: string; close: string; closed: boolean };
type Service = { name: string; price: number; duration_min: number };
type OSMResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
  };
};

/* ── Shared styles ────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: '100%', padding: '13px 15px',
  border: '1px solid rgba(0,0,0,0.78)', borderRadius: 14,
  fontSize: 16, fontFamily: 'inherit', outline: 'none',
  background: '#fff', color: '#000', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  marginBottom: 6, color: '#000',
};

const hint: React.CSSProperties = {
  fontSize: 13, color: '#000', margin: '0 0 10px', lineHeight: 1.55,
};

/* ════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════ */
export default function CreatePage() {
  const [step, setStep]               = useState(1);
  const [templateId, setTemplateId]   = useState<number | null>(1);
  const [planId, setPlanId]           = useState('');
  const [smsAddon, setSmsAddon]       = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'Фризьорски салон', phone: '', email: '',
    city: '', address: '', about: '', instagram: '', facebook: '',
  });
  const [hours, setHours] = useState<Record<string, WorkingDay>>({
    monday:    { open: '09:00', close: '18:00', closed: false },
    tuesday:   { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday:  { open: '09:00', close: '18:00', closed: false },
    friday:    { open: '09:00', close: '18:00', closed: false },
    saturday:  { open: '10:00', close: '16:00', closed: false },
    sunday:    { open: '', close: '', closed: true },
  });
  const [logoUrl,      setLogoUrl]      = useState('');
  const [galleryUrls,  setGalleryUrls]  = useState<string[]>([]);
  const [coverUrl,     setCoverUrl]     = useState(''); // избира се от галерията
  const [priceListUrls, setPriceListUrls] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [uploading,    setUploading]    = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');

  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<OSMResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [mapsError, setMapsError] = useState('');

  const tempSlug  = useRef(`draft-${Math.random().toString(36).slice(2, 8)}`);
  const addressRef = useRef<HTMLInputElement>(null);
  const selectedTemplate = TEMPLATES.find(t => t.id === templateId);
  const selectedPlan     = PLANS.find(p => p.id === planId);

  // Restore draft once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(CREATE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        step: number;
        templateId: number | null;
        planId: string;
        smsAddon: boolean;
        form: typeof form;
        hours: typeof hours;
        logoUrl: string;
        galleryUrls: string[];
        coverUrl: string;
        priceListUrls: string[];
        services: Service[];
        googleMapsUrl: string;
        pickedLat: number | null;
        pickedLng: number | null;
      }>;

      if (typeof draft.step === 'number') setStep(Math.min(Math.max(draft.step, 1), 3));
      if (typeof draft.templateId === 'number') setTemplateId(draft.templateId);
      if (typeof draft.planId === 'string') setPlanId(draft.planId);
      if (typeof draft.smsAddon === 'boolean') setSmsAddon(draft.smsAddon);
      if (draft.form) setForm(prev => ({ ...prev, ...draft.form }));
      if (draft.hours) setHours(draft.hours);
      if (typeof draft.logoUrl === 'string') setLogoUrl(draft.logoUrl);
      if (Array.isArray(draft.galleryUrls)) setGalleryUrls(draft.galleryUrls);
      if (typeof draft.coverUrl === 'string') setCoverUrl(draft.coverUrl);
      if (Array.isArray(draft.priceListUrls)) setPriceListUrls(draft.priceListUrls);
      if (Array.isArray(draft.services)) setServices(draft.services);
      if (typeof draft.googleMapsUrl === 'string') setGoogleMapsUrl(draft.googleMapsUrl);
      if (typeof draft.pickedLat === 'number' || draft.pickedLat === null) setPickedLat(draft.pickedLat ?? null);
      if (typeof draft.pickedLng === 'number' || draft.pickedLng === null) setPickedLng(draft.pickedLng ?? null);
    } catch {
      // Ignore corrupted draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft whenever key fields change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const draft = {
      step,
      templateId,
      planId,
      smsAddon,
      form,
      hours,
      logoUrl,
      galleryUrls,
      coverUrl,
      priceListUrls,
      services,
      googleMapsUrl,
      pickedLat,
      pickedLng,
    };
    window.localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
  }, [
    step,
    templateId,
    planId,
    smsAddon,
    form,
    hours,
    logoUrl,
    galleryUrls,
    coverUrl,
    priceListUrls,
    services,
    googleMapsUrl,
    pickedLat,
    pickedLng,
  ]);

  function buildOsmEmbedUrl(lat: number, lng: number) {
    const d = 0.01;
    const left = (lng - d).toFixed(6);
    const right = (lng + d).toFixed(6);
    const top = (lat + d).toFixed(6);
    const bottom = (lat - d).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
  }

  useEffect(() => {
    if (step !== 2) return;
    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setAddressLoading(true);
      setMapsError('');
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=bg&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        const data = (await res.json()) as OSMResult[];
        setAddressResults(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if ((e as Error).name === 'AbortError') return;
        setAddressResults([]);
        setMapsError(e instanceof Error ? e.message : 'Грешка при търсене на адрес');
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [addressQuery, step]);

  /* ── Upload ─────────────────────────────────────────── */
  async function uploadFile(file: File, field: string): Promise<string> {
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/upload?slug=${tempSlug.current}`, {
        method: 'POST', body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      return url;
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  }

  async function analyzePriceLists(imageUrls: string[]) {
    setServicesLoading(true);
    setServicesError('');
    try {
      const merged: Service[] = [];
      const seen = new Set<string>();

      for (const imageUrl of imageUrls) {
        const res = await fetch('/api/analyze-price-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const details = typeof data.details === 'string' && data.details
            ? `\n\n${data.details}`
            : '';
          const status = data.status ? ` (HTTP ${data.status})` : '';
          throw new Error((data.error || 'Грешка при анализ на ценоразписа') + status + details);
        }

        const parsed = Array.isArray(data) ? (data as Service[]) : [];
        const cleaned = parsed
          .filter(s => s && typeof s.name === 'string' && s.name.trim())
          .map(s => ({
            name: String(s.name).trim(),
            price: Number(s.price) || 0,
            duration_min: Math.max(5, Number(s.duration_min) || 30),
          }));

        for (const item of cleaned) {
          const key = `${item.name.toLowerCase()}|${item.price}|${item.duration_min}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
      }

      setServices(merged);
    } catch (err: unknown) {
      setServices([]);
      setServicesError(err instanceof Error ? err.message : 'Грешка при анализ');
    } finally {
      setServicesLoading(false);
    }
  }

  function setCoverFromGallery(url: string) {
    setCoverUrl(url);
  }

  /* ── Validation ─────────────────────────────────────── */
  function canProceed() {
    if (step === 1) return planId !== '';
    if (step === 2) return !!(form.name && form.phone && form.email && form.city);
    return true;
  }

  /* ── Checkout ───────────────────────────────────────── */
  async function handlePay() {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          planType: planId,
          smsAddon,
          salonData: {
            ...form,
            workingHours:  hours,
            coverImageUrl: coverUrl,
            logoImageUrl:  logoUrl,
            galleryImages: galleryUrls,
            priceListUrls,
            googleMapsUrl,
            services,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка');
      if (data.skipCheckout === true) {
        if (typeof data.claimUrl === 'string' && data.claimUrl.length > 0) {
          window.location.href = data.claimUrl;
          return;
        }
        if (typeof data.publicUrl === 'string' && data.publicUrl.length > 0) {
          window.location.href = data.publicUrl;
          return;
        }
        if (typeof data.slug === 'string' && data.slug.length > 0) {
          window.location.href = `${window.location.origin}/${encodeURIComponent(data.slug)}`;
          return;
        }
      }
      if (typeof data.checkoutUrl === 'string' && data.checkoutUrl.length > 0) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('Няма линк за плащане или сайт');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при пренасочване');
      setIsSubmitting(false);
    }
  }

  function next() {
    if (!canProceed()) { setError('Моля попълнете задължителните полета.'); return; }
    setError('');
    setStep(s => s + 1);
  }

  function resetAllDraft() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CREATE_DRAFT_KEY);
    }
    setStep(1);
    setTemplateId(1);
    setPlanId('');
    setSmsAddon(false);
    setForm({
      name: '', category: 'Фризьорски салон', phone: '', email: '',
      city: '', address: '', about: '', instagram: '', facebook: '',
    });
    setHours({
      monday:    { open: '09:00', close: '18:00', closed: false },
      tuesday:   { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday:  { open: '09:00', close: '18:00', closed: false },
      friday:    { open: '09:00', close: '18:00', closed: false },
      saturday:  { open: '10:00', close: '16:00', closed: false },
      sunday:    { open: '', close: '', closed: true },
    });
    setLogoUrl('');
    setGalleryUrls([]);
    setCoverUrl('');
    setPriceListUrls([]);
    setServices([]);
    setServicesError('');
    setGoogleMapsUrl('');
    setPickedLat(null);
    setPickedLng(null);
    setError('');
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'inherit', color: '#000' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1.5px solid #000',
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/">
            <Image src="/logo.png" alt="Clicka.bg" width={120} height={40} style={{ height: 34, width: 'auto' }} />
          </Link>
          <span style={{ fontSize: 13, color: '#000', fontWeight: 600 }}>
            Стъпка {step} от 3
          </span>
        </div>
        <button
          type="button"
          onClick={resetAllDraft}
          style={{
            border: '1.5px solid #000',
            background: '#fff',
            borderRadius: 999,
            padding: '9px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Започни отначало
        </button>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 88px' }}>

        {/* PROGRESS */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 44 }}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'flex-start', flex: i < 3 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: done || active ? '#000' : '#fff',
                    color: done || active ? '#fff' : '#000',
                    border: '1.5px solid #000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    transition: 'background 0.2s',
                  }}>
                    {n}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    color: '#000',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {i < 3 && (
                  <div style={{
                    flex: 1, height: 1, marginTop: 15,
                    background: '#000',
                    transition: 'background 0.2s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════
            STEP 1 — PLAN
        ═══════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Избери план
            </h1>
            <p style={{ color: '#000', marginBottom: 28, fontSize: 15, lineHeight: 1.5 }}>
              Можеш да смениш плана по всяко време
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PLANS.map(p => {
                const active = planId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    style={{
                      border: '1.5px solid #000',
                      borderRadius: 24, padding: '22px 22px', cursor: 'pointer',
                      background: active ? '#000' : '#fff',
                      color: active ? '#fff' : '#000',
                      transition: 'all 0.15s',
                      boxShadow: active ? '0 24px 56px rgba(0,0,0,0.12)' : '0 10px 28px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 17, margin: '0 0 2px' }}>{p.name}</p>
                        <p style={{ fontSize: 13, margin: 0, opacity: active ? 0.88 : 1 }}>{p.desc}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: 20, margin: '0 0 2px' }}>{p.price} €</p>
                        <p style={{ fontSize: 12, margin: 0, opacity: active ? 0.88 : 1 }}>от {p.daily} € / ден</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
                      {FEATURES.map(f => (
                        <span key={f} style={{ fontSize: 12, opacity: active ? 0.84 : 1 }}>{f}</span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* SMS add-on */}
              <div
                onClick={() => setSmsAddon(v => !v)}
                style={{
                  border: '1.5px solid #000',
                  borderRadius: 24, padding: '18px 22px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: smsAddon ? '#000' : '#fff',
                  color: smsAddon ? '#fff' : '#000',
                  transition: 'all 0.15s',
                  boxShadow: smsAddon ? '0 24px 56px rgba(0,0,0,0.12)' : '0 10px 28px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 15 }}>SMS напомняния</p>
                  <p style={{ fontSize: 13, margin: 0, opacity: 0.5 }}>
                    Автоматични SMS напомняния до клиентите
                  </p>
                </div>
                <span style={{
                  border: smsAddon ? '1.5px solid #fff' : '1.5px solid #000',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: smsAddon ? '#000' : '#fff',
                  color: smsAddon ? '#fff' : '#000',
                }}>
                  {smsAddon ? 'Добавено' : 'По избор'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>+ 9 € / мес.</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 2 — INFO
        ═══════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Твоята информация
            </h1>
            <p style={{ color: '#000', marginBottom: 28, fontSize: 15, lineHeight: 1.5 }}>
              Полетата с * са задължителни
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Name + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Име на салона *</label>
                  <input style={inp} value={form.name} placeholder="Салон Мими"
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Категория</label>
                  <select style={inp} value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Phone + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Телефон *</label>
                  <input type="tel" style={inp} value={form.phone} placeholder="+359 88 888 8888"
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Имейл *</label>
                  <input type="email" style={inp} value={form.email} placeholder="mimi@example.com"
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              {/* City + Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Град *</label>
                  <input style={inp} value={form.city} placeholder="София"
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Адрес</label>
                  <input
                    ref={addressRef}
                    style={inp}
                    value={addressQuery || form.address}
                    placeholder="ул. Витоша 42"
                    onChange={e => {
                      setAddressQuery(e.target.value);
                      setForm(f => ({ ...f, address: e.target.value }));
                    }}
                    autoComplete="off"
                  />
                  {(addressLoading || addressResults.length > 0) && (
                    <div style={{ marginTop: 8, border: '1.5px solid #000', borderRadius: 14, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                      {addressLoading && (
                        <div style={{ padding: '10px 12px', fontSize: 13, color: '#000' }}>Търсим адреси…</div>
                      )}
                      {!addressLoading && addressResults.map((r, i) => (
                        <button
                          key={`${r.lat}-${r.lon}-${i}`}
                          type="button"
                          onClick={() => {
                            const lat = Number(r.lat);
                            const lng = Number(r.lon);
                            const city = r.address?.city || r.address?.town || r.address?.village || r.address?.county || form.city;
                            setForm(f => ({ ...f, address: r.display_name, city }));
                            setAddressQuery(r.display_name);
                            setPickedLat(lat);
                            setPickedLng(lng);
                            setGoogleMapsUrl(buildOsmEmbedUrl(lat, lng));
                            setAddressResults([]);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            border: 'none',
                            borderBottom: i < addressResults.length - 1 ? '1px solid #000' : 'none',
                            background: '#fff',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: 13,
                            lineHeight: 1.4,
                          }}
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Map picker */}
              <div>
                <label style={lbl}>Локация на картата</label>
                <p style={hint}>Започни да пишеш адрес и избери от предложенията (OpenStreetMap, без Google API ключ).</p>
                {mapsError && (
                  <div style={{ background: '#fff', border: '1.5px solid #000', borderRadius: 16, padding: '12px 14px', color: '#000', fontSize: 13, marginBottom: 8 }}>
                    {mapsError}
                  </div>
                )}
                {googleMapsUrl ? (
                  <iframe
                    src={googleMapsUrl}
                    title="Локация"
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 220,
                      borderRadius: 18,
                      border: '1.5px solid #000',
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 220,
                      borderRadius: 18,
                      border: '1.5px solid #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: 12,
                    }}
                  >
                    Избери адрес от предложенията, за да покажем картата.
                  </div>
                )}
                {pickedLat !== null && pickedLng !== null && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#000' }}>
                    Избрано: {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* About */}
              <div>
                <label style={lbl}>За нас</label>
                <textarea style={{ ...inp, minHeight: 96, resize: 'vertical' }}
                  value={form.about} placeholder="Кратко описание на салона..."
                  onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
              </div>

              {/* Social */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Instagram (по желание)</label>
                  <input style={inp} value={form.instagram} placeholder="@salonmimi"
                    onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Facebook (по желание)</label>
                  <input style={inp} value={form.facebook} placeholder="salonmimi"
                    onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} />
                </div>
              </div>

              {/* Logo */}
              <FileUpload
                label="Лого (по желание)"
                hint="PNG с прозрачен фон работи най-добре"
                value={logoUrl}
                loading={!!uploading['logo']}
                onChange={async file => { const url = await uploadFile(file, 'logo'); setLogoUrl(url); }}
              />

              {/* Price lists */}
              <div>
                <label style={lbl}>
                  Снимки на ценоразпис
                  {priceListUrls.length > 0 && (
                    <span style={{ fontWeight: 500, color: '#000', marginLeft: 8 }}>
                      {priceListUrls.length} файла
                    </span>
                  )}
                </label>
                <p style={hint}>Качи 1 или повече снимки. Ще обединим услугите от всички.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {priceListUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #000' }}>
                      <img src={url} alt={`Ценоразпис ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setPriceListUrls(prev => prev.filter((_, j) => j !== i))}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.65)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                    </div>
                  ))}
                  <label style={{
                    aspectRatio: '1', borderRadius: 16,
                    border: '1.5px solid #000',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: uploading['pricelist'] ? 'wait' : 'pointer', gap: 4,
                    background: '#fff',
                  }}>
                    <Upload size={22} color="#000" strokeWidth={1.75} />
                    <span style={{ fontSize: 11, color: '#000', fontWeight: 600 }}>
                      {uploading['pricelist'] ? '...' : 'Добави'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={async e => {
                        if (!e.target.files) return;
                        const next: string[] = [];
                        for (const file of Array.from(e.target.files)) {
                          const url = await uploadFile(file, `pricelist-${Date.now()}`);
                          next.push(url);
                        }
                        const combined = [...priceListUrls, ...next];
                        setPriceListUrls(combined);
                        await analyzePriceLists(combined);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Extracted services */}
              {(priceListUrls.length > 0 || servicesLoading || services.length > 0) && (
                <div>
                  <label style={lbl}>Услуги за резервиране</label>
                  <p style={hint}>
                    {servicesLoading
                      ? 'Разчитаме ценоразписа…'
                      : 'Провери и редактирай услугите. Това са услугите, които клиентите ще виждат за резервиране.'}
                  </p>

                  {servicesError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', color: '#dc2626', fontSize: 14, marginBottom: 10 }}>
                      {servicesError}
                    </div>
                  )}

                  {!servicesLoading && services.length === 0 ? (
                    <div style={{ border: '1px solid rgba(0,0,0,0.78)', borderRadius: 22, padding: 18, background: '#fff', boxShadow: '0 10px 26px rgba(0,0,0,0.05)' }}>
                      <p style={{ margin: 0, color: '#000', fontSize: 14 }}>
                        Не открихме услуги. Можеш да качиш по-ясна снимка.
                      </p>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid rgba(0,0,0,0.78)', borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 14px 34px rgba(0,0,0,0.06)' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1.8fr) 74px 74px 18px',
                          gap: 10,
                          padding: '12px 14px 10px',
                          background: '#fff',
                          borderBottom: services.length > 0 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#000',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <span>Услуга</span>
                        <span style={{ textAlign: 'right' }}>Цена (€)</span>
                        <span style={{ textAlign: 'right' }}>Време (мин.)</span>
                        <span />
                      </div>
                      {services.map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0,1.8fr) 74px 74px 18px',
                            gap: 10,
                            padding: '12px 14px',
                            borderBottom: idx < services.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            style={{ ...inp, padding: '10px 12px', fontSize: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.03)' }}
                            value={s.name}
                            placeholder="Име на услуга"
                            onChange={(e) => setServices(prev => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                          />
                          <input
                            style={{ ...inp, padding: '8px 10px', fontSize: 13, textAlign: 'right' }}
                            value={String(s.price)}
                            inputMode="numeric"
                            placeholder="напр. 25 €"
                            onChange={(e) => setServices(prev => prev.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) || 0 } : x)))}
                          />
                          <input
                            style={{ ...inp, padding: '8px 10px', fontSize: 13, textAlign: 'right' }}
                            value={String(s.duration_min)}
                            inputMode="numeric"
                            placeholder="напр. 45"
                            onChange={(e) => setServices(prev => prev.map((x, i) => (i === idx ? { ...x, duration_min: Number(e.target.value) || 30 } : x)))}
                          />
                          <button
                            type="button"
                            onClick={() => setServices(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              width: 18,
                              height: 18,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontWeight: 500,
                              fontSize: 18,
                              lineHeight: 1,
                              padding: 0,
                              color: '#000',
                            }}
                            aria-label="Премахни услуга"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!servicesLoading && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setServices(prev => [...prev, { name: '', price: 0, duration_min: 30 }])}
                        style={{
                          padding: '6px 0',
                          borderRadius: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 14,
                          color: '#000',
                        }}
                      >
                        + Добави услуга
                      </button>
                      {priceListUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={() => analyzePriceLists(priceListUrls)}
                          style={{
                            padding: '6px 0',
                            borderRadius: 0,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 13,
                            color: '#000',
                          }}
                        >
                          Разчети отново
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Gallery */}
              <div>
                <label style={lbl}>
                  Галерия
                  {galleryUrls.length > 0 && (
                    <span style={{ fontWeight: 500, color: '#000', marginLeft: 8 }}>
                      {galleryUrls.length} снимки
                    </span>
                  )}
                </label>
                <p style={hint}>Снимки от работата, резултати, интериор</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {galleryUrls.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setCoverFromGallery(url)}
                      title="Кликни, за да избереш като начална снимка"
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 16,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        outline: '1.5px solid #000',
                        outlineOffset: 1,
                      }}
                    >
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {coverUrl === url && (
                        <div style={{
                          position: 'absolute',
                          left: 6,
                          bottom: 6,
                          background: 'rgba(17,17,17,0.92)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '4px 6px',
                          borderRadius: 999,
                          letterSpacing: '0.04em',
                        }}>
                          НАЧАЛНА
                        </div>
                      )}
                      <button
                        onClick={() => setGalleryUrls(prev => prev.filter((_, j) => j !== i))}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.65)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                    </div>
                  ))}
                  <label style={{
                    aspectRatio: '1', borderRadius: 16,
                    border: '1.5px solid #000',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: uploading['gallery'] ? 'wait' : 'pointer', gap: 4,
                    background: '#fff',
                  }}>
                    <Upload size={22} color="#000" strokeWidth={1.75} />
                    <span style={{ fontSize: 11, color: '#000', fontWeight: 600 }}>
                      {uploading['gallery'] ? '...' : 'Добави'}
                    </span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={async e => {
                        if (!e.target.files) return;
                        for (const file of Array.from(e.target.files)) {
                          setUploading(u => ({ ...u, gallery: true }));
                          const url = await uploadFile(file, `gallery-${Date.now()}`);
                          setGalleryUrls(prev => [...prev, url]);
                          setCoverUrl(prevCover => prevCover || url);
                          setUploading(u => ({ ...u, gallery: false }));
                        }
                      }}
                    />
                  </label>
                </div>
                {galleryUrls.length > 0 && (
                  <p style={{ marginTop: 10, fontSize: 12, color: '#000' }}>
                    Кликни върху снимка, за да я избереш за <strong>начална</strong>.
                  </p>
                )}
              </div>

              {/* Working hours */}
              <div>
                <label style={lbl}>Работно време</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {DAYS.map((day) => {
                    const h = hours[day.key];
                    return (
                      <div key={day.key} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 0',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ width: 106, fontSize: 13, fontWeight: 600, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.closed ? 'transparent' : '#16a34a', display: 'inline-block' }} />
                          {day.label}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
                          <input type="checkbox" checked={h.closed}
                            onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], closed: e.target.checked } }))} />
                          <span style={{ fontSize: 12, color: '#000' }}>Затворено</span>
                        </label>
                        {!h.closed && (
                          <>
                            <input type="time" value={h.open}
                              onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], open: e.target.value } }))}
                              style={{ fontSize: 12, border: '1px solid rgba(0,0,0,0.65)', borderRadius: 999, padding: '6px 10px', fontFamily: 'inherit', background: '#fff' }} />
                            <span style={{ fontSize: 13, color: '#000' }}>до</span>
                            <input type="time" value={h.close}
                              onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], close: e.target.value } }))}
                              style={{ fontSize: 12, border: '1px solid rgba(0,0,0,0.65)', borderRadius: 999, padding: '6px 10px', fontFamily: 'inherit', background: '#fff' }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 3 — PAYMENT
        ═══════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Потвърди поръчката
            </h1>
            <p style={{ color: '#000', marginBottom: 28, fontSize: 15, lineHeight: 1.5 }}>
              {SHOW_SKIP_PAYMENT_UI
                ? 'Демо режим: сайтът се активира веднага, без плащане.'
                : 'Прегледай детайлите преди плащане'}
            </p>

            {/* SITE PREVIEW */}
            {selectedTemplate && (
              <SitePreview
                template={{ ...selectedTemplate, ...MONO_THEME } as any}
                form={form}
                hours={hours}
                coverUrl={coverUrl}
                logoUrl={logoUrl}
                galleryUrls={galleryUrls}
                googleMapsUrl={googleMapsUrl}
                services={services}
              />
            )}

            {/* Summary card */}
            <div style={{ border: '1.5px solid #000', borderRadius: 28, padding: '28px', marginBottom: 20, boxShadow: '0 14px 40px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>
                    {form.name || 'Вашият салон'}
                  </p>
                  <p style={{ fontSize: 14, color: '#000', margin: '0 0 2px' }}>
                    {selectedPlan?.name} — {selectedPlan?.desc}
                  </p>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${MONO_THEME.primary}, ${MONO_THEME.light})`,
                }} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '16px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                    <span style={{ color: '#000' }}>{f}</span>
                  </div>
                ))}
                {smsAddon && (
                  <div style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                    <span style={{ color: '#000' }}>SMS напомняния (+9 € / мес.)</span>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Общо</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, fontSize: 26, margin: '0 0 2px' }}>
                    {selectedPlan?.price} € / година
                  </p>
                  {smsAddon && (
                    <p style={{ fontSize: 12, color: '#000', margin: 0 }}>
                      + 9 € / месец за SMS
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '12px 16px', color: '#dc2626', fontSize: 14, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '18px 24px',
                background: '#000', color: '#fff', border: 'none',
                borderRadius: 14, fontSize: 17, fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              {isSubmitting
                ? SHOW_SKIP_PAYMENT_UI
                  ? 'Създавам тестовия сайт...'
                  : 'Пренасочване към Stripe...'
                : SHOW_SKIP_PAYMENT_UI
                  ? 'Създай сайта без плащане →'
                  : 'Плати сега →'}
            </button>

            {!SHOW_SKIP_PAYMENT_UI && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#000', marginTop: 12 }}>
                Сигурно плащане през Stripe
              </p>
            )}
          </div>
        )}

        {/* NAVIGATION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, gap: 12 }}>
          {step > 1 && (
            <button
              onClick={() => { setError(''); setStep(s => s - 1); }}
              style={{
                padding: '14px 24px', background: '#fff',
                color: '#000', border: '1.5px solid #000', borderRadius: 999,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Назад
            </button>
          )}

          {step < 3 && (
            <button
              onClick={next}
              style={{
                padding: '14px 28px', marginLeft: 'auto',
                background: canProceed() ? '#000' : '#fff',
                color: canProceed() ? '#fff' : '#000',
                border: '1.5px solid #000', borderRadius: 999,
                fontSize: 15, fontWeight: 700,
                cursor: canProceed() ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              Продължи →
            </button>
          )}
        </div>

        {error && step < 3 && (
          <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, textAlign: 'right' }}>{error}</p>
        )}
      </div>
    </div>
  );
}

/* ── FileUpload ───────────────────────────────────────── */
function FileUpload({
  label, hint: hintText, value, loading, onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  loading: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {hintText && <p style={hint}>{hintText}</p>}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        border: '1.5px solid #000', borderRadius: 18,
        cursor: loading ? 'wait' : 'pointer',
        background: '#fff',
      }}>
        {value ? (
          <>
            <img src={value} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>Снимката е качена</p>
              <p style={{ fontSize: 12, color: '#000', margin: 0 }}>Кликни за замяна</p>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Upload size={22} color="#000" strokeWidth={1.75} />
            <span style={{ fontSize: 14, color: '#000', fontWeight: 600 }}>
              {loading ? 'Качване...' : 'Добави снимка'}
            </span>
          </div>
        )}
        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
      </label>
    </div>
  );
}

/* ── SitePreview ──────────────────────────────────────── */
function SitePreview({
  template, form, hours, coverUrl, logoUrl, galleryUrls, googleMapsUrl, services,
}: {
  template: { primary: string; light: string; name: string };
  form: { name: string; category: string; city: string; address: string; phone: string; about: string };
  hours: Record<string, WorkingDay>;
  coverUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  googleMapsUrl: string;
  services: Service[];
}) {
  const [previewVersion, setPreviewVersion] = useState(0);
  const previewPayload = JSON.stringify({
    template,
    form,
    hours,
    coverUrl,
    logoUrl,
    galleryUrls,
    googleMapsUrl,
    services,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      template,
      form,
      hours,
      coverUrl,
      logoUrl,
      galleryUrls,
      googleMapsUrl,
      services,
    };
    window.localStorage.setItem(CREATE_PREVIEW_KEY, JSON.stringify(payload));
    setPreviewVersion(v => v + 1);
  }, [previewPayload]);

  const previewSrc = `/demo?v=${previewVersion}`;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Преглед на сайта
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {}}
          style={{
            padding: '7px 11px',
            borderRadius: 999,
            border: '1.5px solid #000',
            background: '#111',
            color: '#fff',
            fontWeight: 500,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Мобилен
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            window.open(previewSrc, '_blank', 'noopener,noreferrer');
          }}
          style={{
            padding: '7px 11px',
            borderRadius: 999,
            border: '1.5px solid #000',
            background: '#fff',
            color: '#111',
            fontWeight: 500,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Уеб
        </button>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        <div
          style={{
            width: 393,
            maxWidth: '100%',
            margin: '0 auto',
            borderRadius: 56,
            padding: 11,
            background: 'linear-gradient(180deg, #111111, #1b1b1b 38%, #0b0b0b 100%)',
            boxShadow: '0 34px 110px rgba(0,0,0,0.34)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: -3, top: 140, width: 4, height: 46, borderRadius: 999, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', left: -3, top: 200, width: 4, height: 72, borderRadius: 999, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', right: -3, top: 174, width: 4, height: 96, borderRadius: 999, background: 'rgba(0,0,0,0.45)' }} />

          <div
            style={{
              borderRadius: 46,
              overflow: 'hidden',
              background: '#fff',
              border: '1px solid rgba(255,255,255,0.10)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 126,
                height: 36,
                background: '#0b0b0b',
                borderRadius: 999,
                zIndex: 20,
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              }}
            />

            <div
              style={{
                height: 852,
                background: '#fff',
              }}
            >
              {previewVersion > 0 ? (
                <iframe
                  key={`phone-${previewVersion}`}
                  src={previewSrc}
                  title="Preview на реалния сайт"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
