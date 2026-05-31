'use client';

import type { CSSProperties } from 'react';
import type { BookingRecord } from '@/lib/admin-site';
import { formatSalonPrice } from '@/lib/salon-currency';

type BookingStatus = BookingRecord['status'];
type BookingGroupKey = 'upcoming' | 'past' | 'completed' | 'cancelled';

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
  statusFilter: 'all' | BookingStatus;
  setStatusFilter: (status: 'all' | BookingStatus) => void;
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

const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Чакаща', bg: '#FFF7ED', text: '#9A3412', dot: '#FB923C' },
  confirmed: { label: 'Потвърдена', bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  completed: { label: 'Завършена', bg: '#EEF2FF', text: '#3730A3', dot: '#6366F1' },
  cancelled: { label: 'Отказана', bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
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
          {([['all', 'Всички'], ['pending', 'Чакащи'], ['confirmed', 'Потвърдени'], ['completed', 'Завършени'], ['cancelled', 'Отказани']] as const).map(([val, lbl]) => {
            const isActive = statusFilter === val;
            const count = val === 'all' ? bookings.length : bookings.filter(b => b.status === val).length;
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
          {([
            ['upcoming', 'Предстоящи'],
            ['past', 'Минали'],
            ['completed', 'Завършени'],
            ['cancelled', 'Отказани'],
          ] as const).map(([groupKey, groupLabel]) => {
            const rows = groupedVisibleBookings[groupKey];
            if (rows.length === 0) return null;
            return (
              <div key={groupKey} style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
                <p style={{ margin: '2px 2px 0', fontSize: 12, fontWeight: 700, color: T.subtle, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {groupLabel}
                </p>
                {rows.map((b) => {
                  const cfg = STATUS_CFG[b.status];
                  return (
                    <div key={b.id} style={{
                      border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: isMobile ? 18 : T.radiusSm,
                      padding: isMobile ? '16px 18px' : '14px 16px', background: T.surface,
                      boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{b.client_name}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 600 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                              {cfg.label}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: isMobile ? 14 : 13, color: T.text, lineHeight: 1.5, fontWeight: 500 }}>
                            {b.service_name}
                            {Number.isFinite(Number(b.service_price)) ? ` · ${formatSalonPrice(Number(b.service_price))}` : ''}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                            {formatBgDateDMY(b.date)} · {b.time}
                            {typeof b.service_duration === 'number' ? ` · ${b.service_duration} мин` : ''}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: T.subtle }}>
                            {b.client_phone}
                            {b.client_email ? ` · ${b.client_email}` : ''}
                          </p>
                          {b.notes && <p style={{ margin: '6px 0 0', fontSize: 12, color: T.subtle, fontStyle: 'italic' }}>{b.notes}</p>}
                        </div>
                        <select
                          value={b.status}
                          onChange={e => void updateBookingStatus(b.id, e.target.value as BookingStatus)}
                          style={{
                            ...inp, width: isMobile ? '100%' : 'auto', cursor: 'pointer', flexShrink: 0,
                            marginTop: isMobile ? 8 : 0, background: isMobile ? '#F4F4F5' : T.surface, textAlign: 'center',
                          }}
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
