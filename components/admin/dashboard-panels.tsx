'use client';

import type { CSSProperties } from 'react';
import type { BookingRecord } from '@/lib/admin-site';
import { formatSalonPrice } from '@/lib/salon-currency';

type BookingStatus = BookingRecord['status'];
type BookingGroupKey = 'upcoming' | 'past' | 'completed' | 'cancelled';
export type BookingListFilter = 'all' | 'upcoming' | BookingStatus;

type ThemePalette = {
  text: string;
  muted: string;
  subtle: string;
  border: string;
  surface: string;
  accent: string;
  radiusSm: number;
};

type ButtonFactory = (
  variant: 'primary' | 'ghost' | 'danger' | 'sm-ghost'
) => CSSProperties;

type ClientSummary = {
  key: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
};

type ExternalCalendarEventRow = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  source: string;
};

type BookingsPanelProps = {
  isMobile: boolean;
  bookings: BookingRecord[];
  statusFilter: BookingListFilter;
  setStatusFilter: (status: BookingListFilter) => void;
  calendarMonthLabel: string;
  calendarMeta: { year: number; month: number; daysInMonth: number; mondayFirstOffset: number };
  bookingsCountByDate: Map<string, number>;
  externalCalendarByDate: Map<string, number>;
  externalCalendarEvents: ExternalCalendarEventRow[];
  selectedCalendarDate: string | null;
  setSelectedCalendarDate: (next: string | null) => void;
  setCalendarCursor: (next: (prev: Date) => Date) => void;
  visibleBookings: BookingRecord[];
  groupedVisibleBookings: Record<BookingGroupKey, BookingRecord[]>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  inp: CSSProperties;
  btn: ButtonFactory;
  T: ThemePalette;
};

const CALENDAR_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const STATUS_CFG: Record<BookingStatus, { label: string; text: string; dot: string; border: string }> = {
  pending: { label: 'Чакаща', text: '#C2410C', dot: '#FB923C', border: 'rgba(251,146,60,0.45)' },
  confirmed: { label: 'Потвърдена', text: '#047857', dot: '#10B981', border: 'rgba(16,185,129,0.4)' },
  completed: { label: 'Завършена', text: '#059669', dot: '#10B981', border: 'rgba(16,185,129,0.55)' },
  cancelled: { label: 'Отказана', text: '#DC2626', dot: '#EF4444', border: 'rgba(239,68,68,0.4)' },
};

function formatBgDateDMY(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function bookingSlotIsPastSimple(dateStr: string, timeStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return new Date(y, m - 1, d, hh, mm).getTime() < Date.now();
}

function ymdKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isUpcomingBooking(booking: BookingRecord): boolean {
  const status = String(booking.status ?? '').trim().toLowerCase();
  if (status === 'cancelled' || status === 'completed') return false;
  return !bookingSlotIsPastSimple(String(booking.date ?? ''), String(booking.time ?? ''));
}

function bookingFilterCount(bookings: BookingRecord[], filter: BookingListFilter): number {
  if (filter === 'all') return bookings.length;
  if (filter === 'upcoming') return bookings.filter(isUpcomingBooking).length;
  return bookings.filter((b) => b.status === filter).length;
}

function BookingCard({
  booking,
  isMobile,
  T,
  updateBookingStatus,
}: {
  booking: BookingRecord;
  isMobile: boolean;
  T: ThemePalette;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
}) {
  const cfg = STATUS_CFG[booking.status];

  return (
    <div
      style={{
        border: isMobile ? 'none' : `1px solid ${T.border}`,
        borderRadius: isMobile ? 18 : T.radiusSm,
        padding: isMobile ? '14px 16px' : '12px 14px',
        background: T.surface,
        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em', color: T.text }}>
          {booking.client_name}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: isMobile ? 14 : 13, color: T.muted, lineHeight: 1.45, fontWeight: 500 }}>
          {booking.service_name}
          {Number.isFinite(Number(booking.service_price)) ? ` · ${formatSalonPrice(Number(booking.service_price))}` : ''}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: isMobile ? 15 : 14, color: '#18181B', fontWeight: 600, lineHeight: 1.4 }}>
          {formatBgDateDMY(booking.date)} · {booking.time}
          {typeof booking.service_duration === 'number' ? ` · ${booking.service_duration} мин` : ''}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: isMobile ? 14 : 13, color: '#18181B', fontWeight: 500, lineHeight: 1.4 }}>
          {booking.client_phone}
          {booking.client_email ? (
            <span style={{ color: T.muted, fontWeight: 400 }}>{` · ${booking.client_email}`}</span>
          ) : null}
        </p>
        {booking.notes ? (
          <p style={{ margin: '5px 0 0', fontSize: 11, color: T.subtle, fontStyle: 'italic', lineHeight: 1.4 }}>
            {booking.notes}
          </p>
        ) : null}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            borderRadius: 999,
            border: `1px solid ${cfg.border}`,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: cfg.dot,
              flexShrink: 0,
            }}
          />
          <select
            value={booking.status}
            onChange={(e) => void updateBookingStatus(booking.id, e.target.value as BookingStatus)}
            aria-label="Статус на резервацията"
            style={{
              border: 'none',
              background: 'transparent',
              color: cfg.text,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: 1.2,
              padding: '2px 0',
              margin: 0,
              cursor: 'pointer',
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          >
            <option value="pending">Чакаща</option>
            <option value="confirmed">Потвърдена</option>
            <option value="completed">Завършена</option>
            <option value="cancelled">Отказана</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function BookingsPanel({
  isMobile,
  bookings,
  statusFilter,
  setStatusFilter,
  calendarMonthLabel,
  calendarMeta,
  bookingsCountByDate,
  externalCalendarByDate,
  externalCalendarEvents,
  selectedCalendarDate,
  setSelectedCalendarDate,
  setCalendarCursor,
  visibleBookings,
  groupedVisibleBookings,
  updateBookingStatus,
  inp,
  btn,
  T,
}: BookingsPanelProps) {
  return (
    <>
      {isMobile && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {([['all', 'Всички'], ['upcoming', 'Предстоящи'], ['pending', 'Чакащи'], ['completed', 'Завършени'], ['cancelled', 'Отказани']] as const).map(([val, lbl]) => {
            const isActive = statusFilter === val;
            const count = bookingFilterCount(bookings, val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 100, border: 'none',
                  background: isActive ? T.accent : '#F4F4F5', color: isActive ? '#fff' : T.muted,
                  fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, WebkitTapHighlightColor: 'transparent',
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
          <button type="button" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} style={{ ...btn('ghost'), padding: '6px 10px' }}>←</button>
          <p style={{ margin: 0, fontSize: isMobile ? 15 : 14, fontWeight: 700, textTransform: 'capitalize' }}>{calendarMonthLabel}</p>
          <button type="button" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} style={{ ...btn('ghost'), padding: '6px 10px' }}>→</button>
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
            const externalCount = externalCalendarByDate.get(key) ?? 0;
            const active = selectedCalendarDate === key;
            const hasClicka = count > 0;
            const hasExternal = externalCount > 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCalendarDate(active ? null : key)}
                style={{
                  border: hasExternal && !hasClicka ? '2px solid #FB923C' : 'none',
                  borderRadius: 12,
                  minHeight: 42,
                  background: active ? T.accent : hasClicka ? '#4F46E5' : hasExternal ? '#FFF7ED' : '#F4F4F5',
                  color: active || hasClicka ? '#fff' : hasExternal ? '#9A3412' : T.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 4px',
                }}
              >
                <div>{day}</div>
                {hasClicka ? <div style={{ fontSize: 10, opacity: 0.85 }}>{count}</div> : null}
                {!hasClicka && hasExternal ? (
                  <div style={{ fontSize: 10, opacity: 0.85 }}>•</div>
                ) : null}
              </button>
            );
          })}
        </div>
        {selectedCalendarDate ? (
          <p style={{ margin: '10px 2px 0', fontSize: 12, color: T.muted }}>
            Филтър: {formatBgDateDMY(selectedCalendarDate)}{' '}
            <button type="button" onClick={() => setSelectedCalendarDate(null)} style={{ border: 'none', background: 'none', color: T.accent, cursor: 'pointer', padding: 0 }}>
              (изчисти)
            </button>
          </p>
        ) : null}
        {externalCalendarByDate.size > 0 ? (
          <p style={{ margin: '8px 2px 0', fontSize: 11, color: T.subtle }}>
            Оранжеви дни = блокирани часове (Telegram / външен календар).
          </p>
        ) : null}
      </div>

      {visibleBookings.length === 0 && externalCalendarEvents.length === 0 ? (
        <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: '20px 14px', color: T.muted, textAlign: 'center' }}>
          Няма резервации за избраните филтри.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: isMobile ? 12 : 8 }}>
          {selectedCalendarDate && externalCalendarEvents.length > 0 ? (
            <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
              {externalCalendarEvents.map((ev) => (
                <div key={ev.id} style={{
                  border: isMobile ? 'none' : `1px solid #FDE68A`, borderRadius: isMobile ? 18 : T.radiusSm,
                  padding: isMobile ? '16px 18px' : '14px 16px', background: '#FFFBEB',
                  boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{ev.title}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                        Външна резервация
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                      {ev.startTime}{ev.endTime && ev.endTime !== ev.startTime ? ` – ${ev.endTime}` : ''}
                      {ev.source === 'block' ? ' · Telegram' : ev.source === 'google' ? ' · Google' : ' · Календар'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {(
            (statusFilter === 'upcoming'
              ? [['upcoming', 'Предстоящи']]
              : [
                  ['upcoming', 'Предстоящи'],
                  ['past', 'Минали'],
                  ['completed', 'Завършени'],
                  ['cancelled', 'Отказани'],
                ]) as const
          ).map(([groupKey, groupLabel]) => {
            const rows = groupedVisibleBookings[groupKey as BookingGroupKey];
            if (rows.length === 0) return null;
            return (
              <div key={groupKey} style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
                <p style={{ margin: '2px 2px 0', fontSize: 12, fontWeight: 700, color: T.subtle, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {groupLabel}
                </p>
                {rows.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isMobile={isMobile}
                    T={T}
                    updateBookingStatus={updateBookingStatus}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function ClientsPanel({
  clients,
  isMobile,
  T,
}: {
  clients: ClientSummary[];
  isMobile: boolean;
  T: ThemePalette;
}) {
  if (clients.length === 0) {
    return (
      <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: '20px 14px', color: T.muted, textAlign: 'center' }}>
        Няма клиенти.
      </div>
    );
  }

  return (
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
  );
}
