'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';

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
  staff: { id: string; name: string; slug: string };
  salon: { name: string; slug: string };
  services: ServiceOption[];
  bookings: BookingItem[];
};

function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'long' });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Чака потвърждение';
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

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
};

export default function StaffPortalPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setError('Невалиден линк.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/staff-portal?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Линкът е невалиден или е бил подменен — поискай нов от собственика на салона.');
        return;
      }
      setData(json);
    } catch {
      setError('Грешка при зареждане.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async () => {
    setFormError('');
    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim() || !serviceId || !date || !time) {
      setFormError('Моля попълнете всички полета.');
      return;
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
          date,
          time,
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Грешка при записване.');
        return;
      }
      setSuccess('Резервацията е добавена успешно.');
      setShowForm(false);
      setClientName(''); setClientPhone(''); setClientEmail(''); setServiceId(''); setDate(''); setTime(''); setNotes('');
      void load();
    } catch {
      setFormError('Грешка при свързване със сървъра.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '40px 20px',
      background: '#FAFAFA',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Зареждане...</p>
        ) : error && !data ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        ) : data ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#000' }}>
                Здравей, {data.staff.name}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{data.salon.name} — твоят график</p>
            </div>

            {success ? (
              <p style={{ marginBottom: 16, padding: '12px 16px', background: '#dcfce7', color: '#15803d', borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                {success}
              </p>
            ) : null}

            <div style={{ marginBottom: 16 }}>
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => { setShowForm(true); setSuccess(''); }}
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '1px solid #000', background: '#000', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Добави резервация
                </button>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, padding: 18, display: 'grid', gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#000' }}>Нова резервация</p>
                  <input style={inputStyle} placeholder="Име на клиента" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  <input style={inputStyle} placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                  <input style={inputStyle} placeholder="Имейл" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  <select style={inputStyle} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                    <option value="">Избери услуга</option>
                    {data.services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.durationMin} мин)</option>
                    ))}
                  </select>
                  <input type="date" style={inputStyle} value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
                  <input type="time" style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} />
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Бележки (по желание)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  {formError ? <p style={{ margin: 0, color: '#dc2626', fontSize: 13 }}>{formError}</p> : null}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                    >
                      {submitting ? 'Записваме…' : 'Запази резервация'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setFormError(''); }}
                      style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Предстоящи резервации
            </p>
            {data.bookings.length === 0 ? (
              <p style={{ color: '#888', fontSize: 14 }}>Нямаш резервации в момента.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.bookings.map((b) => (
                  <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#000' }}>{b.clientName} — {b.serviceName}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
                        {formatBgDate(b.date)} в {b.time}{b.serviceDuration ? ` · ${b.serviceDuration} мин` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(b.status), whiteSpace: 'nowrap' }}>
                      {statusLabel(b.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
