'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';

/* ─── Types ─────────────────────────────────────────────── */
type ServiceOption = { id?: string; name: string; price: number; durationMin: number };

type BookingItem = {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  serviceDuration: number | null;
  date: string;
  time: string;
  status: string;
  notes: string | null;
};

type PortalData = {
  staff: { id: string; name: string; slug: string; bio: string | null; avatarUrl: string | null };
  salon: { name: string; slug: string };
  services: ServiceOption[];
  bookings: BookingItem[];
};

/* ─── Helpers ────────────────────────────────────────────── */
function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'long' });
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Чака';
    case 'confirmed': return 'Потвърдена';
    case 'completed': return 'Завършена';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'confirmed': return '#16a34a';
    case 'completed': return '#6b7280';
    default: return '#6b7280';
  }
}

function isUpcoming(b: BookingItem): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return b.date >= today && b.status !== 'completed' && b.status !== 'cancelled';
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ─── Shared styles ──────────────────────────────────────── */
const inputStyle: CSSProperties = {
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.12)',
  fontSize: 15,
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#000',
  outline: 'none',
  WebkitAppearance: 'none',
};

const card: CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  padding: '18px 18px',
  overflow: 'hidden',
};

/* ─── Entry ──────────────────────────────────────────────── */
export default function StaffPortalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>Зареждане…</div>}>
      <StaffPortalContent />
    </Suspense>
  );
}

/* ─── Main content ───────────────────────────────────────── */
function StaffPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* profile */
  const [showProfile, setShowProfile] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  /* booking form */
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  /* bookings filter */
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM

  const load = useCallback(async () => {
    if (!token) { setError('Невалиден линк.'); setLoading(false); return; }
    try {
      const res = await fetch(`/api/staff-portal?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Линкът е невалиден.'); return; }
      setData(json);
      setBio(json.staff?.bio ?? '');
      setAvatarUrl(json.staff?.avatarUrl ?? null);
    } catch { setError('Грешка при зареждане.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  /* ── filtered bookings ── */
  const { upcoming, past } = useMemo(() => {
    if (!data) return { upcoming: [], past: [] };
    const u: BookingItem[] = [];
    const p: BookingItem[] = [];
    for (const b of data.bookings) {
      if (isUpcoming(b)) u.push(b); else p.push(b);
    }
    u.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    p.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return { upcoming: u, past: p };
  }, [data]);

  const filteredBookings = useMemo(() => {
    const list = tab === 'upcoming' ? upcoming : past;
    if (!filterMonth) return list;
    return list.filter(b => b.date.startsWith(filterMonth));
  }, [tab, upcoming, past, filterMonth]);

  /* ── months available for filter ── */
  const availableMonths = useMemo(() => {
    const list = tab === 'upcoming' ? upcoming : past;
    const seen = new Set<string>();
    for (const b of list) {
      const m = b.date.slice(0, 7);
      if (m) seen.add(m);
    }
    return Array.from(seen).sort((a, b) => (tab === 'upcoming' ? a.localeCompare(b) : b.localeCompare(a)));
  }, [tab, upcoming, past]);

  /* ── avatar upload ── */
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProfileError(''); setProfileSuccess('');
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      const res = await fetch('/api/staff-portal/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { setProfileError(json.error || 'Грешка при качване.'); return; }
      setAvatarUrl(json.url);
    } catch { setProfileError('Грешка при свързване.'); }
    finally { setAvatarUploading(false); }
  };

  const handleProfileSave = async () => {
    setProfileError(''); setProfileSuccess('');
    setProfileSaving(true);
    try {
      const res = await fetch('/api/staff-portal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, bio, avatarUrl }),
      });
      const json = await res.json();
      if (!res.ok) { setProfileError(json.error || 'Грешка.'); return; }
      setProfileSuccess('Профилът е запазен.');
      setShowProfile(false);
      void load();
    } catch { setProfileError('Грешка при свързване.'); }
    finally { setProfileSaving(false); }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim() || !serviceId || !date || !time) {
      setFormError('Попълни всички полета.'); return;
    }
    const service = data?.services.find((s) => s.id === serviceId);
    setSubmitting(true);
    try {
      const res = await fetch('/api/staff-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim(),
          serviceName: service?.name ?? '',
          servicePrice: service?.price ?? null,
          serviceDuration: service?.durationMin ?? 30,
          date, time,
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Грешка.'); return; }
      setFormSuccess('Резервацията е добавена.');
      setShowForm(false);
      setClientName(''); setClientPhone(''); setClientEmail('');
      setServiceId(''); setDate(''); setTime(''); setNotes('');
      void load();
    } catch { setFormError('Грешка при свързване.'); }
    finally { setSubmitting(false); }
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
        Зареждане…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...card, maxWidth: 360, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={data.staff.name}
              style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(0,0,0,0.08)' }}
            />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: '#e5e5ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#555',
            }}>
              {data.staff.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + salon */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#000', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.staff.name}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.3 }}>{data.salon.name}</p>
        </div>

        {/* Profile button — small, top-right */}
        <button
          type="button"
          onClick={() => { setShowProfile(v => !v); setProfileSuccess(''); setProfileError(''); }}
          style={{
            flexShrink: 0,
            padding: '7px 13px',
            borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.12)',
            background: showProfile ? '#000' : '#fff',
            color: showProfile ? '#fff' : '#000',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Профил
        </button>
      </div>

      <div style={{ padding: '16px 16px 40px', maxWidth: 540, margin: '0 auto', display: 'grid', gap: 14 }}>

        {/* ── Profile panel ── */}
        {showProfile ? (
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Моят профил</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={data.staff.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#555', flexShrink: 0 }}>
                  {data.staff.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <label style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#000', fontSize: 13, fontWeight: 600, cursor: avatarUploading ? 'default' : 'pointer', opacity: avatarUploading ? 0.5 : 1 }}>
                {avatarUploading ? 'Качване…' : 'Смени снимката'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarUploading} style={{ display: 'none' }} />
              </label>
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
              placeholder="Кратко био — разкажи на клиентите за себе си"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            {profileError ? <p style={{ margin: '0 0 10px', color: '#dc2626', fontSize: 13 }}>{profileError}</p> : null}
            {profileSuccess ? <p style={{ margin: '0 0 10px', color: '#16a34a', fontSize: 13 }}>{profileSuccess}</p> : null}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setShowProfile(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Затвори
              </button>
              <button type="button" onClick={() => void handleProfileSave()} disabled={profileSaving}
                style={{ flex: 1, padding: '10px', borderRadius: 999, border: 'none', background: profileSaving ? '#999' : '#16a34a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: profileSaving ? 'default' : 'pointer' }}>
                {profileSaving ? 'Запазване…' : 'Запази'}
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Form success ── */}
        {formSuccess ? (
          <p style={{ margin: 0, padding: '12px 16px', background: '#dcfce7', color: '#15803d', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
            {formSuccess}
          </p>
        ) : null}

        {/* ── New booking button / form ── */}
        {!showForm ? (
          <button
            type="button"
            onClick={() => { setShowForm(true); setFormSuccess(''); }}
            style={{
              padding: '13px 20px',
              borderRadius: 12,
              border: 'none',
              background: '#000',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            + Нова резервация
          </button>
        ) : (
          <div style={card}>
            <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Нова резервация</p>
            <div style={{ display: 'grid', gap: 10 }}>
              <input style={inputStyle} placeholder="Ime на клиента" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <input style={inputStyle} placeholder="Телефон" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              <input style={inputStyle} placeholder="Имейл" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              <select style={{ ...inputStyle, color: serviceId ? '#000' : '#999' }} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Избери услуга</option>
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.durationMin} мин</option>
                ))}
              </select>
              {data.services.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: '#f59e0b' }}>
                  Собственикът на салона трябва да добави услуги от admin панела.
                </p>
              ) : null}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="date" style={inputStyle} value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} />
                <input type="time" style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Бележки (по желание)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {formError ? <p style={{ margin: '10px 0 0', color: '#dc2626', fontSize: 13 }}>{formError}</p> : null}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" onClick={() => void handleSubmit()} disabled={submitting}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: submitting ? '#999' : '#000', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer' }}>
                {submitting ? 'Записваме…' : 'Запази резервация'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
                style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>
                Отказ
              </button>
            </div>
          </div>
        )}

        {/* ── Bookings ── */}
        <div style={card}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['upcoming', 'past'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setTab(t); setFilterMonth(''); }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: tab === t ? '#000' : 'rgba(0,0,0,0.06)',
                  color: tab === t ? '#fff' : '#666',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                {t === 'upcoming' ? `Предстоящи${upcoming.length > 0 ? ` (${upcoming.length})` : ''}` : 'Завършени'}
              </button>
            ))}
          </div>

          {/* Month filter */}
          {availableMonths.length > 1 ? (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 4 }}>
              <button type="button" onClick={() => setFilterMonth('')}
                style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: !filterMonth ? '#000' : '#fff', color: !filterMonth ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Всички
              </button>
              {availableMonths.map(m => (
                <button key={m} type="button" onClick={() => setFilterMonth(m)}
                  style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: filterMonth === m ? '#000' : '#fff', color: filterMonth === m ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatMonthLabel(`${m}-01`)}
                </button>
              ))}
            </div>
          ) : null}

          {/* List */}
          {filteredBookings.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: '#999', textAlign: 'center', padding: '16px 0' }}>
              {tab === 'upcoming' ? 'Нямаш предстоящи резервации.' : 'Нямаш завършени резервации.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredBookings.map((b) => (
                <div key={b.id} style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.07)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.clientName}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.serviceName}{b.serviceDuration ? ` · ${b.serviceDuration} мин` : ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>
                      {formatBgDate(b.date)} · {b.time}
                    </p>
                    {b.clientPhone ? (
                      <a href={`tel:${b.clientPhone}`} style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#555', textDecoration: 'none' }}>
                        {b.clientPhone}
                      </a>
                    ) : null}
                    {b.notes ? (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{b.notes}</p>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(b.status), whiteSpace: 'nowrap', marginTop: 2 }}>
                    {statusLabel(b.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
