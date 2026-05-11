'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Booking = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_price: number | null;
  service_duration: number | null;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  reminder_sent: boolean | null;
  created_at: string;
};

export default function AdminPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Booking['status']>('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter(b => b.status === statusFilter);
  }, [bookings, statusFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(slug)}&limit=200`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка при зареждане');
      setBookings((data.bookings ?? []) as Booking[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(bookingId: string, status: Booking['status']) {
    setError('');
    const prev = bookings;
    setBookings(b => b.map(x => (x.id === bookingId ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Грешка при запазване');
    } catch (e: unknown) {
      setBookings(prev);
      setError(e instanceof Error ? e.message : 'Грешка');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <span style={{ fontWeight: 800 }}>Админ</span>
            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {slug}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href={`/${slug}`} style={{ fontSize: 13, textDecoration: 'none', color: '#7c3aed', fontWeight: 600 }}>
              Виж сайта →
            </Link>
            <button
              onClick={load}
              style={{
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Обнови
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '22px 18px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Резервации</h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
              Управлявай статусите (pending/confirmed/cancelled).
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            <option value="all">Всички</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(0,0,0,0.5)' }}>Зареждане…</p>
        ) : filtered.length === 0 ? (
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 18 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Няма резервации</p>
            <p style={{ margin: '6px 0 0', color: 'rgba(0,0,0,0.45)' }}>Когато клиент резервира, ще се появи тук.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 220 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{b.client_name}</p>
                    <p style={{ margin: '6px 0 0', color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                      {b.service_name}
                      {typeof b.service_price === 'number' ? ` • ${b.service_price} €` : ''}
                      {typeof b.service_duration === 'number' ? ` • ${b.service_duration} мин.` : ''}
                    </p>
                    <p style={{ margin: '6px 0 0', color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
                      {b.date} • {b.time} • {b.client_phone}
                      {b.client_email ? ` • ${b.client_email}` : ''}
                    </p>
                    {b.notes && <p style={{ margin: '10px 0 0', color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>Бележка: {b.notes}</p>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill status={b.status} />
                    <select
                      value={b.status}
                      onChange={e => updateStatus(b.id, e.target.value as Booking['status'])}
                      style={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        background: '#fff',
                      }}
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
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const { bg, fg, label } =
    status === 'confirmed'
      ? { bg: '#ecfdf5', fg: '#047857', label: 'CONFIRMED' }
      : status === 'cancelled'
        ? { bg: '#fef2f2', fg: '#b91c1c', label: 'CANCELLED' }
        : { bg: '#fffbeb', fg: '#b45309', label: 'PENDING' };

  return (
    <span style={{ background: bg, color: fg, border: `1px solid ${fg}22`, borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
      {label}
    </span>
  );
}

