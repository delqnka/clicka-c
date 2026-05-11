'use client';

import { useState, useEffect } from 'react';

/* ── Types ──────────────────────────────────────────────── */
export interface Service {
  name: string;
  price: number;
  duration_min: number;
}

export interface TeamMember {
  name: string;
  role: string;
  photo_url?: string;
}

export interface WorkingDay {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface Salon {
  id: string;
  slug: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  about?: string;
  cover_image_url?: string;
  logo_image_url?: string;
  gallery_images?: string[];
  instagram_username?: string;
  facebook_username?: string;
  google_maps_url?: string;
  working_hours?: Record<string, WorkingDay>;
  services?: Service[];
  team?: TeamMember[];
  primary_color?: string;
  primary_color_light?: string;
}

/* ── Constants ──────────────────────────────────────────── */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_BG: Record<string, string> = {
  monday: 'Понеделник',
  tuesday: 'Вторник',
  wednesday: 'Сряда',
  thursday: 'Четвъртък',
  friday: 'Петък',
  saturday: 'Събота',
  sunday: 'Неделя',
};
const GRAD_PALETTE = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

/* ── Helpers ────────────────────────────────────────────── */
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

/* ── Star rating ────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, rating));
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.floor(r);
        const half = !filled && i <= Math.ceil(r) && r % 1 >= 0.5;
        const color = filled ? '#f59e0b' : half ? 'url(#hg)' : '#e5e7eb';
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24">
            {half && (
              <defs>
                <linearGradient id="hg">
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#e5e7eb" />
                </linearGradient>
              </defs>
            )}
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill={color}
              stroke="none"
            />
          </svg>
        );
      })}
    </div>
  );
}

/* ── Logo helpers ───────────────────────────────────────── */
function LogoInitial({ name, size, fontSize, borderRadius }: {
  name: string; size: number; fontSize: number; borderRadius: number;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius,
      background: 'linear-gradient(135deg, var(--primary), #9333ea)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 800, fontSize,
    }}>
      {(name || 'S').charAt(0).toUpperCase()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function SalonPage({ salon }: { salon: Salon }) {
  const primary = salon.primary_color || '#7c3aed';
  const primaryLight = salon.primary_color_light || '#ede9fe';
  const initial = (salon.name || 'S').charAt(0).toUpperCase();
  const services = salon.services || [];
  const team = salon.team || [];
  const gallery = salon.gallery_images || [];
  const hours = salon.working_hours || {};
  const todayKey = DAY_KEYS[new Date().getDay()];

  /* ── Booking state ──────────────────────────────────── */
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const selectedService = selectedIdx !== '' ? services[selectedIdx] : null;

  const timeSlots: string[] | 'closed' | null = (() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    const dayKey = DAY_KEYS[d.getDay()];
    const h = hours[dayKey];
    if (!h || h.closed) return 'closed';
    if (!h.open || !h.close) return [];
    return generateSlots(h.open, h.close);
  })();

  /* ── Date bounds ────────────────────────────────────── */
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60)
    .toISOString().split('T')[0];

  /* ── Escape key ─────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBooking(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  /* ── Fade-in observer ───────────────────────────────── */
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function openBooking(idx?: number) {
    resetForm();
    if (idx !== undefined) setSelectedIdx(idx);
    setBookingOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeBooking() {
    setBookingOpen(false);
    document.body.style.overflow = '';
    setTimeout(resetForm, 400);
  }

  function resetForm() {
    setClientName('');
    setClientPhone('');
    setNotes('');
    setSelectedIdx('');
    setSelectedDate('');
    setSelectedTime('');
    setError('');
    setIsSubmitting(false);
    setIsSuccess(false);
    setSuccessMsg('');
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (selectedIdx === '') return setError('Моля, изберете услуга.');
    if (!clientName.trim()) return setError('Моля, въведете вашето име.');
    if (!clientPhone.trim()) return setError('Моля, въведете телефонен номер.');
    if (!selectedDate) return setError('Моля, изберете дата.');
    if (!selectedTime) return setError('Моля, изберете час за вашата резервация.');

    const svc = services[selectedIdx];
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          serviceName: svc.name,
          servicePrice: svc.price,
          serviceDuration: svc.duration_min,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Грешка ${res.status}`);

      const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('bg-BG', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      setSuccessMsg(`${svc.name} — ${dateLabel} в ${selectedTime} ч.\nЩе се свържем с вас на ${clientPhone.trim()}`);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Възникна грешка. Моля, обадете ни се директно.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ '--primary': primary, '--primary-light': primaryLight } as React.CSSProperties} className="salon-shell">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="salon-app">

        {/* ── 1. STICKY HEADER ─────────────────────────── */}
        <header className="sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div className="header-logo-box">
                {salon.logo_image_url
                  ? <img src={salon.logo_image_url} alt={salon.name} />
                  : initial}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {salon.name}
              </span>
            </div>
            <button className="btn-primary" onClick={() => openBooking()} style={{ padding: '10px 18px', fontSize: 14, flexShrink: 0 }}>
              Резервирай
            </button>
          </div>
        </header>

        {/* ── 2. HERO ──────────────────────────────────── */}
        <div className="hero-cover">
          {salon.cover_image_url && (
            <img src={salon.cover_image_url} alt={`${salon.name} обложка`} />
          )}
          <div className="hero-initial">{initial}</div>
        </div>

        {/* ── 3. INFO CARD ─────────────────────────────── */}
        <div style={{ padding: '0 0 24px', position: 'relative', zIndex: 10 }} className="fade-in">
          <div className="info-card">
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div className="salon-logo-wrap">
                {salon.logo_image_url
                  ? <img src={salon.logo_image_url} alt={salon.name} />
                  : initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 2px', lineHeight: 1.25 }}>
                  {salon.name}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  {salon.category}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Stars rating={4.9} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>4.9</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>· отлично</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(salon.address || salon.city) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <LocationIcon />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {salon.address || salon.city}{salon.address && salon.city ? `, ${salon.city}` : ''}
                      </span>
                    </div>
                  )}
                  {salon.phone && (
                    <a href={`tel:${salon.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
                      <PhoneIcon color="var(--primary)" />
                      <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>{salon.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {salon.phone && (
                <a href={`tel:${salon.phone}`} style={quickActionStyle}>
                  <PhoneIcon />
                  Обади се
                </a>
              )}
              {salon.instagram_username && (
                <a href={`https://instagram.com/${salon.instagram_username}`} target="_blank" rel="noopener" style={quickActionStyle}>
                  <InstagramIcon />
                  Instagram
                </a>
              )}
              {salon.facebook_username && (
                <a href={`https://facebook.com/${salon.facebook_username}`} target="_blank" rel="noopener" style={quickActionStyle}>
                  <FacebookIcon />
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. ЗА НАС ───────────────────────────────── */}
        {salon.about && (
          <>
            <div className="section-divider" />
            <section className="section fade-in">
              <h2 className="section-title">За нас</h2>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>
                {salon.about}
              </p>
            </section>
          </>
        )}

        {/* ── 5. УСЛУГИ ───────────────────────────────── */}
        <div className="section-divider" />
        <section className="fade-in" style={{ marginBottom: 28 }}>
          <div style={{ padding: '0 16px' }}>
            <h2 className="section-title">Услуги</h2>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Услугите ще бъдат добавени скоро.</p>
            ) : services.map((s, i) => (
              <div key={i} className="service-card">
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>{s.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockIcon />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.duration_min} мин.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{s.price} €</span>
                  <button className="btn-outline" onClick={() => openBooking(i)}>Резервирай</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. ЕКИП ─────────────────────────────────── */}
        {team.length > 0 && (
          <>
            <div className="section-divider" />
            <section className="fade-in" style={{ marginBottom: 28 }}>
              <div style={{ padding: '0 16px' }}>
                <h2 className="section-title">Нашият екип</h2>
              </div>
              <div className="team-scroll">
                {team.map((m, i) => {
                  const memberInitial = (m.name || '?').charAt(0).toUpperCase();
                  return (
                    <div key={i} className="team-member">
                      {m.photo_url
                        ? <img src={m.photo_url} alt={m.name} className="team-avatar" />
                        : <div className="team-avatar-placeholder">{memberInitial}</div>}
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '8px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.role}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ── 7. ГАЛЕРИЯ ──────────────────────────────── */}
        <div className="section-divider" />
        <section className="fade-in" style={{ marginBottom: 28 }}>
          <div style={{ padding: '0 16px' }}>
            <h2 className="section-title">Галерия</h2>
          </div>
          <div className="gallery-grid">
            {gallery.length === 0
              ? GRAD_PALETTE.map((g, i) => (
                  <div key={i} className="gallery-item" style={{ background: g }} />
                ))
              : gallery.map((url, i) => (
                  <div key={i} className="gallery-item" style={{ background: GRAD_PALETTE[i % GRAD_PALETTE.length] }}>
                    <img src={url} alt={`Снимка ${i + 1}`} loading="lazy" />
                  </div>
                ))}
          </div>
        </section>

        {/* ── 8. ЛОКАЦИЯ ──────────────────────────────── */}
        {(salon.google_maps_url || salon.address) && (
          <>
            <div className="section-divider" />
            <section className="section fade-in">
              <h2 className="section-title">Локация</h2>
              {salon.google_maps_url && (
                <div className="map-container">
                  <iframe
                    src={salon.google_maps_url}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Карта — ${salon.name}`}
                  />
                </div>
              )}
              {salon.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <LocationIcon color="var(--primary)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                    {salon.address}{salon.city ? `, ${salon.city}` : ''}
                  </span>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── 9. РАБОТНО ВРЕМЕ ────────────────────────── */}
        {Object.keys(hours).length > 0 && (
          <>
            <div className="section-divider" />
            <section className="section fade-in">
              <h2 className="section-title">Работно време</h2>
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {DAY_ORDER.map(day => {
                  const h = hours[day];
                  const isToday = day === todayKey;
                  const closed = !h || h.closed;
                  return (
                    <div key={day} className={`hours-row${isToday ? ' today' : ''}`}>
                      <span className="day-name">
                        {isToday ? '● ' : ''}{DAY_BG[day]}
                      </span>
                      <span className="day-time">
                        {closed
                          ? <span style={{ color: '#dc2626', fontWeight: 500 }}>Почивен ден</span>
                          : `${h.open} – ${h.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ── 10. FOOTER ──────────────────────────────── */}
        <div className="section-divider" />
        <footer className="fade-in">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="header-logo-box" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 22, margin: '0 auto 12px' }}>
              {salon.logo_image_url
                ? <img src={salon.logo_image_url} alt={salon.name} />
                : initial}
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 3px' }}>{salon.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{salon.category}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 24 }}>
            {salon.phone && (
              <a href={`tel:${salon.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 15, fontWeight: 500 }}>
                <PhoneIcon />
                {salon.phone}
              </a>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {salon.instagram_username && (
                <a href={`https://instagram.com/${salon.instagram_username}`} target="_blank" rel="noopener"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: '1.5px solid #E1306C', borderRadius: 10, textDecoration: 'none', color: '#E1306C', fontSize: 13, fontWeight: 600 }}>
                  <InstagramIcon />
                  @{salon.instagram_username}
                </a>
              )}
              {salon.facebook_username && (
                <a href={`https://facebook.com/${salon.facebook_username}`} target="_blank" rel="noopener"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: '1.5px solid #1877F2', borderRadius: 10, textDecoration: 'none', color: '#1877F2', fontSize: 13, fontWeight: 600 }}>
                  <FacebookIcon />
                  {salon.facebook_username}
                </a>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }} />
        </footer>

      </div>{/* /.salon-app */}

      {/* ── FLOATING PHONE BUTTON ────────────────────── */}
      {salon.phone && (
        <a href={`tel:${salon.phone}`} className="float-btn" aria-label="Обади се">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.46-.46a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 18.09z" />
          </svg>
        </a>
      )}

      {/* ── OVERLAY ──────────────────────────────────── */}
      <div className={`overlay${bookingOpen ? ' active' : ''}`} onClick={closeBooking} />

      {/* ── BOOKING BOTTOM SHEET ─────────────────────── */}
      <div className={`bottom-sheet${bookingOpen ? ' active' : ''}`} role="dialog" aria-modal="true" aria-label="Форма за резервация">
        <div className="sheet-handle" />

        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 20px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text)' }}>Резервирай час</h2>
            <button onClick={closeBooking} aria-label="Затвори"
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--card-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {!isSuccess ? (
          <form onSubmit={submitBooking} style={{ padding: '0 20px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Name */}
              <div>
                <label className="form-label" htmlFor="f-name">Вашето име</label>
                <input id="f-name" type="text" className="form-input"
                  placeholder="Въведете вашето име" autoComplete="name"
                  value={clientName} onChange={e => setClientName(e.target.value)} required />
              </div>

              {/* Phone */}
              <div>
                <label className="form-label" htmlFor="f-phone">Телефон</label>
                <input id="f-phone" type="tel" className="form-input"
                  placeholder="+359 88 888 8888" autoComplete="tel"
                  value={clientPhone} onChange={e => setClientPhone(e.target.value)} required />
              </div>

              {/* Service */}
              <div>
                <label className="form-label" htmlFor="f-service">Услуга</label>
                <select id="f-service" className="form-input" required
                  value={selectedIdx}
                  onChange={e => {
                    setSelectedIdx(e.target.value === '' ? '' : Number(e.target.value));
                    setSelectedTime('');
                  }}>
                  <option value="">— Изберете услуга —</option>
                  {services.map((s, i) => (
                    <option key={i} value={i}>{s.name}  —  {s.price} €</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="form-label" htmlFor="f-date">Дата</label>
                <input id="f-date" type="date" className="form-input" required
                  min={minDate} max={maxDate}
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }} />
              </div>

              {/* Time slots */}
              <div>
                <label className="form-label">Час</label>
                <div className="time-slots-grid">
                  {!timeSlots && (
                    <p style={{ gridColumn: '1/-1', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Изберете дата, за да видите свободните часове
                    </p>
                  )}
                  {timeSlots === 'closed' && (
                    <p style={{ gridColumn: '1/-1', fontSize: 13, color: '#dc2626', fontWeight: 500, margin: 0 }}>
                      Почивен ден — салонът не работи
                    </p>
                  )}
                  {Array.isArray(timeSlots) && timeSlots.length === 0 && (
                    <p style={{ gridColumn: '1/-1', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Няма свободни часове за този ден
                    </p>
                  )}
                  {Array.isArray(timeSlots) && timeSlots.map(t => (
                    <button key={t} type="button"
                      className={`time-slot${selectedTime === t ? ' selected' : ''}`}
                      onClick={() => setSelectedTime(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              {selectedService && (
                <div className="price-summary">
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selectedService.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{selectedService.duration_min} минути</p>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{selectedService.price} €</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="form-label" htmlFor="f-notes">Бележка (по желание)</label>
                <input id="f-notes" type="text" className="form-input"
                  placeholder="Специални изисквания..."
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Error */}
              {error && <div className="form-error">{error}</div>}

              {/* Submit */}
              <button type="submit" className="btn-primary" disabled={isSubmitting}
                style={{ width: '100%', padding: 16, fontSize: 16, borderRadius: 12 }}>
                {isSubmitting ? <span className="spinner" /> : 'Потвърди резервацията'}
              </button>
            </div>
          </form>
        ) : (
          <div className="success-wrap">
            <div className="success-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>Резервацията е приета!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65, margin: '0 0 28px', whiteSpace: 'pre-line' }}>
              {successMsg}
            </p>
            <button onClick={closeBooking} className="btn-primary" style={{ width: '100%', padding: 16, fontSize: 16, borderRadius: 12 }}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Inline SVG icons ───────────────────────────────────── */
function PhoneIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.46-.46a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 18.09z" />
    </svg>
  );
}

function LocationIcon({ color = 'var(--text-secondary)', style }: { color?: string; style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const quickActionStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: 11,
  background: 'var(--card-bg)',
  borderRadius: 10,
  textDecoration: 'none',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 600,
};
