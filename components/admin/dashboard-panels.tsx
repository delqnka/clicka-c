'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import type { BookingRecord } from '@/lib/admin-site';
import { formatSalonPrice } from '@/lib/salon-currency';
import type { Locale } from '@/lib/i18n';

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
  lastBookingQuantity?: number;
  isNew?: boolean;
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
  locale: Locale;
};

const CALENDAR_DAY_NAMES_BG = ['ПОН', 'ВТ', 'СР', 'ЧЕТ', 'ПЕТ', 'СЪБ', 'НЕД'] as const;
const CALENDAR_DAY_NAMES_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const MOBILE_CALENDAR_COLUMNS = 'repeat(7, calc((100% - 24px) / 7))';

type StatusEntry = { label: string; text: string; dot: string; border: string };
function statusCfg(locale: Locale): Record<BookingStatus, StatusEntry> {
  const isEn = locale === 'en';
  return {
    pending: { label: isEn ? 'Pending' : 'Чакаща', text: '#C2410C', dot: '#FB923C', border: 'rgba(251,146,60,0.45)' },
    confirmed: { label: isEn ? 'Confirmed' : 'Потвърдена', text: '#047857', dot: '#10B981', border: 'rgba(16,185,129,0.4)' },
    completed: { label: isEn ? 'Completed' : 'Завършена', text: '#059669', dot: '#10B981', border: 'rgba(16,185,129,0.55)' },
    cancelled: { label: isEn ? 'Cancelled' : 'Отказана', text: '#DC2626', dot: '#EF4444', border: 'rgba(239,68,68,0.4)' },
  };
}

function formatBgDateDMY(dateStr: string, locale: Locale = 'bg') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const tag = locale === 'en' ? 'en-US' : 'bg-BG';
  return dt.toLocaleDateString(tag, { day: '2-digit', month: '2-digit', year: 'numeric' });
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

function allBookingGroups(locale: Locale): ReadonlyArray<readonly [BookingGroupKey, string]> {
  const isEn = locale === 'en';
  return [
    ['upcoming', isEn ? 'Upcoming' : 'Предстоящи'],
    ['past', isEn ? 'Past' : 'Минали'],
    ['completed', isEn ? 'Completed' : 'Завършени'],
    ['cancelled', isEn ? 'Cancelled' : 'Отказани'],
  ];
}

function upcomingBookingGroups(locale: Locale): ReadonlyArray<readonly [BookingGroupKey, string]> {
  const isEn = locale === 'en';
  return [['upcoming', isEn ? 'Upcoming' : 'Предстоящи']];
}

function BookingCard({
  booking,
  isMobile,
  T,
  updateBookingStatus,
  locale,
}: {
  booking: BookingRecord;
  isMobile: boolean;
  T: ThemePalette;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const STATUS_CFG = statusCfg(locale);
  const cfg = STATUS_CFG[booking.status];

  return (
    <div
      style={{
        border: 'none',
        borderRadius: isMobile ? 18 : 14,
        padding: isMobile ? '14px 16px' : '12px 14px',
        background: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em', color: T.text }}>
          {booking.client_name}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: isMobile ? 14 : 13, color: T.muted, lineHeight: 1.45, fontWeight: 500 }}>
          {booking.service_name}
          {Math.max(1, Number(booking.booking_quantity ?? 1) || 1) > 1
            ? ` · ${Math.max(1, Number(booking.booking_quantity ?? 1) || 1)} ${isEn ? 'beds' : 'легла'}`
            : ''}
          {Number.isFinite(Number(booking.service_price)) ? ` · ${formatSalonPrice(Number(booking.service_price))}` : ''}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: isMobile ? 15 : 14, color: '#18181B', fontWeight: 600, lineHeight: 1.4 }}>
          {formatBgDateDMY(booking.date, locale)} · {booking.time}
          {typeof booking.service_duration === 'number' ? ` · ${booking.service_duration} ${isEn ? 'min' : 'мин'}` : ''}
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
            aria-label={isEn ? 'Booking status' : 'Статус на резервацията'}
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
            <option value="pending">{STATUS_CFG.pending.label}</option>
            <option value="confirmed">{STATUS_CFG.confirmed.label}</option>
            <option value="completed">{STATUS_CFG.completed.label}</option>
            <option value="cancelled">{STATUS_CFG.cancelled.label}</option>
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
  locale,
}: BookingsPanelProps) {
  const isEn = locale === 'en';
  const CALENDAR_DAY_NAMES = isEn ? CALENDAR_DAY_NAMES_EN : CALENDAR_DAY_NAMES_BG;
  const bookingGroups = statusFilter === 'upcoming' ? upcomingBookingGroups(locale) : allBookingGroups(locale);

  return (
    <>
      {isMobile && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {([
            ['all', isEn ? 'All' : 'Всички'],
            ['upcoming', isEn ? 'Upcoming' : 'Предстоящи'],
            ['pending', isEn ? 'Pending' : 'Чакащи'],
            ['completed', isEn ? 'Completed' : 'Завършени'],
            ['cancelled', isEn ? 'Cancelled' : 'Отказани'],
          ] as const).map(([val, lbl]) => {
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
                  background: isActive ? '#000' : '#fff',
                  color: isActive ? '#fff' : T.muted,
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.06)',
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
          border: 'none',
          borderRadius: isMobile ? 16 : 14,
          background: T.surface,
          padding: isMobile ? '12px 8px 10px' : '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
          contain: 'layout paint',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            style={{ ...btn('ghost'), padding: isMobile ? '5px 8px' : '6px 10px', minWidth: 0 }}
          >
            ←
          </button>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? 14 : 14,
              fontWeight: 700,
              textTransform: 'capitalize',
              textAlign: 'center',
              minWidth: 0,
              flex: 1,
            }}
          >
            {calendarMonthLabel}
          </p>
          <button
            type="button"
            onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            style={{ ...btn('ghost'), padding: isMobile ? '5px 8px' : '6px 10px', minWidth: 0 }}
          >
            →
          </button>
        </div>

        <div
          style={{
            marginTop: isMobile ? 8 : 10,
            display: 'grid',
            gridTemplateColumns: isMobile ? MOBILE_CALENDAR_COLUMNS : 'repeat(7, minmax(0,1fr))',
            gap: isMobile ? 4 : 6,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {CALENDAR_DAY_NAMES.map((day) => (
            <div key={day} style={{ textAlign: 'center', fontSize: isMobile ? 9 : 11, color: T.subtle, fontWeight: 700, minWidth: 0, lineHeight: 1.2 }}>
              {day}
            </div>
          ))}
          {Array.from({ length: calendarMeta.mondayFirstOffset }).map((_, i) => (
            <div key={`offset-${i}`} style={{ minWidth: 0 }} />
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
                  borderRadius: isMobile ? 10 : 12,
                  minHeight: isMobile ? 0 : 42,
                  aspectRatio: isMobile ? '1 / 1' : undefined,
                  background: active ? T.accent : hasClicka ? '#4F46E5' : hasExternal ? '#FFF7ED' : '#F4F4F5',
                  color: active || hasClicka ? '#fff' : hasExternal ? '#9A3412' : T.text,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: isMobile ? 2 : '6px 4px',
                  minWidth: 0,
                  maxWidth: '100%',
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div>{day}</div>
                {hasClicka ? <div style={{ fontSize: isMobile ? 9 : 10, opacity: 0.85 }}>{count}</div> : null}
                {!hasClicka && hasExternal ? (
                  <div style={{ fontSize: isMobile ? 9 : 10, opacity: 0.85 }}>•</div>
                ) : null}
              </button>
            );
          })}
        </div>
        {selectedCalendarDate ? (
          <p style={{ margin: '10px 2px 0', fontSize: 12, color: T.muted }}>
            {isEn ? 'Filter: ' : 'Филтър: '}{formatBgDateDMY(selectedCalendarDate, locale)}{' '}
            <button type="button" onClick={() => setSelectedCalendarDate(null)} style={{ border: 'none', background: 'none', color: T.accent, cursor: 'pointer', padding: 0 }}>
              {isEn ? '(clear)' : '(изчисти)'}
            </button>
          </p>
        ) : null}
        {externalCalendarByDate.size > 0 ? (
          <p style={{ margin: '8px 2px 0', fontSize: 11, color: T.subtle }}>
            {isEn
              ? 'Orange days = blocked time slots (Telegram / external calendar).'
              : 'Оранжеви дни = блокирани часове (Telegram / външен календар).'}
          </p>
        ) : null}
      </div>

      {visibleBookings.length === 0 && externalCalendarEvents.length === 0 ? (
        <div style={{ padding: '20px 14px', color: T.muted, textAlign: 'center', fontSize: 14 }}>
          {isEn ? 'No bookings for the selected filters.' : 'Няма резервации за избраните филтри.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: isMobile ? 12 : 8 }}>
          {selectedCalendarDate && externalCalendarEvents.length > 0 ? (
            <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
              {externalCalendarEvents.map((ev) => (
                <div key={ev.id} style={{
                  border: 'none', borderRadius: isMobile ? 18 : 14,
                  padding: isMobile ? '16px 18px' : '14px 16px', background: '#FFFBEB',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.07)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{ev.title}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                        {isEn ? 'External booking' : 'Външна резервация'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                      {ev.startTime}{ev.endTime && ev.endTime !== ev.startTime ? ` – ${ev.endTime}` : ''}
                      {ev.source === 'block' ? ' · Telegram' : ev.source === 'google' ? ' · Google' : (isEn ? ' · Calendar' : ' · Календар')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {bookingGroups.map(([groupKey, groupLabel]) => {
            const rows = groupedVisibleBookings[groupKey];
            if (rows.length === 0) return null;
            return (
              <div key={groupKey} style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
                <p style={{ margin: '2px 2px 0', fontSize: 13, fontWeight: 700, color: '#111' }}>
                  {groupLabel}
                </p>
                {rows.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isMobile={isMobile}
                    T={T}
                    updateBookingStatus={updateBookingStatus}
                    locale={locale}
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

type EditDraft = { key: string; id: string; name: string; phone: string; email: string };
type ClientSort = 'newest' | 'visits' | 'alpha';

export function ClientsPanel({
  clients,
  isMobile,
  T,
  onDelete,
  onEdit,
  locale,
}: {
  clients: ClientSummary[];
  isMobile: boolean;
  T: ThemePalette;
  onDelete?: (key: string) => void;
  onEdit?: (key: string, data: { name: string; phone: string; email: string }) => void;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<EditDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<ClientSort>('newest');
  const frozenOrderRef = React.useRef<string[] | null>(null);

  const sortedClients = React.useMemo(() => {
    const arr = [...clients];
    if (sortBy === 'alpha') return arr.sort((a, b) => a.name.localeCompare(b.name, 'bg'));
    if (sortBy === 'visits') return arr.sort((a, b) => b.visits - a.visits || b.lastVisit.localeCompare(a.lastVisit));
    return arr.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [clients, sortBy]);

  const displayClients = React.useMemo(() => {
    if (frozenOrderRef.current) {
      const map = new Map(clients.map(c => [c.key, c]));
      return frozenOrderRef.current.map(k => map.get(k)).filter(Boolean) as ClientSummary[];
    }
    return sortedClients;
  }, [clients, sortedClients]);

  function openEdit(client: ClientSummary) {
    frozenOrderRef.current = sortedClients.map(c => c.key);
    setEditDraft({ key: client.key, id: client.key.slice(3), name: client.name, phone: client.phone, email: client.email });
  }

  function closeEdit() {
    frozenOrderRef.current = null;
    setEditDraft(null);
  }

  if (clients.length === 0) {
    return (
      <div style={{ borderRadius: 12, padding: '20px 14px', color: T.muted, textAlign: 'center' }}>
        {isEn ? 'No clients.' : 'Няма клиенти.'}
      </div>
    );
  }

  const SORT_OPTIONS: { id: ClientSort; label: string }[] = [
    { id: 'newest', label: isEn ? 'Newest' : 'Най-нови' },
    { id: 'visits', label: isEn ? 'Bookings' : 'Резервации' },
    { id: 'alpha', label: isEn ? 'A–Z' : 'А–Я' },
  ];

  return (
    <>
    {/* Edit modal */}
    {editDraft && (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }}
        onClick={closeEdit}
      >
        <div
          style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#000' }}>{isEn ? 'Edit client' : 'Редактирай клиент'}</h3>
          {(['name', 'phone', 'email'] as const).map((field) => (
            <input
              key={field}
              type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
              placeholder={field === 'name' ? (isEn ? 'Name' : 'Име') : field === 'phone' ? (isEn ? 'Phone' : 'Телефон') : (isEn ? 'Email' : 'Имейл')}
              value={editDraft[field]}
              onChange={(e) => setEditDraft((d) => d ? { ...d, [field]: e.target.value } : d)}
              style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#000' }}
            />
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <button
              type="button"
              disabled={saving || !editDraft.name.trim()}
              onClick={async () => {
                setSaving(true);
                await onEdit?.(editDraft.key, { name: editDraft.name, phone: editDraft.phone, email: editDraft.email });
                setSaving(false);
                closeEdit();
              }}
              style={{ flex: '1 1 150px', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Save' : 'Запази')}
            </button>
            <button
              type="button"
              onClick={closeEdit}
              style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', fontSize: 14, cursor: 'pointer', color: T.muted }}
            >
              {isEn ? 'Cancel' : 'Отказ'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Sort controls */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setSortBy(opt.id)}
          style={{
            padding: '5px 12px',
            borderRadius: 20,
            border: `1px solid ${sortBy === opt.id ? '#18181B' : T.border}`,
            background: sortBy === opt.id ? '#18181B' : 'transparent',
            color: sortBy === opt.id ? '#fff' : T.muted,
            fontSize: 12,
            fontWeight: sortBy === opt.id ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 120ms',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>

    <div style={{ display: 'grid', gap: isMobile ? 12 : 8 }}>
      {displayClients.map(client => (
        <div
          key={client.key}
          style={{
            border: 'none',
            borderRadius: isMobile ? 18 : 14,
            padding: isMobile ? '16px 18px' : '14px 16px',
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.07)',
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: isMobile ? 12 : 12, minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p style={{ margin: 0, fontSize: isMobile ? 16 : 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{client.name}</span>
                {client.isNew && client.visits === 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#000', background: '#f5f5f5', borderRadius: 4, padding: '2px 6px', lineHeight: 1.4, userSelect: 'none', flexShrink: 0 }}>{isEn ? 'new' : 'нов'}</span>
                )}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                {client.phone || (isEn ? 'No phone' : 'Няма телефон')}
                {client.email ? ` · ${client.email}` : ''}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: T.subtle }}>
                {isEn ? 'Last booking: ' : 'Последна резервация: '}{client.lastVisit ? new Date(client.lastVisit).toLocaleString(isEn ? 'en-US' : 'bg-BG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                {client.lastVisit && Math.max(1, Number(client.lastBookingQuantity ?? 1) || 1) > 1
                  ? ` · ${Math.max(1, Number(client.lastBookingQuantity ?? 1) || 1)} ${isEn ? 'beds' : 'легла'}`
                  : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', justifyContent: 'space-between', gap: 8, flexShrink: 0, minWidth: 0 }}>
              <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, color: T.subtle }}>{isEn ? 'Visits' : 'Посещения'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{client.visits}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>
                  {formatSalonPrice(client.totalSpent)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: isMobile ? 0 : 4, marginLeft: isMobile ? 'auto' : 0, flexShrink: 0 }}>
                {onEdit && confirmKey !== client.key && (
                  <button
                    type="button"
                    onClick={() => openEdit(client)}
                    style={{ fontSize: 13, color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', padding: isMobile ? 8 : '2px 4px', lineHeight: 1, minWidth: isMobile ? 36 : undefined, minHeight: isMobile ? 36 : undefined }}
                    title={isEn ? 'Edit' : 'Редактирай'}
                  >
                    ✏️
                  </button>
                )}
                {/* Delete */}
                {onDelete && (
                  confirmKey === client.key ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => { onDelete(client.key); setConfirmKey(null); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        {isEn ? 'Delete' : 'Изтрий'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmKey(null)}
                        style={{ fontSize: 11, color: T.muted, background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        {isEn ? 'Cancel' : 'Отказ'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmKey(client.key)}
                      style={{ fontSize: 13, color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', padding: isMobile ? 8 : '2px 4px', lineHeight: 1, minWidth: isMobile ? 36 : undefined, minHeight: isMobile ? 36 : undefined }}
                      title={isEn ? 'Delete client' : 'Изтрий клиент'}
                    >
                      🗑
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
