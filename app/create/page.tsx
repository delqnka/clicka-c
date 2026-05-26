'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ClickaLogo } from '@/components/brand/clicka-logo';
import { Upload } from 'lucide-react';
import {
  cityFromOsmResult,
  osmEmbedUrl,
  type AddressSearchResult,
  searchAddresses,
} from '@/lib/address-search';

/* ─── Draft keys ───────────────────────────────────────────── */
const DRAFT_KEY   = 'clicka-create-draft-v2';
const PREVIEW_KEY = 'clicka-create-preview-v1';

const SKIP_PAYMENT =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SKIP_CHECKOUT === '1';

/* ─── Constants ────────────────────────────────────────────── */
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

const PLANS = [
  { id: 'solo',   name: 'Solo',   price: 299, daily: '0.82', desc: '1 специалист' },
  { id: 'ekip',   name: 'Екип',   price: 399, daily: '1.09', desc: 'до 3 специалисти', popular: true },
  { id: 'studio', name: 'Студио', price: 599, daily: '1.64', desc: 'без ограничения' },
];

const PLAN_FEATURES = [
  'Готов сайт за 15 минути',
  'Резервационна система',
  'Google Calendar sync',
  'Telegram нотификации',
  'Email потвърждения',
  'Собствен домейн с 1 клик',
  'Хостинг включен',
];

const STEP_LABELS = ['Информация', 'Детайли', 'План', 'Плащане'];

/* ─── Types ────────────────────────────────────────────────── */
type WorkingDay = { open: string; close: string; closed: boolean };
type Service    = { name: string; price: number; duration_min: number };
const DEFAULT_HOURS: Record<string, WorkingDay> = {
  monday:    { open: '09:00', close: '18:00', closed: false },
  tuesday:   { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday:  { open: '09:00', close: '18:00', closed: false },
  friday:    { open: '09:00', close: '18:00', closed: false },
  saturday:  { open: '10:00', close: '16:00', closed: false },
  sunday:    { open: '',      close: '',      closed: true  },
};

/* ─── Scoped CSS ───────────────────────────────────────────── */
const CSS = `
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes spin   { to { transform:rotate(360deg); } }
  @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.35} }

  .cr-page {
    min-height:100dvh; background:#FAF8F5; color:#1C1917;
    font-family: var(--font-body,'Inter',system-ui,sans-serif);
    -webkit-font-smoothing:antialiased;
  }
  .cr-nav {
    position:sticky; top:0; z-index:50;
    background:rgba(250,248,245,.94);
    backdrop-filter:blur(20px) saturate(160%);
    -webkit-backdrop-filter:blur(20px) saturate(160%);
    border-bottom:1px solid rgba(28,25,23,.07);
    height:60px; display:flex; align-items:center;
    justify-content:space-between; padding:0 18px;
  }
  .cr-step-wrap {
    animation:fadeUp .45s cubic-bezier(.16,1,.3,1);
    max-width:680px; margin:0 auto;
    padding:36px 20px 88px;
  }
  .font-display { font-family:var(--font-display,'Merriweather',Georgia,serif); }

  /* Progress */
  .cr-progress { display:flex; align-items:center; gap:0; margin-bottom:48px; }
  .cr-prog-step { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
  .cr-prog-dot {
    width:28px; height:28px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:700;
    transition:background .25s, color .25s, border-color .25s;
  }
  .cr-prog-line { flex:1; height:1px; background:#E7E5E4; margin-top:-14px; }

  /* Input system */
  .cr-label {
    display:block; font-size:13px; font-weight:600; margin-bottom:7px; color:#1C1917;
  }
  .cr-input {
    width:100%; padding:13px 15px;
    border:1.5px solid #E7E5E4; border-radius:14px;
    font-size:16px; font-family:inherit; outline:none;
    background:#fff; color:#1C1917;
    box-sizing:border-box;
    transition:border-color .2s, box-shadow .2s;
    -webkit-appearance:none; appearance:none;
  }
  .cr-input:focus {
    border-color:#1C1917;
    box-shadow:0 0 0 3px rgba(28,25,23,.08);
  }
  .cr-input::placeholder { color:#A8A29E; }
  .cr-hint { font-size:13px; color:#78716C; margin:0 0 10px; line-height:1.57; }

  /* Grid helpers */
  .cr-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .cr-grid-city { display:grid; grid-template-columns:160px 1fr; gap:14px; }
  @media (max-width:500px) {
    .cr-grid-2    { grid-template-columns:1fr; }
    .cr-grid-city { grid-template-columns:1fr; }
  }

  /* Card */
  .cr-card {
    background:#fff; border:1.5px solid #E7E5E4; border-radius:22px;
    padding:26px; margin-bottom:14px;
    transition:border-color .25s, box-shadow .25s;
  }
  .cr-card:hover { border-color:#D6D3D1; }
  .cr-card.selected { border-color:#1C1917; box-shadow:0 0 0 1px #1C1917; }
  .cr-card.popular-selected { border-color:#B07D2E; box-shadow:0 0 0 1px #B07D2E; }

  /* Plan card */
  .cr-plan-card {
    background:#fff; border:1.5px solid #E7E5E4; border-radius:22px;
    padding:22px; cursor:pointer; position:relative;
    transition:all .2s ease;
  }
  .cr-plan-card:hover    { border-color:#D6D3D1; box-shadow:0 6px 20px rgba(28,25,23,.07); }
  .cr-plan-card.selected { border-color:#1C1917; box-shadow:0 0 0 1px #1C1917; }
  .cr-plan-card.popular  { border-color:#B07D2E; }
  .cr-plan-card.popular.selected { box-shadow:0 0 0 1px #B07D2E; }

  /* Primary button */
  .cr-btn-primary {
    width:100%; padding:16px 24px;
    background:#1C1917; color:#FAF8F5;
    border:none; border-radius:14px; font-size:16px; font-weight:700;
    cursor:pointer; font-family:inherit;
    transition:transform .2s ease, box-shadow .2s ease, opacity .15s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .cr-btn-primary:hover:not(:disabled) {
    transform:translateY(-1px);
    box-shadow:0 8px 24px rgba(28,25,23,.2);
  }
  .cr-btn-primary:disabled { opacity:.6; cursor:not-allowed; }

  /* Secondary button */
  .cr-btn-ghost {
    padding:12px 24px; background:#fff; color:#1C1917;
    border:1.5px solid #E7E5E4; border-radius:14px;
    font-size:14px; font-weight:600; cursor:pointer; font-family:inherit;
    transition:border-color .2s, box-shadow .2s;
  }
  .cr-btn-ghost:hover { border-color:#D6D3D1; box-shadow:0 2px 8px rgba(28,25,23,.06); }

  /* Error */
  .cr-error {
    background:#FEF2F2; border:1px solid #FECACA; border-radius:12px;
    padding:12px 14px; color:#DC2626; font-size:14px; line-height:1.5;
    margin-bottom:14px;
  }

  /* Spinner */
  .cr-spinner {
    width:18px; height:18px; border-radius:50%;
    border:2.5px solid rgba(250,248,245,.3);
    border-top-color:#FAF8F5;
    animation:spin .75s linear infinite; display:inline-block;
  }

  /* Gallery grid */
  .cr-gallery { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  @media (max-width:400px) { .cr-gallery { grid-template-columns:repeat(3,1fr); } }

  /* Services table */
  .cr-services-table {
    border:1.5px solid #E7E5E4; border-radius:18px; overflow:hidden;
    background:#fff;
  }

  /* Phone preview (step 2) */
  .cr-preview-phone { animation:float 6s ease-in-out infinite; }

  /* Working hours */
  .cr-hours-row { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; border-bottom:1px solid #F5F4F2; }
  .cr-hours-row:last-child { border-bottom:none; }

  /* SMS toggle */
  .cr-sms-toggle {
    background:#fff; border:1.5px solid #E7E5E4; border-radius:18px;
    padding:18px 20px; cursor:pointer; display:flex; align-items:center; gap:14px;
    transition:all .18s ease;
  }
  .cr-sms-toggle.on  { background:#1C1917; color:#FAF8F5; border-color:#1C1917; }

  /* Check badge */
  .cr-check-badge {
    width:20px; height:20px; border-radius:50%;
    border:1.5px solid #E7E5E4;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    transition:all .18s;
  }
  .cr-check-badge.on { background:#1C1917; border-color:#1C1917; }
  .cr-check-badge.brass { background:#B07D2E; border-color:#B07D2E; }

  @media (prefers-reduced-motion:reduce) {
    .cr-step-wrap   { animation:none; }
    .cr-preview-phone { animation:none; }
    * { transition-duration:.01ms !important; }
  }
`;

/* ════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════ */
export default function CreatePage() {
  const [step, setStep]             = useState(1);
  const [planId, setPlanId]         = useState('');
  const [smsAddon, setSmsAddon]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    name: '', city: '', email: '',
    phone: '', category: 'Фризьорски салон',
    address: '', about: '', instagram: '', facebook: '',
  });

  const [hours, setHours] = useState<Record<string, WorkingDay>>(DEFAULT_HOURS);
  const [logoUrl,       setLogoUrl]       = useState('');
  const [galleryUrls,   setGalleryUrls]   = useState<string[]>([]);
  const [coverUrl,      setCoverUrl]      = useState('');
  const [priceListUrls, setPriceListUrls] = useState<string[]>([]);
  const [services,      setServices]      = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError,   setServicesError]   = useState('');
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [pickedLat, setPickedLat]         = useState<number | null>(null);
  const [pickedLng, setPickedLng]         = useState<number | null>(null);
  const [addressQuery, setAddressQuery]   = useState('');
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const tempSlug = useRef(`draft-${Math.random().toString(36).slice(2, 8)}`);

  /* ── Restore draft ─────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.step === 'number') setStep(Math.min(Math.max(d.step, 1), 4));
      if (typeof d.planId === 'string') setPlanId(d.planId);
      if (typeof d.smsAddon === 'boolean') setSmsAddon(d.smsAddon);
      if (d.form && typeof d.form === 'object') setForm(f => ({ ...f, ...(d.form as typeof f) }));
      if (d.hours && typeof d.hours === 'object') setHours(d.hours as typeof hours);
      if (typeof d.logoUrl === 'string') setLogoUrl(d.logoUrl);
      if (Array.isArray(d.galleryUrls)) setGalleryUrls(d.galleryUrls as string[]);
      if (typeof d.coverUrl === 'string') setCoverUrl(d.coverUrl);
      if (Array.isArray(d.priceListUrls)) setPriceListUrls(d.priceListUrls as string[]);
      if (Array.isArray(d.services)) setServices(d.services as Service[]);
      if (typeof d.googleMapsUrl === 'string') setGoogleMapsUrl(d.googleMapsUrl);
      if (typeof d.pickedLat === 'number') setPickedLat(d.pickedLat);
      if (typeof d.pickedLng === 'number') setPickedLng(d.pickedLng);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-save draft ───────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      step, planId, smsAddon, form, hours,
      logoUrl, galleryUrls, coverUrl, priceListUrls, services,
      googleMapsUrl, pickedLat, pickedLng,
    }));
  }, [step, planId, smsAddon, form, hours, logoUrl, galleryUrls, coverUrl, priceListUrls, services, googleMapsUrl, pickedLat, pickedLng]);

  /* ── Address search (OpenStreetMap / Nominatim) ── */
  useEffect(() => {
    if (step !== 2) return;
    const q = addressQuery.trim();
    if (q.length < 3) { setAddressResults([]); setAddressLoading(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const data = await searchAddresses(q);
        if (!ctrl.signal.aborted) setAddressResults(data);
      } catch {
        if (!ctrl.signal.aborted) setAddressResults([]);
      } finally {
        if (!ctrl.signal.aborted) setAddressLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [addressQuery, step]);

  /* ── Upload ────────────────────────────────────────────── */
  async function uploadFile(file: File, field: string): Promise<string> {
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/upload?slug=${tempSlug.current}`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      return url;
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  }

  /* ── AI price list analysis ────────────────────────────── */
  async function analyzePriceLists(urls: string[]) {
    setServicesLoading(true); setServicesError('');
    try {
      const merged: Service[] = []; const seen = new Set<string>();
      for (const imageUrl of urls) {
        const res = await fetch('/api/analyze-price-list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Грешка при анализ');
        const parsed = (Array.isArray(data) ? data : []) as Service[];
        parsed
          .filter(s => s?.name?.trim())
          .map(s => ({ name: String(s.name).trim(), price: Number(s.price) || 0, duration_min: Math.max(5, Number(s.duration_min) || 30) }))
          .forEach(s => {
            const k = `${s.name.toLowerCase()}|${s.price}|${s.duration_min}`;
            if (!seen.has(k)) { seen.add(k); merged.push(s); }
          });
      }
      setServices(merged);
    } catch (err) {
      setServices([]); setServicesError(err instanceof Error ? err.message : 'Грешка при анализ');
    } finally { setServicesLoading(false); }
  }

  /* ── Validation ────────────────────────────────────────── */
  function canProceed() {
    if (step === 1) return !!(form.name.trim() && form.city.trim() && form.email.trim() && form.phone.trim());
    if (step === 3) return planId !== '';
    return true;
  }

  /* ── Navigation ────────────────────────────────────────── */
  function next() {
    if (!canProceed()) { setError('Моля попълнете задължителните полета.'); return; }
    setError(''); setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function back() { setError(''); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ── Checkout ──────────────────────────────────────────── */
  async function handlePay() {
    setIsSubmitting(true); setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 1, planType: planId, smsAddon,
          salonData: {
            ...form,
            workingHours:  hours,
            coverImageUrl: coverUrl,
            logoImageUrl:  logoUrl,
            galleryImages: galleryUrls,
            priceListUrls, googleMapsUrl, services,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Грешка');
      if (data.skipCheckout) {
        const dest = data.slug
          ? `${window.location.origin}/${data.slug}/claim`
          : (data.instantClaimUrl || data.claimUrl || data.publicUrl || null);
        if (dest) { window.location.href = dest; return; }
      }
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      throw new Error('Няма линк за плащане');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при пренасочване');
      setIsSubmitting(false);
    }
  }

  /* ── Reset ─────────────────────────────────────────────── */
  function resetAll() {
    window.localStorage.removeItem(DRAFT_KEY);
    setStep(1); setPlanId(''); setSmsAddon(false);
    setForm({ name:'', city:'', email:'', phone:'', category:'Фризьорски салон', address:'', about:'', instagram:'', facebook:'' });
    setHours(DEFAULT_HOURS);
    setLogoUrl(''); setGalleryUrls([]); setCoverUrl('');
    setPriceListUrls([]); setServices([]); setServicesError('');
    setGoogleMapsUrl(''); setPickedLat(null); setPickedLng(null);
    setError('');
  }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="cr-page">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="cr-nav" aria-label="Навигация за създаване на сайт">
        <ClickaLogo size="compact" />
        <button
          onClick={resetAll}
          style={{ background: 'none', border: '1.5px solid #E7E5E4', borderRadius: 9999, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#78716C', fontFamily: 'inherit' }}
          aria-label="Започни отначало"
        >
          Започни отначало
        </button>
      </nav>

      <div className="cr-step-wrap" key={step}>

        {/* ── PROGRESS ─────────────────────────────────────── */}
        <div className="cr-progress" role="navigation" aria-label="Стъпки на процеса">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div className="cr-prog-step">
                  <div
                    className="cr-prog-dot"
                    style={{
                      background: done ? '#1C1917' : active ? '#1C1917' : '#fff',
                      color:      done || active ? '#FAF8F5' : '#A8A29E',
                      border:     done || active ? 'none' : '1.5px solid #E7E5E4',
                    }}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#FAF8F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : n
                    }
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#1C1917' : '#A8A29E', whiteSpace: 'nowrap', letterSpacing: '.02em' }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className="cr-prog-line" style={{ background: done ? '#1C1917' : '#E7E5E4' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════
            STEP 1 — Quick start
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>
              Нека започнем
            </h1>
            <p style={{ color: '#78716C', marginBottom: 36, fontSize: 16, lineHeight: 1.6 }}>
              Попълни основните данни за твоя салон.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="cr-label" htmlFor="salon-name">Име на салона *</label>
                <input
                  id="salon-name"
                  className="cr-input"
                  value={form.name}
                  placeholder="напр. Салон Мими"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  autoComplete="organization"
                  aria-required="true"
                />
              </div>

              <div>
                <label className="cr-label" htmlFor="salon-city">Град *</label>
                <input
                  id="salon-city"
                  className="cr-input"
                  value={form.city}
                  placeholder="напр. София"
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  autoComplete="address-level2"
                  aria-required="true"
                />
              </div>

              <div>
                <label className="cr-label" htmlFor="salon-email">Имейл *</label>
                <input
                  id="salon-email"
                  type="email"
                  className="cr-input"
                  value={form.email}
                  placeholder="mimi@example.com"
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                  aria-required="true"
                />
                <p className="cr-hint" style={{ marginTop: 6 }}>На този имейл ще получиш код за достъп до панела.</p>
              </div>

              <div className="cr-grid-2">
                <div>
                  <label className="cr-label" htmlFor="cr-phone">Телефон *</label>
                  <input id="cr-phone" type="tel" className="cr-input" value={form.phone} placeholder="+359 88 888 8888"
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" aria-required="true" />
                </div>
                <div>
                  <label className="cr-label" htmlFor="cr-category">Категория</label>
                  <select id="cr-category" className="cr-input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {error && <div className="cr-error" role="alert">{error}</div>}

            <div style={{ marginTop: 32 }}>
              <button className="cr-btn-primary" onClick={next} disabled={!canProceed()}>
                Продължи →
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 20, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['0% комисионна', 'Без скрити такси', 'Готов за 15 мин'].map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#A8A29E' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — Enrich / Details
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,40px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.15 }}>
              Добави детайли
            </h1>
            <p style={{ color: '#78716C', marginBottom: 36, fontSize: 15, lineHeight: 1.6 }}>
              Всичко по-долу е по желание. Можеш да редактираш и по-късно.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Logo */}
              <FileUploadField
                label="Лого (по желание)"
                hint="PNG с прозрачен фон работи най-добре"
                value={logoUrl}
                loading={!!uploading['logo']}
                onChange={async file => { const url = await uploadFile(file, 'logo'); setLogoUrl(url); }}
              />

              {/* Price list with AI */}
              <div>
                <label className="cr-label">
                  Снимки на ценоразпис
                  {priceListUrls.length > 0 && (
                    <span style={{ fontWeight: 500, color: '#78716C', marginLeft: 8 }}>({priceListUrls.length} файла)</span>
                  )}
                </label>
                <p className="cr-hint">Качи ценоразписа си — ние автоматично ще разчетем услугите с AI.</p>

                <div className="cr-gallery">
                  {priceListUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E7E5E4' }}>
                      <img src={url} alt={`Ценоразпис ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setPriceListUrls(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(28,25,23,.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label={`Премахни ценоразпис ${i + 1}`}
                      >✕</button>
                    </div>
                  ))}
                  <label style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed #E7E5E4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading['pricelist'] ? 'wait' : 'pointer', gap: 4, background: '#FAFAF8' }}>
                    <Upload size={20} color="#A8A29E" strokeWidth={1.75} />
                    <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 600 }}>{uploading['pricelist'] ? '...' : 'Добави'}</span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
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
              {(servicesLoading || services.length > 0 || priceListUrls.length > 0) && (
                <div>
                  <label className="cr-label">Услуги за резервиране</label>
                  <p className="cr-hint">{servicesLoading ? 'Разчитаме ценоразписа с AI…' : 'Провери и редактирай услугите.'}</p>
                  {servicesError && <div className="cr-error" role="alert">{servicesError}</div>}
                  {!servicesLoading && (
                    <div className="cr-services-table">
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.8fr) 72px 72px 20px', gap: 8, padding: '10px 14px', borderBottom: services.length > 0 ? '1px solid #F5F4F2' : 'none', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A8A29E' }}>
                        <span>Услуга</span><span style={{ textAlign: 'right' }}>Цена (€)</span><span style={{ textAlign: 'right' }}>Мин.</span><span />
                      </div>
                      {services.map((s, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.8fr) 72px 72px 20px', gap: 8, padding: '10px 14px', borderBottom: idx < services.length - 1 ? '1px solid #F5F4F2' : 'none', alignItems: 'center' }}>
                          <input className="cr-input" style={{ padding: '8px 10px', fontSize: 13 }} value={s.name} placeholder="Услуга"
                            onChange={e => setServices(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                          <input className="cr-input" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'right' }} value={String(s.price)} inputMode="numeric"
                            onChange={e => setServices(prev => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) || 0 } : x))} />
                          <input className="cr-input" style={{ padding: '8px 8px', fontSize: 13, textAlign: 'right' }} value={String(s.duration_min)} inputMode="numeric"
                            onChange={e => setServices(prev => prev.map((x, i) => i === idx ? { ...x, duration_min: Number(e.target.value) || 30 } : x))} />
                          <button onClick={() => setServices(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: 16, padding: 0, lineHeight: 1 }} aria-label="Премахни услуга">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!servicesLoading && (
                    <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                      <button onClick={() => setServices(prev => [...prev, { name: '', price: 0, duration_min: 30 }])}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1C1917', padding: 0, fontFamily: 'inherit' }}>
                        + Добави услуга
                      </button>
                      {priceListUrls.length > 0 && (
                        <button onClick={() => analyzePriceLists(priceListUrls)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13, color: '#78716C', padding: 0, fontFamily: 'inherit' }}>
                          Разчети отново
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Gallery */}
              <div>
                <label className="cr-label">
                  Галерия
                  {galleryUrls.length > 0 && <span style={{ fontWeight: 500, color: '#78716C', marginLeft: 8 }}>({galleryUrls.length} снимки)</span>}
                </label>
                <p className="cr-hint">Снимки от работата, резултати, интериор. Кликни снимка за начална.</p>
                <div className="cr-gallery">
                  {galleryUrls.map((url, i) => (
                    <div key={i} onClick={() => setCoverUrl(url)} title="Избери за начална снимка"
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${coverUrl === url ? '#1C1917' : '#E7E5E4'}` }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {coverUrl === url && (
                        <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(28,25,23,.88)', color: '#FAF8F5', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 999, letterSpacing: '.04em' }}>
                          НАЧАЛНА
                        </div>
                      )}
                      <button onClick={e => { e.stopPropagation(); setGalleryUrls(prev => prev.filter((_, j) => j !== i)); }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(28,25,23,.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Премахни снимка">✕</button>
                    </div>
                  ))}
                  <label style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed #E7E5E4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading['gallery'] ? 'wait' : 'pointer', gap: 4, background: '#FAFAF8' }}>
                    <Upload size={20} color="#A8A29E" strokeWidth={1.75} />
                    <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 600 }}>{uploading['gallery'] ? '...' : 'Добави'}</span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={async e => {
                        if (!e.target.files) return;
                        for (const file of Array.from(e.target.files)) {
                          setUploading(u => ({ ...u, gallery: true }));
                          const url = await uploadFile(file, `gallery-${Date.now()}`);
                          setGalleryUrls(prev => [...prev, url]);
                          setCoverUrl(prev => prev || url);
                          setUploading(u => ({ ...u, gallery: false }));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Address */}
              <div className="cr-grid-city">
                <div>
                  <label className="cr-label" htmlFor="cr-city2">Град</label>
                  <input id="cr-city2" className="cr-input" value={form.city} placeholder="София"
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="cr-label" htmlFor="cr-address">Адрес</label>
                  <input id="cr-address" className="cr-input" value={addressQuery || form.address} placeholder="ул. Витоша 42"
                    onChange={e => { setAddressQuery(e.target.value); setForm(f => ({ ...f, address: e.target.value })); }}
                    autoComplete="off" />
                  {(addressLoading || addressResults.length > 0) && (
                    <div style={{ marginTop: 6, border: '1.5px solid #E7E5E4', borderRadius: 14, overflow: 'hidden', maxHeight: 200, overflowY: 'auto', background: '#fff' }}>
                      {addressLoading && <div style={{ padding: '10px 14px', fontSize: 13, color: '#78716C' }}>Търсим…</div>}
                      {!addressLoading && addressResults.map((r, i) => (
                        <button key={`${r.lat}-${r.lon}-${i}`} type="button"
                          onClick={() => {
                            const lat = Number(r.lat);
                            const lng = Number(r.lon);
                            setForm(f => ({
                              ...f,
                              address: r.display_name,
                              city: cityFromOsmResult(r, f.city),
                            }));
                            setAddressQuery(r.display_name);
                            setPickedLat(lat);
                            setPickedLng(lng);
                            setGoogleMapsUrl(osmEmbedUrl(lat, lng));
                            setAddressResults([]);
                          }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: i < addressResults.length - 1 ? '1px solid #F5F4F2' : 'none', background: '#fff', padding: '10px 14px', cursor: 'pointer', fontSize: 13, lineHeight: 1.4, fontFamily: 'inherit' }}
                        >{r.display_name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {googleMapsUrl && (
                <iframe src={googleMapsUrl} title="Локация на картата" loading="lazy"
                  style={{ width: '100%', height: 180, borderRadius: 16, border: '1.5px solid #E7E5E4' }} />
              )}

              {/* About */}
              <div>
                <label className="cr-label" htmlFor="cr-about">За нас (по желание)</label>
                <textarea id="cr-about" className="cr-input" style={{ minHeight: 90, resize: 'vertical' }}
                  value={form.about} placeholder="Кратко описание на салона..."
                  onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
              </div>

              {/* Social */}
              <div className="cr-grid-2">
                <div>
                  <label className="cr-label" htmlFor="cr-ig">Instagram</label>
                  <input id="cr-ig" className="cr-input" value={form.instagram} placeholder="@salonmimi"
                    onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
                <div>
                  <label className="cr-label" htmlFor="cr-fb">Facebook</label>
                  <input id="cr-fb" className="cr-input" value={form.facebook} placeholder="salonmimi"
                    onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} />
                </div>
              </div>

              {/* Working hours */}
              <div>
                <label className="cr-label">Работно време</label>
                <div style={{ background: '#fff', border: '1.5px solid #E7E5E4', borderRadius: 18, padding: '4px 16px' }}>
                  {DAYS.map(day => {
                    const h = hours[day.key];
                    return (
                      <div key={day.key} className="cr-hours-row">
                        <span style={{ width: 100, fontSize: 13, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: h.closed ? '#E7E5E4' : '#22C55E', display: 'inline-block', flexShrink: 0 }} aria-hidden="true" />
                          {day.label}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0, fontSize: 12, color: '#78716C' }}>
                          <input type="checkbox" checked={h.closed}
                            onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], closed: e.target.checked } }))} />
                          Затворено
                        </label>
                        {!h.closed && (
                          <>
                            <input type="time" value={h.open}
                              onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], open: e.target.value } }))}
                              style={{ fontSize: 12, border: '1px solid #E7E5E4', borderRadius: 999, padding: '5px 10px', fontFamily: 'inherit', background: '#fff', color: '#1C1917' }}
                              aria-label={`${day.label} отваря`} />
                            <span style={{ fontSize: 12, color: '#78716C' }}>–</span>
                            <input type="time" value={h.close}
                              onChange={e => setHours(p => ({ ...p, [day.key]: { ...p[day.key], close: e.target.value } }))}
                              style={{ fontSize: 12, border: '1px solid #E7E5E4', borderRadius: 999, padding: '5px 10px', fontFamily: 'inherit', background: '#fff', color: '#1C1917' }}
                              aria-label={`${day.label} затваря`} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <div className="cr-error" role="alert" style={{ marginTop: 20 }}>{error}</div>}
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — Choose plan
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,40px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.15 }}>
              Избери план
            </h1>
            <p style={{ color: '#78716C', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
              Можеш да смениш плана по всяко време. Без скрити такси.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PLANS.map(p => {
                const isSelected = planId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`cr-plan-card${p.popular ? ' popular' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => setPlanId(p.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setPlanId(p.id)}
                  >
                    {p.popular && (
                      <div style={{ position: 'absolute', top: -10, right: 20, background: '#B07D2E', color: '#FAF8F5', borderRadius: 9999, padding: '3px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        Най-популярен
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Radio indicator */}
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${isSelected ? (p.popular ? '#B07D2E' : '#1C1917') : '#E7E5E4'}`, background: isSelected ? (p.popular ? '#B07D2E' : '#1C1917') : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .18s' }}>
                          {isSelected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FAF8F5' }} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: 17, margin: '0 0 2px' }}>{p.name}</p>
                          <p style={{ fontSize: 13, margin: 0, color: '#78716C' }}>{p.desc}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p className="font-display" style={{ fontWeight: 700, fontSize: 22, margin: '0 0 2px' }}>{p.price} €</p>
                        <p style={{ fontSize: 11, margin: 0, color: '#A8A29E' }}>от {p.daily} € / ден</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 16, paddingTop: 14, borderTop: '1px solid #F5F4F2' }}>
                        {PLAN_FEATURES.map(f => (
                          <span key={f} style={{ fontSize: 12, color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* SMS add-on */}
              <div
                className={`cr-sms-toggle${smsAddon ? ' on' : ''}`}
                onClick={() => setSmsAddon(v => !v)}
                role="checkbox"
                aria-checked={smsAddon}
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSmsAddon(v => !v)}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 15 }}>SMS напомняния</p>
                  <p style={{ fontSize: 13, margin: 0, opacity: .65 }}>Автоматични SMS напомняния до клиентите</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>+ 9 € / мес.</span>
                <div className={`cr-check-badge${smsAddon ? ' on' : ''}`}>
                  {smsAddon && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#FAF8F5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            </div>

            {error && <div className="cr-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 4 — Payment
        ══════════════════════════════════════════ */}
        {step === 4 && (
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(26px,4.5vw,40px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.15 }}>
              Потвърди поръчката
            </h1>
            <p style={{ color: '#78716C', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
              {SKIP_PAYMENT ? 'Демо режим — активира се без плащане.' : 'Преди да продължиш, провери детайлите.'}
            </p>

            {/* Summary card */}
            <div style={{ background: '#fff', border: '1.5px solid #E7E5E4', borderRadius: 22, padding: '26px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{form.name || 'Вашият салон'}</p>
                  <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 2px' }}>
                    {PLANS.find(p => p.id === planId)?.name} — {PLANS.find(p => p.id === planId)?.desc}
                  </p>
                  <p style={{ fontSize: 13, color: '#A8A29E', margin: 0 }}>{form.email}</p>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1C1917', flexShrink: 0 }} aria-hidden="true" />
              </div>

              <div style={{ borderTop: '1px solid #F5F4F2', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {PLAN_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14, color: '#44403C' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </div>
                ))}
                {smsAddon && (
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14, color: '#44403C' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    SMS напомняния (+9 € / мес.)
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #F5F4F2', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Общо</span>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-display" style={{ fontWeight: 700, fontSize: 28, margin: '0 0 2px', lineHeight: 1 }}>
                    {PLANS.find(p => p.id === planId)?.price} € / год.
                  </p>
                  {smsAddon && <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>+ 9 € / месец за SMS</p>}
                </div>
              </div>
            </div>

            {error && <div className="cr-error" role="alert">{error}</div>}

            <button onClick={handlePay} className="cr-btn-primary" disabled={isSubmitting} style={{ marginBottom: 12 }}>
              {isSubmitting
                ? <><span className="cr-spinner" aria-hidden="true" />{SKIP_PAYMENT ? 'Създавам сайта…' : 'Пренасочване към Stripe…'}</>
                : SKIP_PAYMENT ? 'Създай сайта →' : 'Плати сега →'
              }
            </button>
            {!SKIP_PAYMENT && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A29E' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Сигурно плащане чрез Stripe
              </p>
            )}
          </div>
        )}

        {/* ── NAVIGATION BUTTONS ───────────────────────────── */}
        {(step === 2 || step === 3) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, gap: 12 }}>
            <button className="cr-btn-ghost" onClick={back}>
              ← Назад
            </button>
            <button
              className="cr-btn-primary"
              onClick={next}
              disabled={!canProceed()}
              style={{ marginLeft: 'auto', padding: '16px 40px' }}
            >
              {step === 2 ? 'Продължи към план →' : 'Продължи към плащане →'}
            </button>
          </div>
        )}
        {step === 4 && (
          <div style={{ marginTop: 12 }}>
            <button className="cr-btn-ghost" onClick={back} style={{ fontSize: 13 }}>
              ← Промени плана
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FileUploadField
════════════════════════════════════════════════════════════ */
function FileUploadField({
  label, hint: hintText, value, loading, onChange,
}: {
  label: string; hint?: string; value: string; loading: boolean; onChange: (f: File) => void;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7, color: '#1C1917' }}>{label}</label>
      {hintText && <p style={{ fontSize: 13, color: '#78716C', margin: '0 0 10px', lineHeight: 1.57 }}>{hintText}</p>}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        border: '1.5px dashed #E7E5E4', borderRadius: 16, cursor: loading ? 'wait' : 'pointer', background: '#FAFAF8',
        transition: 'border-color .2s',
      }}>
        {value ? (
          <>
            <Image src={value} alt="" width={52} height={52} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>Снимката е качена</p>
              <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>Кликни за замяна</p>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Upload size={20} color="#A8A29E" strokeWidth={1.75} />
            <span style={{ fontSize: 14, color: '#78716C', fontWeight: 500 }}>
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
