'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import type { BookingRecord, WorkingHours } from '@/lib/admin-site';
import type { BookingBlock } from '@/lib/booking-blocks';
import type { BookingClassSchedule, BookingClassSlot } from '@/lib/class-schedule';
import { formatSalonPrice } from '@/lib/salon-currency';
import type { Locale } from '@/lib/i18n';

type BookingStatus = BookingRecord['status'];
type BookingGroupKey = 'upcoming' | 'past' | 'completed' | 'cancelled';
export type BookingListFilter = 'all' | 'upcoming' | 'history' | BookingStatus;

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
  activePackage?: {
    id: string;
    packageName: string;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    expiresAt: string;
    status: 'active' | 'expired' | 'used';
  } | null;
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
  clients: ClientSummary[];
  workingHours: WorkingHours;
  bookingBlocks: BookingBlock[];
  classSchedule: BookingClassSchedule;
  slotIntervalMin: number;
  selectedCalendarDate: string | null;
  setSelectedCalendarDate: (next: string | null) => void;
  setCalendarCursor: (next: (prev: Date) => Date) => void;
  visibleBookings: BookingRecord[];
  groupedVisibleBookings: Record<BookingGroupKey, BookingRecord[]>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  createAdminBooking: (input: AdminBookingInput) => Promise<void>;
  inp: CSSProperties;
  btn: ButtonFactory;
  T: ThemePalette;
  locale: Locale;
};

export type AdminBookingInput = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  serviceDuration: number;
  date: string;
  time: string;
  staffMemberName?: string;
  bookingQuantity: number;
  notes?: string;
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

function todayKey() {
  const now = new Date();
  return ymdKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizeDateKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const legacy = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (legacy) return `${legacy[3]}-${legacy[2]}-${legacy[1]}`;
  return raw;
}

const DATE_DAY_TO_WORKING_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function timeToMinutes(value: string): number | null {
  const match = String(value ?? '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function overlaps(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && end > otherStart;
}

function getClassSlotsForDate(classSchedule: BookingClassSchedule, date: string): BookingClassSlot[] {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const dayKey = String(new Date(`${date}T12:00:00`).getDay());
  return (classSchedule?.[dayKey] ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
}

function getBookingStaffName(booking: BookingRecord): string {
  return String((booking as BookingRecord & { staff_name?: string | null }).staff_name ?? '').trim();
}

function getBookingQuantity(booking: BookingRecord): number {
  return Math.max(1, Number(booking.booking_quantity ?? 1) || 1);
}

function isActiveBookingForCapacity(booking: BookingRecord): boolean {
  const status = String(booking.status ?? '').trim().toLowerCase();
  return status !== 'cancelled';
}

function resolveBookingCapacityFromRows(rows: BookingRecord[]): number {
  const beds = rows.filter(isActiveBookingForCapacity).reduce((sum, booking) => sum + getBookingQuantity(booking), 0);
  return Math.max(5, beds);
}

type TimelineRow = {
  date?: string;
  time: string;
  endTime?: string;
  className?: string;
  trainer?: string;
  capacity?: number;
  rows: BookingRecord[];
  cancelledRows?: BookingRecord[];
  beds: number;
  status?: 'free' | 'booked' | 'blocked';
  blocks?: ExternalCalendarEventRow[];
};

function buildDailyTimelineRows({
  date,
  bookingBlocks,
  classSchedule,
  externalEvents,
  bookings,
  slotIntervalMin,
  locale,
}: {
  date: string;
  bookingBlocks: BookingBlock[];
  classSchedule: BookingClassSchedule;
  externalEvents: ExternalCalendarEventRow[];
  bookings: BookingRecord[];
  slotIntervalMin: number;
  locale: Locale;
}): TimelineRow[] {
  const interval = [15, 20, 30, 45, 60].includes(slotIntervalMin) ? slotIntervalMin : 30;
  const allDayBlocked = bookingBlocks.some((block) => block.date === date && block.allDay);
  const activeBookings = bookings.filter((booking) => normalizeDateKey(booking.date) === date && isActiveBookingForCapacity(booking));
  const cancelledBookings = bookings.filter((booking) => {
    const status = String(booking.status ?? '').trim().toLowerCase();
    return normalizeDateKey(booking.date) === date && status === 'cancelled';
  });
  const classSlots = getClassSlotsForDate(classSchedule, date);

  const rows: TimelineRow[] = [];
  for (const classSlot of classSlots) {
    const start = timeToMinutes(classSlot.start);
    const end = timeToMinutes(classSlot.end);
    if (start == null || end == null || end <= start) continue;
    const slotBookings = activeBookings
      .filter((booking) => {
        const bookingStart = timeToMinutes(String(booking.time ?? '').slice(0, 5));
        if (bookingStart == null) return false;
        const bookingEnd = bookingStart + Math.max(5, Number(booking.service_duration ?? interval) || interval);
        return overlaps(start, end, bookingStart, bookingEnd);
      })
      .sort((a, b) => String(a.client_name ?? '').localeCompare(String(b.client_name ?? ''), locale === 'en' ? 'en' : 'bg'));
    const cancelledRows = cancelledBookings
      .filter((booking) => {
        const bookingStart = timeToMinutes(String(booking.time ?? '').slice(0, 5));
        if (bookingStart == null) return false;
        const bookingEnd = bookingStart + Math.max(5, Number(booking.service_duration ?? interval) || interval);
        return overlaps(start, end, bookingStart, bookingEnd);
      })
      .sort((a, b) => String(a.client_name ?? '').localeCompare(String(b.client_name ?? ''), locale === 'en' ? 'en' : 'bg'));
    const blocks = allDayBlocked
      ? [{ id: `block-${date}-all-day`, title: '', date, startTime: classSlot.start, endTime: classSlot.end, source: 'block' }]
      : externalEvents.filter((event) => {
          const blockStart = timeToMinutes(event.startTime);
          const blockEnd = timeToMinutes(event.endTime);
          return blockStart != null && blockEnd != null && overlaps(start, end, blockStart, blockEnd);
        });

    rows.push({
      date,
      time: classSlot.start,
      endTime: classSlot.end,
      className: classSlot.className,
      trainer: classSlot.trainer,
      capacity: classSlot.capacity,
      rows: slotBookings,
      cancelledRows,
      beds: slotBookings.reduce((sum, booking) => sum + getBookingQuantity(booking), 0),
      status: slotBookings.length > 0 ? 'booked' : blocks.length > 0 ? 'blocked' : 'free',
      blocks,
    });
  }
  return rows;
}

function bookingMatchesSearch(booking: BookingRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    booking.client_name,
    booking.client_phone,
    booking.client_email,
    booking.service_name,
    getBookingStaffName(booking),
    booking.notes,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

type DailyScheduleSlot = {
  time: string;
  endTime: string;
  status: 'free' | 'booked' | 'blocked';
  bookings: BookingRecord[];
  cancelledBookings: BookingRecord[];
  blocks: ExternalCalendarEventRow[];
};

function buildDailyScheduleSlots({
  date,
  workingHours,
  bookingBlocks,
  externalEvents,
  bookings,
  slotIntervalMin,
}: {
  date: string;
  workingHours: WorkingHours;
  bookingBlocks: BookingBlock[];
  externalEvents: ExternalCalendarEventRow[];
  bookings: BookingRecord[];
  slotIntervalMin: number;
}): DailyScheduleSlot[] {
  const day = DATE_DAY_TO_WORKING_KEY[new Date(`${date}T12:00:00`).getDay()];
  const workingDay = workingHours[day];
  if (!workingDay || workingDay.closed) return [];
  const open = timeToMinutes(workingDay.open);
  const close = timeToMinutes(workingDay.close);
  if (open == null || close == null || close <= open) return [];

  const interval = [15, 20, 30, 45, 60].includes(slotIntervalMin) ? slotIntervalMin : 30;
  const allDayBlocked = bookingBlocks.some((block) => block.date === date && block.allDay);
  const blocks = externalEvents;
  const activeBookings = bookings.filter((booking) => {
    const status = String(booking.status ?? '').trim().toLowerCase();
    return booking.date === date && status !== 'cancelled';
  });
  const cancelledBookings = bookings.filter((booking) => {
    const status = String(booking.status ?? '').trim().toLowerCase();
    return booking.date === date && status === 'cancelled';
  });

  const slots: DailyScheduleSlot[] = [];
  for (let start = open; start < close; start += interval) {
    const end = Math.min(start + interval, close);
    const time = minutesToTime(start);
    const slotBookings = activeBookings.filter((booking) => {
      const bookingStart = timeToMinutes(String(booking.time ?? ''));
      if (bookingStart == null) return false;
      const bookingEnd = bookingStart + Math.max(5, Number(booking.service_duration ?? interval) || interval);
      return overlaps(start, end, bookingStart, bookingEnd);
    });
    const slotCancelledBookings = cancelledBookings.filter((booking) => {
      const bookingStart = timeToMinutes(String(booking.time ?? ''));
      if (bookingStart == null) return false;
      const bookingEnd = bookingStart + Math.max(5, Number(booking.service_duration ?? interval) || interval);
      return overlaps(start, end, bookingStart, bookingEnd);
    });
    const slotBlocks = allDayBlocked
      ? [{ id: `block-${date}-all-day`, title: '', date, startTime: workingDay.open, endTime: workingDay.close, source: 'block' }]
      : blocks.filter((block) => {
          const blockStart = timeToMinutes(block.startTime);
          const blockEnd = timeToMinutes(block.endTime);
          return blockStart != null && blockEnd != null && overlaps(start, end, blockStart, blockEnd);
        });
    slots.push({
      time,
      endTime: minutesToTime(end),
      status: slotBookings.length > 0 ? 'booked' : slotBlocks.length > 0 ? 'blocked' : 'free',
      bookings: slotBookings,
      cancelledBookings: slotCancelledBookings,
      blocks: slotBlocks,
    });
  }
  return slots;
}

function isUpcomingBooking(booking: BookingRecord): boolean {
  const status = String(booking.status ?? '').trim().toLowerCase();
  if (status === 'cancelled' || status === 'completed') return false;
  return !bookingSlotIsPastSimple(String(booking.date ?? ''), String(booking.time ?? ''));
}

function bookingFilterCount(bookings: BookingRecord[], filter: BookingListFilter): number {
  if (filter === 'all') return bookings.length;
  if (filter === 'upcoming') return bookings.filter(isUpcomingBooking).length;
  if (filter === 'history') {
    return bookings.filter((booking) => {
      const status = String(booking.status ?? '').trim().toLowerCase();
      return status === 'completed' || status === 'cancelled' || bookingSlotIsPastSimple(String(booking.date ?? ''), String(booking.time ?? ''));
    }).length;
  }
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

function historyBookingGroups(locale: Locale): ReadonlyArray<readonly [BookingGroupKey, string]> {
  const isEn = locale === 'en';
  return [
    ['past', isEn ? 'Past' : 'Минали'],
    ['completed', isEn ? 'Completed' : 'Завършени'],
    ['cancelled', isEn ? 'Cancelled' : 'Отказани'],
  ];
}

function BookingCard({
  booking,
  isMobile,
  T,
  updateBookingStatus,
  deleteBooking,
  locale,
}: {
  booking: BookingRecord;
  isMobile: boolean;
  T: ThemePalette;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const STATUS_CFG = statusCfg(locale);
  const cfg = STATUS_CFG[booking.status];
  const bookingQuantity = getBookingQuantity(booking);
  const staffName = getBookingStaffName(booking);

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
          {staffName ? ` · ${staffName}` : ''}
          {bookingQuantity > 1 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: 7,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#DCFCE7',
                color: '#047857',
                fontSize: isMobile ? 12 : 11,
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {bookingQuantity} {isEn ? 'beds' : 'легла'}
            </span>
          ) : null}
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
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
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
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm(
              isEn
                ? `Delete booking for ${booking.client_name}?`
                : `Да изтрия ли резервацията на ${booking.client_name}?`,
            );
            if (ok) void deleteBooking(booking.id);
          }}
          style={{
            border: '1px solid rgba(220,38,38,0.24)',
            borderRadius: 999,
            background: '#FEF2F2',
            color: '#B91C1C',
            padding: '4px 9px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {isEn ? 'Delete' : 'Изтрий'}
        </button>
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
  clients,
  workingHours,
  bookingBlocks,
  classSchedule,
  slotIntervalMin,
  selectedCalendarDate,
  setSelectedCalendarDate,
  setCalendarCursor,
  visibleBookings,
  updateBookingStatus,
  deleteBooking,
  createAdminBooking,
  inp,
  btn,
  T,
  locale,
}: BookingsPanelProps) {
  const isEn = locale === 'en';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [addDraft, setAddDraft] = React.useState<{
    slot: TimelineRow;
    date: string;
    clientKey: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    bookingQuantity: number;
    notes: string;
  } | null>(null);
  const [addError, setAddError] = React.useState('');
  const [addSaving, setAddSaving] = React.useState(false);
  const CALENDAR_DAY_NAMES = isEn ? CALENDAR_DAY_NAMES_EN : CALENDAR_DAY_NAMES_BG;
  const bookingGroups =
    statusFilter === 'upcoming'
      ? upcomingBookingGroups(locale)
      : statusFilter === 'history'
        ? historyBookingGroups(locale)
        : allBookingGroups(locale);
  const today = todayKey();
  const selectedDayBookings = React.useMemo(
    () =>
      selectedCalendarDate
        ? bookings.filter((booking) => normalizeDateKey(booking.date) === selectedCalendarDate)
        : visibleBookings,
    [bookings, selectedCalendarDate, visibleBookings],
  );
  const selectedDayActiveBookings = React.useMemo(
    () => selectedDayBookings.filter(isActiveBookingForCapacity),
    [selectedDayBookings],
  );
  const selectedDayBeds = React.useMemo(
    () => selectedDayActiveBookings.reduce((sum, booking) => sum + getBookingQuantity(booking), 0),
    [selectedDayActiveBookings],
  );
  const selectedDaySlots = React.useMemo(
    () =>
      selectedCalendarDate
        ? getClassSlotsForDate(classSchedule, selectedCalendarDate).length
        : new Set(selectedDayActiveBookings.map((booking) => String(booking.time ?? '').slice(0, 5)).filter(Boolean)).size,
    [classSchedule, selectedCalendarDate, selectedDayActiveBookings],
  );
  const selectedDayCapacity = selectedCalendarDate
    ? getClassSlotsForDate(classSchedule, selectedCalendarDate).reduce((sum, slot) => sum + Math.max(1, Number(slot.capacity) || 1), 0)
    : selectedDaySlots * 5;
  const panelVisibleBookings = React.useMemo(
    () => visibleBookings.filter((booking) => bookingMatchesSearch(booking, searchQuery)),
    [visibleBookings, searchQuery],
  );
  const panelGroupedBookings = React.useMemo(() => {
    const groups: Record<BookingGroupKey, BookingRecord[]> = {
      upcoming: [],
      past: [],
      completed: [],
      cancelled: [],
    };
    for (const booking of panelVisibleBookings) {
      const status = String(booking.status ?? '').trim().toLowerCase();
      if (status === 'cancelled') {
        groups.cancelled.push(booking);
      } else if (status === 'completed') {
        groups.completed.push(booking);
      } else if (bookingSlotIsPastSimple(String(booking.date ?? ''), String(booking.time ?? ''))) {
        groups.past.push(booking);
      } else {
        groups.upcoming.push(booking);
      }
    }
    return groups;
  }, [panelVisibleBookings]);
  const timelineRows = React.useMemo<TimelineRow[]>(() => {
    const map = new Map<string, BookingRecord[]>();
    for (const booking of panelVisibleBookings) {
      const dateKey = normalizeDateKey(booking.date);
      const timeKey = String(booking.time ?? '').slice(0, 5) || '—';
      const staffKey = getBookingStaffName(booking);
      const key = `${dateKey}|${timeKey}|${staffKey}`;
      const arr = map.get(key) ?? [];
      arr.push(booking);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([key, rows]) => {
        const [date = '', time = '—'] = key.split('|');
        const sortedRows = rows.sort((a, b) => String(a.client_name ?? '').localeCompare(String(b.client_name ?? ''), locale === 'en' ? 'en' : 'bg'));
        const first = sortedRows[0];
        const start = timeToMinutes(time);
        const duration = Math.max(5, Number(first?.service_duration ?? slotIntervalMin) || slotIntervalMin);
        return {
          date,
          time,
          endTime: start == null ? undefined : minutesToTime(start + duration),
          className: String(first?.service_name ?? '').trim() || undefined,
          trainer: first ? getBookingStaffName(first) : undefined,
          capacity: resolveBookingCapacityFromRows(sortedRows),
          rows: sortedRows,
          beds: sortedRows.filter(isActiveBookingForCapacity).reduce((sum, booking) => sum + getBookingQuantity(booking), 0),
        };
      })
      .sort((a, b) => `${a.date ?? ''} ${a.time}`.localeCompare(`${b.date ?? ''} ${b.time}`));
  }, [panelVisibleBookings, locale, slotIntervalMin]);
  const dailyTimelineRows = React.useMemo(
    () =>
      selectedCalendarDate
        ? buildDailyTimelineRows({
            date: selectedCalendarDate,
            bookingBlocks,
            classSchedule,
            externalEvents: externalCalendarEvents,
            bookings,
            slotIntervalMin,
            locale,
          })
        : [],
    [selectedCalendarDate, bookingBlocks, classSchedule, externalCalendarEvents, bookings, slotIntervalMin, locale],
  );
  const displayedTimelineRows = selectedCalendarDate ? dailyTimelineRows : timelineRows;
  const useTimelineView = Boolean(selectedCalendarDate) && (statusFilter === 'upcoming' || statusFilter === 'pending' || statusFilter === 'all');
  const timelineEmpty = useTimelineView && displayedTimelineRows.length === 0;

  function openAddClient(slot: TimelineRow, explicitDate?: string | null) {
    const draftDate = explicitDate ?? slot.date ?? selectedCalendarDate ?? '';
    if (!draftDate) {
      setAddError(isEn ? 'Choose a date first.' : 'Първо избери конкретна дата.');
      return;
    }
    setAddError('');
    setAddDraft({
      slot,
      date: draftDate,
      clientKey: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      bookingQuantity: 1,
      notes: '',
    });
  }

  function selectAddClient(clientKey: string) {
    const client = clients.find((item) => item.key === clientKey);
    setAddDraft((prev) => prev
      ? {
          ...prev,
          clientKey,
          clientName: client?.name ?? '',
          clientPhone: client?.phone ?? '',
          clientEmail: client?.email ?? '',
        }
      : prev);
  }

  async function submitAddClient() {
    if (!addDraft) return;
    if (!addDraft.date) {
      setAddError(isEn ? 'Choose a date first.' : 'Първо избери конкретна дата.');
      return;
    }
    const clientName = addDraft.clientName.trim();
    const clientPhone = addDraft.clientPhone.trim();
    const clientEmail = addDraft.clientEmail.trim();
    const notes = addDraft.notes.trim();
    const start = timeToMinutes(addDraft.slot.time);
    const end = timeToMinutes(addDraft.slot.endTime ?? '');
    const duration = Math.max(5, start != null && end != null ? end - start : 30);
    const payload: AdminBookingInput = {
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      serviceName: addDraft.slot.className || (isEn ? 'Class' : 'Клас'),
      serviceDuration: duration,
      date: addDraft.date,
      time: addDraft.slot.time,
      staffMemberName: addDraft.slot.trainer || undefined,
      bookingQuantity: Math.max(1, Math.round(Number(addDraft.bookingQuantity) || 1)),
      notes: notes || undefined,
    };
    if (!clientName || !clientPhone) {
      setAddError(isEn ? 'Name and phone are required.' : 'Име и телефон са задължителни.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      await createAdminBooking(payload);
      setAddDraft(null);
    } catch (err) {
      const details = `${payload.date} ${payload.time} · ${payload.serviceName}${payload.staffMemberName ? ` · ${payload.staffMemberName}` : ''}`;
      const message = err instanceof Error ? err.message : (isEn ? 'Could not add the client.' : 'Клиентът не можа да бъде добавен.');
      setAddError(`${message} (${details})`);
    } finally {
      setAddSaving(false);
    }
  }
  const dailyScheduleSlots = React.useMemo(
    () =>
      selectedCalendarDate
        ? buildDailyScheduleSlots({
            date: selectedCalendarDate,
            workingHours,
            bookingBlocks,
            externalEvents: externalCalendarEvents,
            bookings,
            slotIntervalMin,
          })
         : [],
    [selectedCalendarDate, workingHours, bookingBlocks, externalCalendarEvents, bookings, slotIntervalMin],
  );

  return (
    <>
      {addDraft ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(15,23,42,0.36)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !addSaving) setAddDraft(null);
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              borderRadius: 18,
              background: '#fff',
              boxShadow: '0 24px 70px rgba(15,23,42,0.24)',
              padding: isMobile ? 18 : 22,
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: T.subtle, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isEn ? 'Add client' : 'Добави клиент'}
                </p>
                <h3 style={{ margin: '5px 0 0', fontSize: 20, lineHeight: 1.2, color: T.text }}>
                  {addDraft.slot.className || (isEn ? 'Class' : 'Клас')} · {addDraft.slot.time}{addDraft.slot.endTime ? ` - ${addDraft.slot.endTime}` : ''}
                </h3>
                {addDraft.slot.trainer ? (
                  <p style={{ margin: '5px 0 0', fontSize: 13, color: T.muted, fontWeight: 650 }}>
                    {addDraft.slot.trainer}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => !addSaving && setAddDraft(null)} style={{ ...btn('ghost'), padding: '6px 10px' }}>
                ×
              </button>
            </div>

            <select
              value={addDraft.clientKey}
              onChange={(event) => selectAddClient(event.target.value)}
              style={inp}
            >
              <option value="">
                {isEn ? 'Choose existing client or type manually' : 'Избери съществуващ клиент или въведи ръчно'}
              </option>
              {clients.map((client) => (
                <option key={client.key} value={client.key}>
                  {client.name}
                  {client.phone ? ` · ${client.phone}` : ''}
                  {client.email ? ` · ${client.email}` : ''}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <input
                value={addDraft.clientName}
                onChange={(event) => setAddDraft((prev) => prev ? { ...prev, clientKey: '', clientName: event.target.value } : prev)}
                placeholder={isEn ? 'Client name' : 'Име на клиента'}
                style={inp}
              />
              <input
                value={addDraft.clientPhone}
                onChange={(event) => setAddDraft((prev) => prev ? { ...prev, clientKey: '', clientPhone: event.target.value } : prev)}
                placeholder={isEn ? 'Phone' : 'Телефон'}
                style={inp}
              />
              <input
                value={addDraft.clientEmail}
                onChange={(event) => setAddDraft((prev) => prev ? { ...prev, clientKey: '', clientEmail: event.target.value } : prev)}
                placeholder={isEn ? 'Email optional' : 'Имейл по желание'}
                style={inp}
              />
              <select
                value={addDraft.bookingQuantity}
                onChange={(event) => setAddDraft((prev) => prev ? { ...prev, bookingQuantity: Number(event.target.value) } : prev)}
                style={inp}
              >
                {Array.from({ length: Math.max(1, Math.min(10, Math.max(1, Number(addDraft.slot.capacity ?? 1) - addDraft.slot.beds))) }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {isEn ? (i === 0 ? 'spot' : 'spots') : (i === 0 ? 'място' : 'места')}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={addDraft.notes}
              onChange={(event) => setAddDraft((prev) => prev ? { ...prev, notes: event.target.value } : prev)}
              placeholder={isEn ? 'Note optional' : 'Бележка по желание'}
              style={{ ...inp, minHeight: 86, resize: 'vertical' }}
            />
            {addError ? (
              <p style={{ margin: 0, color: '#B91C1C', fontSize: 13, fontWeight: 700 }}>{addError}</p>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => !addSaving && setAddDraft(null)} style={btn('ghost')} disabled={addSaving}>
                {isEn ? 'Cancel' : 'Отказ'}
              </button>
              <button type="button" onClick={() => void submitAddClient()} style={btn('primary')} disabled={addSaving}>
                {addSaving ? (isEn ? 'Adding...' : 'Добавяне...') : (isEn ? 'Add to class' : 'Добави в класа')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isMobile && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {([
            ['upcoming', isEn ? 'Class schedule' : 'График на класове'],
            ['history', isEn ? 'History' : 'История'],
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
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCalendarCursor(() => new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedCalendarDate(today);
              setStatusFilter('upcoming');
            }}
            style={{
              border: selectedCalendarDate === today ? 'none' : `1px solid ${T.border}`,
              borderRadius: 999,
              background: selectedCalendarDate === today ? '#111' : '#fff',
              color: selectedCalendarDate === today ? '#fff' : T.text,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: selectedCalendarDate === today ? '0 8px 18px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {isEn ? 'Today' : 'Днес'}
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
            const classCount = getClassSlotsForDate(classSchedule, key).length;
            const active = selectedCalendarDate === key;
            const hasClicka = count > 0;
            const hasExternal = externalCount > 0;
            const hasClasses = classCount > 0;
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
                  background: active && hasClicka ? '#047857' : active ? T.accent : hasClicka ? '#16A34A' : hasClasses ? '#E2E8F0' : hasExternal ? '#FFF7ED' : '#F4F4F5',
                  color: active || hasClicka ? '#fff' : hasClasses ? '#334155' : hasExternal ? '#9A3412' : T.text,
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
                {!hasClicka && !hasClasses && hasExternal ? (
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

      <div
        style={{
          display: 'grid',
          gap: 10,
          marginBottom: 14,
          borderRadius: isMobile ? 18 : 16,
          background: '#fff',
          padding: isMobile ? 14 : 16,
          boxShadow: '0 4px 18px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: T.subtle, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {statusFilter === 'history' ? (isEn ? 'History' : 'История') : (isEn ? 'Daily schedule' : 'Дневен график')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: isMobile ? 18 : 20, color: T.text, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {selectedCalendarDate ? formatBgDateDMY(selectedCalendarDate, locale) : (isEn ? 'All dates' : 'Всички дати')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ borderRadius: 999, background: '#ECFDF5', color: '#047857', padding: '7px 10px', fontSize: 12, fontWeight: 800 }}>
              {selectedDayBeds}{selectedDayCapacity ? `/${selectedDayCapacity}` : ''} {isEn ? 'beds' : 'легла'}
            </span>
            <span style={{ borderRadius: 999, background: '#F4F4F5', color: T.muted, padding: '7px 10px', fontSize: 12, fontWeight: 800 }}>
              {selectedDayActiveBookings.length} {isEn ? 'bookings' : 'резервации'}
            </span>
          </div>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={isEn ? 'Search client, phone, email, service, trainer…' : 'Търси клиент, телефон, имейл, услуга, треньор…'}
          style={{
            width: '100%',
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            background: '#FAFAFA',
            color: T.text,
            padding: '11px 13px',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {selectedCalendarDate && displayedTimelineRows.length === 0 && dailyScheduleSlots.length > 0 ? (
        <div style={{ marginBottom: 14, display: 'grid', gap: 6 }}>
          <p style={{ margin: '0 2px', fontSize: 13, fontWeight: 700, color: '#111' }}>
            {isEn ? 'Daily schedule' : 'График за деня'}
          </p>
          {dailyScheduleSlots.map((slot) => {
            const booked = slot.status === 'booked';
            const blocked = slot.status === 'blocked';
            return (
              <div
                key={`${selectedCalendarDate}-${slot.time}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '68px 1fr' : '86px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  borderRadius: isMobile ? 14 : 12,
                  padding: isMobile ? '10px 12px' : '9px 12px',
                  background: booked ? '#EEF2FF' : blocked ? '#FFFBEB' : '#FAFAFA',
                  border: `1px solid ${booked ? 'rgba(79,70,229,0.28)' : blocked ? 'rgba(245,158,11,0.34)' : T.border}`,
                }}
              >
                <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 750, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                  {slot.time}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: isMobile ? 14 : 13, fontWeight: 650, color: booked ? '#3730A3' : blocked ? '#92400E' : T.muted }}>
                    {booked
                      ? slot.bookings.map((booking) => booking.client_name || booking.service_name).join(', ')
                      : blocked
                        ? (slot.blocks[0]?.title || (isEn ? 'Blocked' : 'Блокирано'))
                        : (isEn ? 'Free' : 'Свободен час')}
                  </p>
                  {booked ? (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {slot.bookings.map((booking) => booking.service_name).join(', ')}
                    </p>
                  ) : null}
                  {slot.cancelledBookings.length > 0 ? (
                    <div style={{ display: 'grid', gap: 4, marginTop: booked || blocked ? 8 : 0 }}>
                      {slot.cancelledBookings.map((booking) => (
                        <div
                          key={`cancelled-${booking.id}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            borderRadius: 10,
                            padding: '7px 9px',
                            background: '#FEF2F2',
                            border: '1px solid rgba(239,68,68,0.24)',
                            color: '#991B1B',
                            opacity: 0.86,
                          }}
                        >
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 750 }}>
                            {booking.client_name || booking.service_name || (isEn ? 'Cancelled booking' : 'Отказана резервация')}
                          </span>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#DC2626' }}>
                            {isEn ? 'Cancelled' : 'Отказана'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {!isMobile ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: booked ? '#3730A3' : blocked ? '#92400E' : T.subtle }}>
                    {booked ? (isEn ? 'Booked' : 'Запазен') : blocked ? (isEn ? 'Blocked' : 'Блокиран') : (isEn ? 'Available' : 'Свободен')}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {timelineEmpty || (panelVisibleBookings.length === 0 && externalCalendarEvents.length === 0 && displayedTimelineRows.length === 0) ? (
        <div style={{ padding: '20px 14px', color: T.muted, textAlign: 'center', fontSize: 14 }}>
          {timelineEmpty
            ? (isEn ? 'No classes in the schedule for this day.' : 'Няма класове в графика за този ден.')
            : (isEn ? 'No bookings for the selected filters.' : 'Няма резервации за избраните филтри.')}
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
          {useTimelineView ? (
            <div style={{ display: 'grid', gap: isMobile ? 12 : 10 }}>
              {displayedTimelineRows.map((slot) => {
                const isFree = slot.status === 'free';
                const isBlocked = slot.status === 'blocked';
                const capacity = Math.max(1, Number(slot.capacity ?? 5) || 5);
                const availableBeds = Math.max(0, capacity - slot.beds);
                return (
                <div
                  key={`${slot.date ?? selectedCalendarDate ?? 'day'}-${slot.time}-${slot.trainer ?? ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '104px minmax(0, 1fr)',
                    gap: isMobile ? 8 : 14,
                    alignItems: 'start',
                    borderRadius: isMobile ? 16 : 14,
                    border: `1px solid ${isBlocked ? '#E7D7A8' : slot.rows.length > 0 ? '#CBD5E1' : '#E5E7EB'}`,
                    background: '#fff',
                    padding: isMobile ? 12 : 14,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
                  }}
                >
                  <div
                    style={{
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #E5E7EB',
                      color: '#111827',
                      padding: isMobile ? '9px 10px' : '10px 8px',
                      textAlign: isMobile ? 'left' : 'center',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: isMobile ? 18 : 17, fontWeight: 850, fontVariantNumeric: 'tabular-nums', letterSpacing: 0 }}>
                      {slot.time}
                    </p>
                    {slot.endTime ? (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {slot.endTime}
                      </p>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gap: isMobile ? 10 : 9, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        flexDirection: isMobile ? 'column' : 'row',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#64748B', fontSize: isMobile ? 12 : 11, fontWeight: 500, lineHeight: 1.35 }}>
                          {slot.className || (isEn ? 'Class' : 'Клас')}
                        </p>
                        <p style={{ margin: '3px 0 0', color: '#111827', fontSize: isMobile ? 15 : 14, fontWeight: 500, lineHeight: 1.35 }}>
                          {slot.trainer ? <strong style={{ fontWeight: 850 }}>{slot.trainer}</strong> : null}
                          {slot.trainer ? ' · ' : ''}{slot.time}{slot.endTime ? ` - ${slot.endTime}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            borderRadius: 999,
                            background: isBlocked ? '#FEF3C7' : 'transparent',
                            border: isBlocked ? '1px solid #FDE68A' : 'none',
                            color: isBlocked ? '#92400E' : isFree ? '#047857' : '#334155',
                            padding: '5px 9px',
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isBlocked
                            ? (isEn ? 'Blocked' : 'Блокиран')
                            : slot.rows.length > 0
                              ? `${slot.beds}/${capacity} ${isEn ? 'beds' : 'легла'}`
                              : `${availableBeds}/${capacity} ${isEn ? 'free' : 'свободни'}`}
                        </span>
                        {!isBlocked && availableBeds > 0 && (selectedCalendarDate || slot.date) ? (
                          <button
                            type="button"
                            onClick={() => openAddClient(slot, slot.date ?? selectedCalendarDate)}
                            style={{
                              borderRadius: 999,
                              border: '1px solid #BBF7D0',
                              background: '#F0FDF4',
                              color: '#047857',
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 850,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isEn ? 'Add client' : 'Добави клиент'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isFree || isBlocked ? (
                      <div
                        style={{
                          borderRadius: 12,
                          padding: isBlocked ? (isMobile ? '11px 12px' : '10px 12px') : 0,
                          background: isBlocked ? '#FFFBEB' : 'transparent',
                          border: isBlocked ? '1px solid #FDE68A' : 'none',
                          color: isBlocked ? '#92400E' : '#94A3B8',
                          fontSize: isMobile ? 14 : 13,
                          fontWeight: 600,
                        }}
                      >
                        {isBlocked
                          ? (slot.blocks?.[0]?.title || (isEn ? 'Blocked time' : 'Блокиран клас'))
                          : (isEn ? 'No bookings yet' : 'Все още няма резервации')}
                      </div>
                    ) : null}

                    {slot.rows.length > 0 ? (
                      <div style={{ display: 'grid', gap: isMobile ? 10 : 8 }}>
                        {slot.rows.map((b) => (
                          <BookingCard
                            key={b.id}
                            booking={b}
                            isMobile={isMobile}
                            T={T}
                            updateBookingStatus={updateBookingStatus}
                            deleteBooking={deleteBooking}
                            locale={locale}
                          />
                        ))}
                      </div>
                    ) : null}

                    {slot.cancelledRows && slot.cancelledRows.length > 0 ? slot.cancelledRows.map((b) => (
                      <div
                        key={`cancelled-${b.id}`}
                        style={{
                          borderRadius: isMobile ? 18 : 14,
                          padding: isMobile ? '14px 16px' : '12px 14px',
                          background: '#FEF2F2',
                          border: '1px solid rgba(239,68,68,0.28)',
                          color: '#991B1B',
                          opacity: 0.86,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <p style={{ margin: 0, fontSize: isMobile ? 14 : 13, fontWeight: 800, minWidth: 0 }}>
                            {b.client_name || b.service_name || (isEn ? 'Cancelled booking' : 'Отказана резервация')}
                          </p>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#DC2626' }}>
                            {isEn ? 'Cancelled' : 'Отказана'}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#7F1D1D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.service_name}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const ok = window.confirm(
                              isEn
                                ? `Delete booking for ${b.client_name}?`
                                : `Да изтрия ли резервацията на ${b.client_name}?`,
                            );
                            if (ok) void deleteBooking(b.id);
                          }}
                          style={{
                            marginTop: 8,
                            border: '1px solid rgba(220,38,38,0.24)',
                            borderRadius: 999,
                            background: '#fff',
                            color: '#B91C1C',
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {isEn ? 'Delete' : 'Изтрий'}
                        </button>
                      </div>
                    )) : null}
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            bookingGroups.map(([groupKey, groupLabel]) => {
              const rows = panelGroupedBookings[groupKey];
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
                      deleteBooking={deleteBooking}
                      locale={locale}
                    />
                  ))}
                </div>
              );
            })
          )}
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
  onAddPackage,
  locale,
}: {
  clients: ClientSummary[];
  isMobile: boolean;
  T: ThemePalette;
  onDelete?: (key: string) => void;
  onEdit?: (key: string, data: { name: string; phone: string; email: string }) => void;
  onAddPackage?: (client: ClientSummary, totalSessions: 4 | 8) => Promise<void>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<EditDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [packageBusyKey, setPackageBusyKey] = React.useState<string | null>(null);
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
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {client.activePackage ? (
                  <span style={{ display: 'inline-flex', borderRadius: 999, background: '#ecfdf5', color: '#047857', padding: '4px 9px', fontSize: 12, fontWeight: 700 }}>
                    {isEn ? 'Package: ' : 'Пакет: '}
                    {client.activePackage.remainingSessions}/{client.activePackage.totalSessions}
                    {' · '}
                    {isEn ? 'valid until ' : 'до '}
                    {new Date(`${client.activePackage.expiresAt}T12:00:00`).toLocaleDateString(isEn ? 'en-US' : 'bg-BG')}
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', borderRadius: 999, background: '#f4f4f5', color: T.subtle, padding: '4px 9px', fontSize: 12, fontWeight: 600 }}>
                    {isEn ? 'No active package' : 'Няма активен пакет'}
                  </span>
                )}
                {onAddPackage ? ([4, 8] as const).map((count) => {
                  const busy = packageBusyKey === `${client.key}:${count}`;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setPackageBusyKey(`${client.key}:${count}`);
                        try {
                          await onAddPackage(client, count);
                        } finally {
                          setPackageBusyKey(null);
                        }
                      }}
                      style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '4px 9px', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? '…' : `+${count}`}
                    </button>
                  );
                }) : null}
              </div>
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
