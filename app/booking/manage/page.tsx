'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ClassSlot = {
  time: string;
  end: string;
  className: string;
  trainer: string;
  capacity: number;
  spotsLeft: number;
  available: boolean;
};

type CancelPolicy = {
  summary: string;
  policyHours: number;
  policyAction: string;
  amountPaidEuros: number;
};

type BookingData = {
  id: string;
  clientName: string;
  serviceName: string;
  servicePrice: number | null;
  serviceDuration: number | null;
  date: string;
  time: string;
  status: string;
  salonName: string;
  canModify: boolean;
  cancelPolicy: CancelPolicy | null;
};

function formatBgDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Чака потвърждение';
    case 'confirmed': return 'Потвърдена';
    case 'cancelled': return 'Отказана';
    case 'completed': return 'Завършена';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'confirmed': return '#16a34a';
    case 'cancelled': return '#dc2626';
    case 'completed': return '#6b7280';
    default: return '#6b7280';
  }
}

export default function ManageBookingPage() {
  return (
    <Suspense fallback={<ManageBookingFallback />}>
      <ManageBookingContent />
    </Suspense>
  );
}

function ManageBookingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: '#FAFAFA',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <p style={{ textAlign: 'center', color: '#666' }}>Зареждане...</p>
    </div>
  );
}

function ManageBookingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const token = searchParams.get('token') ?? '';

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [done, setDone] = useState('');

  const [rescheduling, setRescheduling] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newTrainer, setNewTrainer] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [classBased, setClassBased] = useState<boolean | null>(null);
  const [slots, setSlots] = useState<ClassSlot[]>([]);

  const loadSlots = useCallback(async (date: string) => {
    if (!date || !id || !token) return;
    setSlotsLoading(true);
    setNewTime('');
    setNewTrainer('');
    setRescheduleError('');
    try {
      const res = await fetch(
        `/api/bookings/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}&date=${encodeURIComponent(date)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setClassBased(null);
        setSlots([]);
        setRescheduleError(data.error || 'Грешка при зареждане на часовете.');
        return;
      }
      setClassBased(Boolean(data.classBased));
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setClassBased(null);
      setSlots([]);
      setRescheduleError('Грешка при зареждане на часовете.');
    } finally {
      setSlotsLoading(false);
    }
  }, [id, token]);

  const loadBooking = useCallback(async () => {
    if (!id || !token) {
      setError('Невалиден линк.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/bookings/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Резервацията не е намерена.');
        return;
      }
      setBooking(data);
    } catch {
      setError('Грешка при зареждане.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { void loadBooking(); }, [loadBooking]);

  const handleReschedule = async () => {
    setRescheduleError('');
    if (!newDate || !newTime) {
      setRescheduleError(classBased ? 'Изберете дата и клас от графика.' : 'Изберете дата и час.');
      return;
    }
    setRescheduling(true);
    try {
      const res = await fetch(
        `/api/bookings/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reschedule',
            newDate,
            newTime,
            ...(classBased && newTrainer ? { newTrainer } : {}),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || 'Грешка при преместване.');
        return;
      }
      setDone('Резервацията беше успешно преместена. Изпратихме потвърждение на имейла ви.');
      setShowReschedule(false);
      setBooking((prev) => prev ? { ...prev, date: data.date, time: data.time } : prev);
    } catch {
      setRescheduleError('Грешка при свързване със сървъра.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/bookings/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Грешка при отказване.');
        return;
      }
      const msg = data.refundMessage
        ? `Резервацията е отказана. ${data.refundMessage}`
        : 'Резервацията е отказана успешно.';
      setDone(msg);
      setConfirmCancel(false);
      setBooking((prev) => prev ? { ...prev, status: 'cancelled', canModify: false } : prev);
    } catch {
      setError('Грешка при свързване със сървъра.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: '#FAFAFA',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 16,
        padding: '32px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Зареждане...</p>
        ) : error && !booking ? (
          <p style={{ textAlign: 'center', color: '#dc2626' }}>{error}</p>
        ) : booking ? (
          <>
            <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#000' }}>
              {booking.salonName}
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Управление на резервация</p>

            <div style={{
              display: 'grid',
              gap: 12,
              padding: '16px',
              background: '#F9FAFB',
              borderRadius: 12,
            }}>
              <Row label="Услуга" value={booking.serviceName} />
              <Row label="Дата" value={formatBgDate(booking.date)} />
              <Row label="Час" value={booking.time} />
              {booking.serviceDuration ? <Row label="Продължителност" value={`${booking.serviceDuration} мин`} /> : null}
              <Row label="Статус" value={statusLabel(booking.status)} valueColor={statusColor(booking.status)} />
            </div>

            {done ? (
              <p style={{
                marginTop: 20,
                padding: '12px 16px',
                background: '#FEF2F2',
                borderRadius: 10,
                color: '#dc2626',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {done}
              </p>
            ) : null}

            {error ? (
              <p style={{ marginTop: 12, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>
            ) : null}

            {booking.canModify && !done ? (
              <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                {!showReschedule ? (
                  <button
                    type="button"
                    onClick={() => { setShowReschedule(true); setRescheduleError(''); }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 10,
                      border: '1px solid #000',
                      background: '#fff',
                      color: '#000',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Промени дата/час
                  </button>
                ) : (
                  <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 12, display: 'grid', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#000' }}>Изберете нова дата и час</p>
                    <input
                      type="date"
                      value={newDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewDate(value);
                        setNewTime('');
                        setNewTrainer('');
                        setClassBased(null);
                        setSlots([]);
                        if (value) void loadSlots(value);
                      }}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                    />

                    {!newDate ? null : slotsLoading ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Зареждане на часовете...</p>
                    ) : classBased === false ? (
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                      />
                    ) : slots.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Няма класове на избраната дата. Моля изберете друг ден.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {slots.map((slot) => {
                          const selected = newTime === slot.time && newTrainer === slot.trainer;
                          const label = [slot.className, slot.trainer].filter(Boolean).join(' · ');
                          return (
                            <button
                              key={`${slot.time}-${slot.trainer}`}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => { setNewTime(slot.time); setNewTrainer(slot.trainer); setRescheduleError(''); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: selected ? '2px solid #000' : '1px solid #ddd',
                                background: slot.available ? (selected ? '#F3F4F6' : '#fff') : '#F3F4F6',
                                color: slot.available ? '#000' : '#9CA3AF',
                                fontSize: 14,
                                textAlign: 'left',
                                cursor: slot.available ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 700 }}>{slot.time}{slot.end ? `–${slot.end}` : ''}</span>
                                {label ? <span style={{ fontSize: 12, color: slot.available ? '#666' : '#9CA3AF' }}>{label}</span> : null}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: slot.available ? '#16a34a' : '#dc2626' }}>
                                {slot.available ? `Свободни: ${slot.spotsLeft}` : 'Няма места'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {rescheduleError ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{rescheduleError}</p>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void handleReschedule()}
                        disabled={rescheduling}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#000',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: rescheduling ? 'wait' : 'pointer',
                          opacity: rescheduling ? 0.7 : 1,
                        }}
                      >
                        {rescheduling ? 'Записваме...' : 'Запази промяната'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowReschedule(false); setRescheduleError(''); }}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          background: '#fff',
                          color: '#333',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                )}
                {!confirmCancel ? (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 10,
                      border: '1px solid #dc2626',
                      background: '#fff',
                      color: '#dc2626',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Откажи резервацията
                  </button>
                ) : (
                  <div style={{
                    padding: 16,
                    background: '#FEF2F2',
                    borderRadius: 12,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: '0 0 12px', fontSize: 14, color: '#991B1B', fontWeight: 600 }}>
                      Сигурни ли сте?
                    </p>
                    {booking.cancelPolicy && (
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7F1D1D', background: '#FEE2E2', borderRadius: 8, padding: '8px 12px' }}>
                        {booking.cancelPolicy.summary}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void handleCancel()}
                        disabled={cancelling}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: cancelling ? 'wait' : 'pointer',
                          opacity: cancelling ? 0.7 : 1,
                        }}
                      >
                        {cancelling ? 'Отказваме...' : 'Да, откажи'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(false)}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          background: '#fff',
                          color: '#333',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        Не
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: valueColor || '#000' }}>{value}</span>
    </div>
  );
}
