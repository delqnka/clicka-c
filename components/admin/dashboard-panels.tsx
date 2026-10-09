'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import type { BookingRecord, ServiceItem, WorkingHours } from '@/lib/admin-site';
import type { BookingBlock } from '@/lib/booking-blocks';
import { getClassSlotsForDateWithOverrides, normalizeClassScheduleOverrides, normalizeTrainerName, type BookingClassSchedule, type BookingClassSlot, type ClassScheduleOverride } from '@/lib/class-schedule';
import type { StaffMember } from '@/lib/staff-members';
import { formatSalonPrice } from '@/lib/salon-currency';
import type { Locale } from '@/lib/i18n';

type BookingStatus = BookingRecord['status'];
type BookingGroupKey = 'upcoming' | 'past' | 'completed' | 'cancelled';
export type BookingListFilter = 'all' | 'upcoming' | 'history' | BookingStatus;
type AddClientSortMode = 'bg' | 'latin';

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
    clientName?: string | null;
    clientEmail?: string | null;
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
  slug: string;
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
  staffMembers: StaffMember[];
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
  updateBooking: (bookingId: string, data: AdminBookingUpdate) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  createAdminBooking: (input: AdminBookingInput) => Promise<void>;
  onBookingsChanged?: () => void | Promise<void>;
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
export type AdminBookingUpdate = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number | null;
  serviceDuration: number | null;
  bookingQuantity: number | null;
  date: string;
  time: string;
  staffMemberId: string | null;
  staffMemberName: string;
  notes: string;
  status: BookingStatus;
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

function getClassSlotsForDateEffective(
  classSchedule: BookingClassSchedule,
  date: string,
  overrides: ClassScheduleOverride[],
): BookingClassSlot[] {
  return getClassSlotsForDateWithOverrides(classSchedule, date, overrides);
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
  originalDate?: string;
  originalTime?: string;
  originalClassName?: string;
  originalTrainer?: string;
  price?: number;
  note?: string;
};

function buildDailyTimelineRows({
  date,
  bookingBlocks,
  classSchedule,
  classOverrides,
  externalEvents,
  bookings,
  slotIntervalMin,
  locale,
}: {
  date: string;
  bookingBlocks: BookingBlock[];
  classSchedule: BookingClassSchedule;
  classOverrides: ClassScheduleOverride[];
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
  const classSlots = getClassSlotsForDateEffective(classSchedule, date, classOverrides);

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

    const matchedOverride = classOverrides.find((override) => (
      override.date === date &&
      override.start === classSlot.start &&
      normalizeTrainerName(override.trainer) === normalizeTrainerName(classSlot.trainer) &&
      normalizeTrainerName(override.className ?? '') === normalizeTrainerName(classSlot.className ?? '')
    ));

    rows.push({
      date,
      time: classSlot.start,
      endTime: classSlot.end,
      className: classSlot.className,
      trainer: classSlot.trainer,
      capacity: classSlot.capacity,
      price: classSlot.price,
      note: classSlot.note,
      rows: slotBookings,
      cancelledRows,
      beds: slotBookings.reduce((sum, booking) => sum + getBookingQuantity(booking), 0),
      status: slotBookings.length > 0 ? 'booked' : blocks.length > 0 ? 'blocked' : 'free',
      blocks,
      originalDate: matchedOverride?.originalDate ?? date,
      originalTime: matchedOverride?.originalTime ?? classSlot.start,
      originalClassName: matchedOverride?.originalClassName ?? (classSlot.className ?? ''),
      originalTrainer: matchedOverride?.originalTrainer ?? classSlot.trainer,
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
  onEditBooking,
  deleteBooking,
  locale,
}: {
  booking: BookingRecord;
  isMobile: boolean;
  T: ThemePalette;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  onEditBooking: (booking: BookingRecord) => void;
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onEditBooking(booking)}
            style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '4px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
          >
            {isEn ? 'Edit' : 'Редактирай'}
          </button>
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
    </div>
  );
}

export function BookingsPanel({
  slug,
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
  staffMembers,
  workingHours,
  bookingBlocks,
  classSchedule,
  slotIntervalMin,
  selectedCalendarDate,
  setSelectedCalendarDate,
  setCalendarCursor,
  visibleBookings,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  createAdminBooking,
  onBookingsChanged,
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
  const [addClientSortMode, setAddClientSortMode] = React.useState<AddClientSortMode>('bg');
  const [addClientSearch, setAddClientSearch] = React.useState('');
  const [editBookingId, setEditBookingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<AdminBookingUpdate | null>(null);
  const [editError, setEditError] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const [classOverrides, setClassOverrides] = React.useState<ClassScheduleOverride[]>([]);
  const [classDraft, setClassDraft] = React.useState<{
    originalDate: string;
    originalTime: string;
    originalClassName: string;
    originalTrainer: string;
    originalEnd: string;
    date: string;
    start: string;
    end: string;
    duration: number;
    className: string;
    trainer: string;
    capacity: number;
    price: string;
    note: string;
    updateExistingBookings: boolean;
  } | null>(null);
  const [classEditError, setClassEditError] = React.useState('');
  const [classEditNotice, setClassEditNotice] = React.useState('');
  const [classEditSaving, setClassEditSaving] = React.useState(false);
  const staffOptions = React.useMemo(
    () => staffMembers.filter((member) => !member.isOwner),
    [staffMembers],
  );
  const CALENDAR_DAY_NAMES = isEn ? CALENDAR_DAY_NAMES_EN : CALENDAR_DAY_NAMES_BG;
  const bookingGroups =
    statusFilter === 'upcoming'
      ? upcomingBookingGroups(locale)
      : statusFilter === 'history'
        ? historyBookingGroups(locale)
        : allBookingGroups(locale);
  const today = todayKey();
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
            classOverrides,
            externalEvents: externalCalendarEvents,
            bookings,
            slotIntervalMin,
            locale,
          })
        : [],
    [selectedCalendarDate, bookingBlocks, classSchedule, classOverrides, externalCalendarEvents, bookings, slotIntervalMin, locale],
  );
  const displayedTimelineRows = selectedCalendarDate ? dailyTimelineRows : timelineRows;
  const useTimelineView = Boolean(selectedCalendarDate) && (statusFilter === 'upcoming' || statusFilter === 'pending' || statusFilter === 'all');
  const timelineEmpty = useTimelineView && displayedTimelineRows.length === 0;
  const selectedDayActiveBookings = React.useMemo(() => {
    if (!selectedCalendarDate) return panelVisibleBookings.filter(isActiveBookingForCapacity);
    const unique = new Map<string, BookingRecord>();
    for (const row of dailyTimelineRows) {
      for (const booking of row.rows) {
        if (isActiveBookingForCapacity(booking)) unique.set(booking.id, booking);
      }
    }
    return [...unique.values()];
  }, [dailyTimelineRows, panelVisibleBookings, selectedCalendarDate]);
  const selectedDayBeds = React.useMemo(
    () => selectedDayActiveBookings.reduce((sum, booking) => sum + getBookingQuantity(booking), 0),
    [selectedDayActiveBookings],
  );
  const selectedDaySlots = React.useMemo(
    () =>
      selectedCalendarDate
        ? getClassSlotsForDateEffective(classSchedule, selectedCalendarDate, classOverrides).length
        : new Set(selectedDayActiveBookings.map((booking) => String(booking.time ?? '').slice(0, 5)).filter(Boolean)).size,
    [classSchedule, classOverrides, selectedCalendarDate, selectedDayActiveBookings],
  );
  const selectedDayCapacity = selectedCalendarDate
    ? dailyTimelineRows.reduce((sum, slot) => sum + Math.max(1, Number(slot.capacity) || 1), 0)
    : selectedDaySlots * 5;
  const sortedAddClientOptions = React.useMemo(
    () => [...clients].sort((a, b) => compareClientNames(a, b, addClientSortMode)),
    [addClientSortMode, clients],
  );
  const filteredAddClientOptions = React.useMemo(() => {
    const query = addClientSearch.trim().toLocaleLowerCase();
    if (!query) return sortedAddClientOptions;
    return sortedAddClientOptions
      .filter((client) =>
        [client.name, client.phone, client.email]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(query)),
      )
      .sort((a, b) => {
        const aName = a.name.toLocaleLowerCase();
        const bName = b.name.toLocaleLowerCase();
        const aStarts = aName.startsWith(query) ? 1 : 0;
        const bStarts = bName.startsWith(query) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return compareClientNames(a, b, addClientSortMode);
      });
  }, [addClientSearch, addClientSortMode, sortedAddClientOptions]);
  const visibleAddClientSuggestions = React.useMemo(
    () => addClientSearch.trim() && !addDraft?.clientKey ? filteredAddClientOptions.slice(0, 6) : [],
    [addClientSearch, addDraft?.clientKey, filteredAddClientOptions],
  );

  React.useEffect(() => {
    const from = ymdKey(calendarMeta.year, calendarMeta.month, 1);
    const to = ymdKey(calendarMeta.year, calendarMeta.month, calendarMeta.daysInMonth);
    let cancelled = false;
    fetch(`/api/admin/class-overrides?slug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      cache: 'no-store',
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { overrides?: unknown } | null) => {
        if (cancelled) return;
        setClassOverrides(normalizeClassScheduleOverrides(data?.overrides));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [calendarMeta.daysInMonth, calendarMeta.month, calendarMeta.year, slug]);

  function openEditClass(slot: TimelineRow) {
    const start = slot.time;
    const end = slot.endTime ?? slot.time;
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    setClassEditError('');
    setClassEditNotice('');
    setClassDraft({
      originalDate: slot.originalDate ?? slot.date ?? selectedCalendarDate ?? '',
      originalTime: slot.originalTime ?? slot.time,
      originalClassName: slot.originalClassName ?? (slot.className ?? ''),
      originalTrainer: slot.originalTrainer ?? (slot.trainer ?? ''),
      originalEnd: end,
      date: slot.date ?? selectedCalendarDate ?? '',
      start,
      end,
      duration: startMin != null && endMin != null && endMin > startMin ? endMin - startMin : 50,
      className: slot.className ?? '',
      trainer: slot.trainer ?? '',
      capacity: Math.max(1, Number(slot.capacity ?? 1) || 1),
      price: slot.price == null ? '' : String(slot.price),
      note: slot.note ?? '',
      updateExistingBookings: true,
    });
  }

  async function submitClassOverride() {
    if (!classDraft) return;
    const payload = {
      originalDate: classDraft.originalDate,
      originalTime: classDraft.originalTime,
      originalClassName: classDraft.originalClassName,
      originalTrainer: classDraft.originalTrainer,
      date: classDraft.date,
      start: classDraft.start,
      end: classDraft.end,
      className: classDraft.className.trim(),
      trainer: classDraft.trainer.trim(),
      capacity: Math.max(1, Math.round(Number(classDraft.capacity) || 1)),
      price: classDraft.price.trim() ? Number(classDraft.price) : undefined,
      note: classDraft.note.trim() || undefined,
      originalEnd: classDraft.originalEnd,
      updateExistingBookings: classDraft.updateExistingBookings,
    };
    if (!payload.date || !payload.start || !payload.end || !payload.trainer) {
      setClassEditError(isEn ? 'Date, time and trainer are required.' : 'Дата, час и треньор са задължителни.');
      return;
    }
    setClassEditSaving(true);
    setClassEditError('');
    setClassEditNotice('');
    try {
      const res = await fetch(`/api/admin/class-overrides?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({})) as { override?: unknown; error?: string; updatedBookingsCount?: number; warnings?: string[] };
      if (!res.ok) throw new Error(data.error || (isEn ? 'Could not save class.' : 'Класът не беше запазен.'));
      const [override] = normalizeClassScheduleOverrides([data.override]);
      if (override) {
        setClassOverrides((prev) => [
          ...prev.filter((item) => !(
            item.originalDate === override.originalDate &&
            item.originalTime === override.originalTime &&
            item.originalClassName === override.originalClassName &&
            item.originalTrainer === override.originalTrainer
          )),
          override,
        ]);
      }
      const updatedCount = Math.max(0, Math.round(Number(data.updatedBookingsCount ?? 0) || 0));
      const warnings = Array.isArray(data.warnings)
        ? data.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      setClassEditNotice([
        classDraft.updateExistingBookings
          ? updatedCount === 1
            ? (isEn ? 'Updated 1 existing booking in this class.' : 'Обновена е 1 съществуваща резервация в този клас.')
            : (isEn ? `Updated ${updatedCount} existing bookings in this class.` : `Обновени са ${updatedCount} съществуващи резервации в този клас.`)
          : (isEn ? 'Saved class override. Existing bookings were not changed.' : 'Промяната за класа е запазена. Съществуващите резервации не са променени.'),
        ...warnings,
      ].join(' '));
      if (updatedCount > 0) await onBookingsChanged?.();
      setClassDraft(null);
    } catch (err) {
      setClassEditError(err instanceof Error ? err.message : (isEn ? 'Could not save class.' : 'Класът не беше запазен.'));
    } finally {
      setClassEditSaving(false);
    }
  }

  async function resetClassOverride() {
    if (!classDraft) return;
    setClassEditSaving(true);
    setClassEditError('');
    setClassEditNotice('');
    try {
      const params = new URLSearchParams({
        slug,
        originalDate: classDraft.originalDate,
        originalTime: classDraft.originalTime,
        originalClassName: classDraft.originalClassName,
        originalTrainer: classDraft.originalTrainer,
      });
      const res = await fetch(`/api/admin/class-overrides?${params.toString()}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error || (isEn ? 'Could not reset class.' : 'Класът не беше нулиран.'));
      setClassOverrides((prev) => prev.filter((item) => !(
        item.originalDate === classDraft.originalDate &&
        item.originalTime === classDraft.originalTime &&
        item.originalClassName === classDraft.originalClassName &&
        item.originalTrainer === classDraft.originalTrainer
      )));
      setClassEditNotice(isEn ? 'This class override was reset.' : 'Еднократната промяна за този клас е нулирана.');
      setClassDraft(null);
    } catch (err) {
      setClassEditError(err instanceof Error ? err.message : (isEn ? 'Could not reset class.' : 'Класът не беше нулиран.'));
    } finally {
      setClassEditSaving(false);
    }
  }

  function openAddClient(slot: TimelineRow, explicitDate?: string | null) {
    const draftDate = explicitDate ?? slot.date ?? selectedCalendarDate ?? '';
    if (!draftDate) {
      setAddError(isEn ? 'Choose a date first.' : 'Първо избери конкретна дата.');
      return;
    }
    setAddError('');
    setAddClientSearch('');
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

  function openEditBooking(booking: BookingRecord) {
    setEditBookingId(booking.id);
    setEditError('');
    setEditDraft({
      clientName: String(booking.client_name ?? ''),
      clientPhone: String(booking.client_phone ?? ''),
      clientEmail: String(booking.client_email ?? ''),
      serviceName: String(booking.service_name ?? ''),
      servicePrice: booking.service_price == null ? null : Number(booking.service_price),
      serviceDuration: booking.service_duration == null ? null : Number(booking.service_duration),
      bookingQuantity: booking.booking_quantity == null ? 1 : Math.max(1, Number(booking.booking_quantity) || 1),
      date: normalizeDateKey(String(booking.date ?? '')),
      time: String(booking.time ?? '').slice(0, 5),
      staffMemberId: booking.staff_member_id ?? null,
      staffMemberName: getBookingStaffName(booking),
      notes: String(booking.notes ?? ''),
      status: booking.status,
    });
  }

  async function submitEditBooking() {
    if (!editBookingId || !editDraft) return;
    if (!editDraft.clientName.trim() || !editDraft.clientPhone.trim() || !editDraft.serviceName.trim() || !editDraft.date.trim() || !editDraft.time.trim()) {
      setEditError(isEn ? 'Name, phone, service, date and time are required.' : 'Име, телефон, услуга, дата и час са задължителни.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await updateBooking(editBookingId, editDraft);
      setEditBookingId(null);
      setEditDraft(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : (isEn ? 'Could not save booking.' : 'Резервацията не беше запазена.'));
    } finally {
      setEditSaving(false);
    }
  }

  function selectAddClient(clientKey: string) {
    const client = clients.find((item) => item.key === clientKey);
    if (client) setAddClientSearch(client.name);
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

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ color: T.muted, fontSize: 12, fontWeight: 750 }}>
                  {isEn ? 'Client order' : 'Подредба на клиентите'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['bg', 'latin'] as const).map((mode) => {
                    const active = addClientSortMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAddClientSortMode(mode)}
                        style={{
                          border: `1px solid ${active ? T.accent : T.border}`,
                          background: active ? '#ECFDF5' : '#fff',
                          color: active ? T.accent : T.muted,
                          borderRadius: 999,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {mode === 'bg' ? 'А-Я' : 'A-Z'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input
                type="search"
                value={addClientSearch}
                onChange={(event) => {
                  setAddClientSearch(event.target.value);
                  setAddDraft((prev) => prev ? { ...prev, clientKey: '' } : prev);
                }}
                placeholder={isEn ? 'Search client by name, phone or email' : 'Търси клиент по име, телефон или имейл'}
                style={inp}
              />
              {visibleAddClientSuggestions.length > 0 ? (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
                  {visibleAddClientSuggestions.map((client) => (
                    <button
                      key={client.key}
                      type="button"
                      onClick={() => selectAddClient(client.key)}
                      style={{
                        display: 'block',
                        width: '100%',
                        border: 'none',
                        borderBottom: `1px solid ${T.border}`,
                        background: '#fff',
                        color: T.text,
                        padding: '9px 11px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{client.name}</span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[client.phone, client.email].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              ) : addClientSearch.trim() && !addDraft.clientKey ? (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 11px', color: T.muted, fontSize: 12, background: '#FAFAFA' }}>
                  {isEn ? 'No matching clients' : 'Няма намерени клиенти'}
                </div>
              ) : null}
              <select
                value={addDraft.clientKey}
                onChange={(event) => selectAddClient(event.target.value)}
                style={inp}
              >
                <option value="">
                  {isEn ? 'Choose existing client' : 'Избери съществуващ клиент'}
                </option>
                {filteredAddClientOptions.map((client) => (
                  <option key={client.key} value={client.key}>
                    {client.name}
                    {client.phone ? ` · ${client.phone}` : ''}
                    {client.email ? ` · ${client.email}` : ''}
                  </option>
                ))}
                {addClientSearch.trim() && filteredAddClientOptions.length === 0 ? (
                  <option value="" disabled>
                    {isEn ? 'No matching clients' : 'Няма намерени клиенти'}
                  </option>
                ) : null}
              </select>
            </div>

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

      {editDraft ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(15,23,42,0.4)', display: 'grid', placeItems: 'center', padding: 18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editSaving) {
              setEditDraft(null);
              setEditBookingId(null);
            }
          }}
        >
          <div style={{ width: 'min(720px, 100%)', maxHeight: 'calc(100dvh - 36px)', overflowY: 'auto', borderRadius: 18, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.24)', padding: isMobile ? 18 : 22, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: T.subtle, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isEn ? 'Edit booking' : 'Редактирай резервация'}
                </p>
                <h3 style={{ margin: '5px 0 0', fontSize: 20, lineHeight: 1.2, color: T.text }}>
                  {editDraft.clientName || (isEn ? 'Booking' : 'Резервация')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!editSaving) {
                    setEditDraft(null);
                    setEditBookingId(null);
                  }
                }}
                style={{ ...btn('ghost'), padding: '6px 10px' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Client name' : 'Име на клиента'}
                <input value={editDraft.clientName} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, clientName: event.target.value } : draft)} placeholder={isEn ? 'Client name' : 'Име на клиента'} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Phone' : 'Телефон'}
                <input value={editDraft.clientPhone} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, clientPhone: event.target.value } : draft)} placeholder={isEn ? 'Phone' : 'Телефон'} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Email' : 'Имейл'}
                <input value={editDraft.clientEmail} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, clientEmail: event.target.value } : draft)} placeholder={isEn ? 'Email' : 'Имейл'} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Status' : 'Статус'}
                <select value={editDraft.status} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, status: event.target.value as BookingStatus } : draft)} style={inp}>
                  <option value="pending">{statusCfg(locale).pending.label}</option>
                  <option value="confirmed">{statusCfg(locale).confirmed.label}</option>
                  <option value="completed">{statusCfg(locale).completed.label}</option>
                  <option value="cancelled">{statusCfg(locale).cancelled.label}</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Service / class' : 'Услуга / клас'}
                <input value={editDraft.serviceName} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, serviceName: event.target.value } : draft)} placeholder={isEn ? 'Service' : 'Услуга'} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Trainer / staff' : 'Треньор / служител'}
                <select
                  value={editDraft.staffMemberId ?? ''}
                  onChange={(event) => {
                    const staffMemberId = event.target.value || null;
                    const selected = staffOptions.find((member) => member.id === staffMemberId);
                    setEditDraft((draft) => draft ? {
                      ...draft,
                      staffMemberId,
                      staffMemberName: selected?.name ?? '',
                    } : draft);
                  }}
                  style={inp}
                >
                  <option value="">{isEn ? 'No trainer/staff' : 'Без треньор/служител'}</option>
                  {staffOptions.length === 0 ? (
                    <option value="" disabled>{isEn ? 'No trainers added yet' : 'Няма добавени треньори'}</option>
                  ) : null}
                  {staffOptions.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Date' : 'Дата'}
                <input type="date" value={editDraft.date} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, date: event.target.value } : draft)} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Time' : 'Час'}
                <input type="time" value={editDraft.time} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, time: event.target.value } : draft)} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Price' : 'Цена'}
                <input value={editDraft.servicePrice ?? ''} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, servicePrice: event.target.value.trim() ? Number(event.target.value) : null } : draft)} placeholder={isEn ? 'Price' : 'Цена'} inputMode="decimal" style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Duration in minutes' : 'Продължителност в минути'}
                <input value={editDraft.serviceDuration ?? ''} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, serviceDuration: event.target.value.trim() ? Number(event.target.value) : null } : draft)} placeholder={isEn ? 'Duration min' : 'Продължителност мин'} inputMode="numeric" style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'People / beds' : 'Хора / легла'}
                <input value={editDraft.bookingQuantity ?? ''} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, bookingQuantity: event.target.value.trim() ? Number(event.target.value) : null } : draft)} placeholder={isEn ? 'Spots/beds' : 'Места/легла'} inputMode="numeric" style={inp} />
              </label>
            </div>

            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Notes' : 'Бележки'}
              <textarea value={editDraft.notes} onChange={(event) => setEditDraft((draft) => draft ? { ...draft, notes: event.target.value } : draft)} placeholder={isEn ? 'Notes' : 'Бележки'} style={{ ...inp, minHeight: 92, resize: 'vertical' }} />
            </label>
            {editError ? <p style={{ margin: 0, color: '#B91C1C', fontSize: 13, fontWeight: 700 }}>{editError}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { if (!editSaving) { setEditDraft(null); setEditBookingId(null); } }} style={btn('ghost')} disabled={editSaving}>
                {isEn ? 'Cancel' : 'Отказ'}
              </button>
              <button type="button" onClick={() => void submitEditBooking()} style={btn('primary')} disabled={editSaving}>
                {editSaving ? (isEn ? 'Saving...' : 'Запис...') : (isEn ? 'Save booking' : 'Запази резервацията')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {classDraft ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(15,23,42,0.42)', display: 'grid', placeItems: 'center', padding: 18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !classEditSaving) setClassDraft(null);
          }}
        >
          <div style={{ width: 'min(720px, 100%)', maxHeight: 'calc(100dvh - 36px)', overflowY: 'auto', borderRadius: 18, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.24)', padding: isMobile ? 18 : 22, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: T.subtle, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isEn ? 'Specific class only' : 'Само конкретният клас'}
                </p>
                <h3 style={{ margin: '5px 0 0', fontSize: 20, lineHeight: 1.2, color: T.text }}>
                  {isEn ? 'Edit class occurrence' : 'Редактирай клас'}
                </h3>
              </div>
              <button type="button" onClick={() => !classEditSaving && setClassDraft(null)} style={{ ...btn('ghost'), padding: '6px 10px' }}>
                ×
              </button>
            </div>

            <div style={{ borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', color: '#475569', fontSize: 13, fontWeight: 650 }}>
              {isEn
                ? 'This changes only this date and time. The weekly class schedule stays unchanged.'
                : 'Промяната важи само за тази дата и час. Седмичният график не се променя.'}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderRadius: 12,
                background: '#ECFDF5',
                border: '1px solid #BBF7D0',
                padding: '10px 12px',
                color: '#064E3B',
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={classDraft.updateExistingBookings}
                onChange={(event) => setClassDraft((draft) => draft ? { ...draft, updateExistingBookings: event.target.checked } : draft)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
              />
              <span>
                {isEn ? 'Update existing bookings in this class' : 'Обнови и записаните клиенти в този клас'}
                <span style={{ display: 'block', marginTop: 3, color: '#047857', fontSize: 12, fontWeight: 600 }}>
                  {isEn
                    ? 'When enabled, client booking rows move to the new date/time/trainer so reports stay correct.'
                    : 'Когато е включено, резервациите се местят към новата дата, час и треньор, за да са точни справките.'}
                </span>
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Class name' : 'Име на клас'}
                <input value={classDraft.className} onChange={(event) => setClassDraft((draft) => draft ? { ...draft, className: event.target.value } : draft)} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Trainer' : 'Треньор'}
                <select
                  value={classDraft.trainer}
                  onChange={(event) => setClassDraft((draft) => draft ? { ...draft, trainer: event.target.value } : draft)}
                  style={inp}
                >
                  <option value="">{isEn ? 'Choose trainer' : 'Избери треньор'}</option>
                  {classDraft.trainer && !staffOptions.some((member) => member.name === classDraft.trainer) ? (
                    <option value={classDraft.trainer}>{classDraft.trainer}</option>
                  ) : null}
                  {staffOptions.map((member) => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Date' : 'Дата'}
                <input type="date" value={classDraft.date} onChange={(event) => setClassDraft((draft) => draft ? { ...draft, date: event.target.value } : draft)} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Start time' : 'Начален час'}
                <input type="time" value={classDraft.start} onChange={(event) => {
                  const start = event.target.value;
                  const startMin = timeToMinutes(start);
                  setClassDraft((draft) => draft ? {
                    ...draft,
                    start,
                    end: startMin == null ? draft.end : minutesToTime(startMin + Math.max(5, Number(draft.duration) || 50)),
                  } : draft);
                }} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'End time' : 'Краен час'}
                <input type="time" value={classDraft.end} onChange={(event) => {
                  const end = event.target.value;
                  const startMin = timeToMinutes(classDraft.start);
                  const endMin = timeToMinutes(end);
                  setClassDraft((draft) => draft ? {
                    ...draft,
                    end,
                    duration: startMin != null && endMin != null && endMin > startMin ? endMin - startMin : draft.duration,
                  } : draft);
                }} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Duration in minutes' : 'Продължителност в минути'}
                <input value={classDraft.duration} onChange={(event) => {
                  const duration = Math.max(5, Math.round(Number(event.target.value) || 50));
                  const startMin = timeToMinutes(classDraft.start);
                  setClassDraft((draft) => draft ? {
                    ...draft,
                    duration,
                    end: startMin == null ? draft.end : minutesToTime(startMin + duration),
                  } : draft);
                }} inputMode="numeric" style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Capacity / beds' : 'Капацитет / легла'}
                <input value={classDraft.capacity} onChange={(event) => setClassDraft((draft) => draft ? { ...draft, capacity: Math.max(1, Math.round(Number(event.target.value) || 1)) } : draft)} inputMode="numeric" style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Price optional' : 'Цена по желание'}
                <input value={classDraft.price} onChange={(event) => setClassDraft((draft) => draft ? { ...draft, price: event.target.value } : draft)} inputMode="decimal" style={inp} />
              </label>
            </div>

            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Note optional' : 'Бележка по желание'}
              <textarea value={classDraft.note} onChange={(event) => setClassDraft((draft) => draft ? { ...draft, note: event.target.value } : draft)} style={{ ...inp, minHeight: 88, resize: 'vertical' }} />
            </label>
            {classEditError ? <p style={{ margin: 0, color: '#B91C1C', fontSize: 13, fontWeight: 700 }}>{classEditError}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void resetClassOverride()} style={{ ...btn('ghost'), color: '#B91C1C' }} disabled={classEditSaving}>
                {isEn ? 'Reset this occurrence' : 'Нулирай този клас'}
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => !classEditSaving && setClassDraft(null)} style={btn('ghost')} disabled={classEditSaving}>
                  {isEn ? 'Cancel' : 'Отказ'}
                </button>
                <button type="button" onClick={() => void submitClassOverride()} style={btn('primary')} disabled={classEditSaving}>
                  {classEditSaving ? (isEn ? 'Saving...' : 'Запис...') : (isEn ? 'Save one-off change' : 'Запази еднократна промяна')}
                </button>
              </div>
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
            const classCount = getClassSlotsForDateEffective(classSchedule, key, classOverrides).length;
            const active = selectedCalendarDate === key;
            const hasClicka = count > 0;
            const hasExternal = externalCount > 0;
            const hasClasses = classCount > 0;
            const isToday = key === today;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCalendarDate(active ? null : key)}
                style={{
                  border: isToday ? '2px solid #111827' : hasExternal && !hasClicka ? '2px solid #FB923C' : 'none',
                  borderRadius: isMobile ? 10 : 12,
                  minHeight: isMobile ? 0 : 42,
                  aspectRatio: isMobile ? '1 / 1' : undefined,
                  background: active && isToday ? '#111827' : active && hasClicka ? '#047857' : active ? T.accent : isToday ? '#FEF3C7' : hasClicka ? '#16A34A' : hasClasses ? '#E2E8F0' : hasExternal ? '#FFF7ED' : '#F4F4F5',
                  color: active || hasClicka ? '#fff' : isToday ? '#111827' : hasClasses ? '#334155' : hasExternal ? '#9A3412' : T.text,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: isToday ? 900 : 600,
                  cursor: 'pointer',
                  padding: isMobile ? 2 : '6px 4px',
                  minWidth: 0,
                  maxWidth: '100%',
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  boxShadow: isToday ? '0 0 0 3px rgba(17,24,39,0.14)' : 'none',
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

      {classEditNotice ? (
        <div
          style={{
            marginBottom: 14,
            borderRadius: 14,
            background: '#ECFDF5',
            border: '1px solid #BBF7D0',
            color: '#065F46',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 750,
            lineHeight: 1.45,
          }}
        >
          {classEditNotice}
        </div>
      ) : null}

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
                        {slot.originalDate && slot.originalTime ? (
                          <button
                            type="button"
                            onClick={() => openEditClass(slot)}
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${T.border}`,
                              background: '#fff',
                              color: '#111827',
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 850,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isEn ? 'Edit class' : 'Редактирай клас'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {slot.note || slot.price != null ? (
                      <p style={{ margin: 0, color: '#64748B', fontSize: 12, fontWeight: 650, lineHeight: 1.45 }}>
                        {slot.price != null ? `${isEn ? 'Price' : 'Цена'}: ${formatSalonPrice(slot.price)}` : ''}
                        {slot.price != null && slot.note ? ' · ' : ''}
                        {slot.note ?? ''}
                      </p>
                    ) : null}

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
                            onEditBooking={openEditBooking}
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
                      onEditBooking={openEditBooking}
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
type ClientSort = 'newest' | 'visits' | 'alpha' | 'packages';
type PackageActivationDraft = {
  clientKey: string;
  packageId?: string;
  mode: 'create' | 'edit';
  packageDefinitionId: string;
  packageName: string;
  totalSessions: string;
  usedSessions: string;
  price: string;
  validFrom: string;
  validTo: string;
  validityDays: string;
};

const CLIENT_NAME_COLLATOR = new Intl.Collator(['bg', 'en'], {
  sensitivity: 'base',
  numeric: true,
  ignorePunctuation: true,
});

const CLIENT_NAME_COLLATORS: Record<AddClientSortMode, Intl.Collator> = {
  bg: CLIENT_NAME_COLLATOR,
  latin: new Intl.Collator(['en', 'bg'], {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  }),
};

function compareClientNames(a: ClientSummary, b: ClientSummary, mode: AddClientSortMode = 'bg') {
  const aName = a.name.trim();
  const bName = b.name.trim();
  if (!aName && !bName) return a.key.localeCompare(b.key);
  if (!aName) return 1;
  if (!bName) return -1;
  return CLIENT_NAME_COLLATORS[mode].compare(aName, bName) || a.key.localeCompare(b.key);
}
type MembershipImportMode = 'preview' | 'import';
type MembershipImportField =
  | 'name'
  | 'phone'
  | 'email'
  | 'packageName'
  | 'totalSessions'
  | 'usedSessions'
  | 'remainingSessions'
  | 'price'
  | 'validFrom'
  | 'validTo';
type MembershipImportColumnMap = Partial<Record<MembershipImportField, number>>;
type MembershipImportRow = {
  rowNumber: number;
  name: string;
  phone: string | null;
  email: string | null;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  price: number | null;
  validFrom: string | null;
  validTo: string;
  errors: string[];
  warnings: string[];
  action?: 'created' | 'updated' | 'skipped';
};
type MembershipImportResult = {
  ok: boolean;
  headers: string[];
  detectedColumnMap: MembershipImportColumnMap;
  columnMap: MembershipImportColumnMap;
  rows: MembershipImportRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    createdPackages: number;
    updatedPackages: number;
    skippedPackages: number;
  };
};
type PackageDefinition = {
  id: string;
  name: string;
  description: string | null;
  totalSessions: number;
  price: number | null;
  validityDays: number;
  serviceIds: string[];
  isActive: boolean;
};
type PackageDraft = {
  id?: string;
  name: string;
  description: string;
  totalSessions: string;
  price: string;
  validityDays: string;
  serviceIds: string[];
  isActive: boolean;
};

function packageToDraft(pkg?: PackageDefinition): PackageDraft {
  return {
    id: pkg?.id,
    name: pkg?.name ?? '',
    description: pkg?.description ?? '',
    totalSessions: String(pkg?.totalSessions ?? 8),
    price: pkg?.price == null ? '' : String(pkg.price),
    validityDays: String(pkg?.validityDays ?? 30),
    serviceIds: pkg?.serviceIds ?? [],
    isActive: pkg?.isActive !== false,
  };
}


export function PackagesPanel({
  slug,
  services,
  isMobile,
  T,
  onImportMemberships,
  locale,
}: {
  slug: string;
  services: ServiceItem[];
  isMobile: boolean;
  T: ThemePalette;
  onImportMemberships: (csvText: string, mode: MembershipImportMode, columnMap?: MembershipImportColumnMap) => Promise<MembershipImportResult>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [packages, setPackages] = React.useState<PackageDefinition[]>([]);
  const [packagesLoaded, setPackagesLoaded] = React.useState(false);
  const [packageDraft, setPackageDraft] = React.useState<PackageDraft>(() => packageToDraft());
  const [packageBusy, setPackageBusy] = React.useState(false);
  const [packageError, setPackageError] = React.useState('');
  const [importText, setImportText] = React.useState('');
  const [importBusy, setImportBusy] = React.useState<MembershipImportMode | null>(null);
  const [importResult, setImportResult] = React.useState<MembershipImportResult | null>(null);
  const [importColumnMap, setImportColumnMap] = React.useState<MembershipImportColumnMap>({});
  const [importError, setImportError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/package-definitions?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { packages?: PackageDefinition[] } | null) => {
        if (cancelled) return;
        setPackages(Array.isArray(data?.packages) ? data.packages : []);
        setPackagesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setPackagesLoaded(true);
      });
    return () => { cancelled = true; };
  }, [slug]);

  function toggleDraftService(serviceId: string) {
    setPackageDraft((draft) => ({
      ...draft,
      serviceIds: draft.serviceIds.includes(serviceId)
        ? draft.serviceIds.filter((id) => id !== serviceId)
        : [...draft.serviceIds, serviceId],
    }));
  }

  async function savePackageDefinition() {
    setPackageBusy(true);
    setPackageError('');
    try {
      const body = {
        id: packageDraft.id,
        name: packageDraft.name.trim(),
        description: packageDraft.description.trim() || null,
        totalSessions: Math.max(1, Math.round(Number(packageDraft.totalSessions) || 1)),
        price: packageDraft.price.trim() ? Math.max(0, Number(packageDraft.price) || 0) : null,
        validityDays: Math.max(1, Math.round(Number(packageDraft.validityDays) || 30)),
        serviceIds: packageDraft.serviceIds,
        isActive: packageDraft.isActive,
      };
      const res = await fetch(`/api/admin/package-definitions?slug=${encodeURIComponent(slug)}`, {
        method: body.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({})) as { package?: PackageDefinition; error?: string };
      if (!res.ok || !data.package) throw new Error(data.error ?? (isEn ? 'Could not save package.' : 'Пакетът не беше запазен.'));
      setPackages((prev) => {
        const exists = prev.some((pkg) => pkg.id === data.package!.id);
        return exists
          ? prev.map((pkg) => pkg.id === data.package!.id ? data.package! : pkg)
          : [...prev, data.package!];
      });
      setPackageDraft(packageToDraft());
    } catch (err) {
      setPackageError(err instanceof Error ? err.message : (isEn ? 'Could not save package.' : 'Пакетът не беше запазен.'));
    } finally {
      setPackageBusy(false);
    }
  }

  async function deletePackageDefinition(id: string) {
    const ok = window.confirm(isEn ? 'Delete this package definition?' : 'Да изтрия ли този пакет?');
    if (!ok) return;
    setPackageError('');
    const previous = packages;
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    try {
      const res = await fetch(`/api/admin/package-definitions?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(isEn ? 'Could not delete package.' : 'Пакетът не беше изтрит.');
      if (packageDraft.id === id) setPackageDraft(packageToDraft());
    } catch (err) {
      setPackages(previous);
      setPackageError(err instanceof Error ? err.message : (isEn ? 'Could not delete package.' : 'Пакетът не беше изтрит.'));
    }
  }

  const importFields: { id: MembershipImportField; label: string; required?: boolean }[] = React.useMemo(() => [
    { id: 'name', label: isEn ? 'Client name' : 'Име на клиент', required: true },
    { id: 'phone', label: isEn ? 'Phone' : 'Телефон' },
    { id: 'email', label: isEn ? 'Email' : 'Имейл' },
    { id: 'packageName', label: isEn ? 'Package' : 'Пакет' },
    { id: 'totalSessions', label: isEn ? 'Total credits' : 'Общо кредити', required: true },
    { id: 'usedSessions', label: isEn ? 'Used' : 'Използвани' },
    { id: 'remainingSessions', label: isEn ? 'Remaining' : 'Оставащи' },
    { id: 'price', label: isEn ? 'Price' : 'Цена' },
    { id: 'validFrom', label: isEn ? 'Valid from' : 'Валиден от' },
    { id: 'validTo', label: isEn ? 'Valid to' : 'Валиден до' },
  ], [isEn]);

  const effectiveImportColumnMap = React.useMemo<MembershipImportColumnMap>(
    () => ({ ...(importResult?.columnMap ?? {}), ...importColumnMap }),
    [importResult, importColumnMap],
  );

  async function runMembershipImport(mode: MembershipImportMode, columnMap: MembershipImportColumnMap = effectiveImportColumnMap) {
    setImportBusy(mode);
    setImportError('');
    try {
      const result = await onImportMemberships(importText, mode, columnMap);
      setImportResult(result);
      setImportColumnMap(result.columnMap ?? {});
      if (mode === 'import' && result.ok) setImportText('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : (isEn ? 'Import failed.' : 'Import неуспешен.'));
    } finally {
      setImportBusy(null);
    }
  }

  async function readCsvFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportResult(null);
    setImportColumnMap({});
    setImportError('');
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: '#fff', padding: isMobile ? 12 : 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#111' }}>
            {isEn ? 'Package builder' : 'Създаване на пакети'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>
            {isEn
              ? 'Build packages from services. Combo packages can include multiple different services.'
              : 'Създай пакет от услуги. Комбо пакетите могат да включват няколко различни услуги.'}
          </p>
        </div>

        {packageError ? (
          <div style={{ marginTop: 12, border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '9px 10px', color: '#b91c1c', fontSize: 12 }}>
            {packageError}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.55fr 0.55fr 0.55fr', gap: 8 }}>
            {[
              { key: 'name', label: isEn ? 'Package name' : 'Име на пакет', value: packageDraft.name, placeholder: isEn ? 'Example: 8 Pilates classes' : 'Напр. 8 тренировки пилатес', inputMode: undefined },
              { key: 'totalSessions', label: isEn ? 'Credits / sessions' : 'Кредити / посещения', value: packageDraft.totalSessions, placeholder: '8', inputMode: 'numeric' },
              { key: 'price', label: isEn ? 'Package price' : 'Цена на пакета', value: packageDraft.price, placeholder: '160', inputMode: 'decimal' },
              { key: 'validityDays', label: isEn ? 'Validity in days' : 'Валидност в дни', value: packageDraft.validityDays, placeholder: '30', inputMode: 'numeric' },
            ].map((field) => (
              <label key={field.key} style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {field.label}
                <input
                  value={field.value}
                  onChange={(event) => setPackageDraft((draft) => ({ ...draft, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
                  style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111', background: '#fff' }}
                />
              </label>
            ))}
          </div>

          <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
            {isEn ? 'Internal description' : 'Вътрешно описание'}
            <textarea
              value={packageDraft.description}
              onChange={(event) => setPackageDraft((draft) => ({ ...draft, description: event.target.value }))}
              placeholder={isEn ? 'Optional note for the admin panel' : 'Бележка по желание за админа'}
              style={{ minHeight: 72, resize: 'vertical', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, lineHeight: 1.45, color: '#111', background: '#fff' }}
            />
          </label>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 850, color: '#111' }}>
              {isEn ? 'Included services' : 'Включени услуги'}
            </div>
            {services.length === 0 ? (
              <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: 14, color: T.muted, fontSize: 13 }}>
                {isEn ? 'Add services first, then build packages from them.' : 'Първо добави услуги, после създай пакети от тях.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                {services.map((service) => {
                  const serviceId = String(service.id ?? service.name);
                  const checked = packageDraft.serviceIds.includes(serviceId);
                  return (
                    <label key={serviceId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', border: `1px solid ${checked ? '#111' : T.border}`, borderRadius: 12, padding: 10, background: checked ? '#f4f4f5' : '#fff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDraftService(serviceId)}
                        style={{ marginTop: 2 }}
                      />
                      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#111', overflowWrap: 'anywhere' }}>{service.name}</span>
                        <span style={{ fontSize: 12, color: T.muted }}>
                          {formatSalonPrice(service.price)} · {service.duration_min} {isEn ? 'min' : 'мин'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.muted, fontSize: 12, fontWeight: 800 }}>
              <input
                type="checkbox"
                checked={packageDraft.isActive}
                onChange={(event) => setPackageDraft((draft) => ({ ...draft, isActive: event.target.checked }))}
              />
              {isEn ? 'Active' : 'Активен'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
              {packageDraft.id ? (
                <button
                  type="button"
                  onClick={() => setPackageDraft(packageToDraft())}
                  style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '9px 13px', fontSize: 12, fontWeight: 750, cursor: 'pointer' }}
                >
                  {isEn ? 'New package' : 'Нов пакет'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={packageBusy || !packageDraft.name.trim() || packageDraft.serviceIds.length === 0}
                onClick={() => void savePackageDefinition()}
                style={{ border: 'none', borderRadius: 999, background: '#047857', color: '#fff', padding: '9px 14px', fontSize: 12, fontWeight: 800, cursor: packageBusy ? 'wait' : 'pointer', opacity: packageBusy || !packageDraft.name.trim() || packageDraft.serviceIds.length === 0 ? 0.45 : 1 }}
              >
                {packageBusy ? (isEn ? 'Saving…' : 'Запис…') : packageDraft.id ? (isEn ? 'Save changes' : 'Запази промените') : (isEn ? 'Create package' : 'Създай пакет')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: '#fff', padding: isMobile ? 12 : 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'grid', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 760, color: '#111' }}>
            {isEn ? 'Created packages' : 'Създадени пакети'}
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>
            {isEn ? 'Edit or remove packages that can be activated for clients.' : 'Редактирай или премахвай пакети, които могат да се активират за клиенти.'}
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {!packagesLoaded ? (
            <div style={{ color: T.muted, fontSize: 13 }}>{isEn ? 'Loading packages…' : 'Зареждане на пакети…'}</div>
          ) : packages.length === 0 ? (
            <div style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: 18, color: T.muted, textAlign: 'center', fontSize: 13 }}>
              {isEn ? 'No package definitions yet.' : 'Все още няма създадени пакети.'}
            </div>
          ) : packages.map((pkg) => {
            const included = services.filter((service) => pkg.serviceIds.includes(String(service.id ?? service.name)));
            return (
              <div key={pkg.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: isMobile ? 12 : 14, background: '#fff', display: 'grid', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gap: 5, minWidth: 0, flex: '1 1 220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 760, color: '#111', overflowWrap: 'anywhere' }}>{pkg.name}</div>
                      <span style={{ borderRadius: 999, background: pkg.isActive ? '#ECFDF5' : '#F4F4F5', color: pkg.isActive ? '#047857' : T.muted, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                        {pkg.isActive ? (isEn ? 'Active' : 'Активен') : (isEn ? 'Inactive' : 'Неактивен')}
                      </span>
                    </div>
                    {pkg.description ? <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.45 }}>{pkg.description}</div> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setPackageDraft(packageToDraft(pkg))}
                      style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: '#fff', color: '#111', padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isEn ? 'Edit' : 'Редактирай'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePackageDefinition(pkg.id)}
                      style={{ border: '1px solid rgba(220,38,38,0.22)', borderRadius: 8, background: '#fff', color: '#B91C1C', padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isEn ? 'Delete' : 'Изтрий'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {[
                    { label: isEn ? 'Credits' : 'Кредити', value: String(pkg.totalSessions) },
                    { label: isEn ? 'Valid' : 'Валидност', value: `${pkg.validityDays} ${isEn ? 'days' : 'дни'}` },
                    { label: isEn ? 'Price' : 'Цена', value: pkg.price != null ? formatSalonPrice(pkg.price) : (isEn ? 'Not set' : 'Не е зададена') },
                  ].map((item) => (
                    <div key={item.label} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 10px', background: '#fff' }}>
                      <div style={{ fontSize: 11, color: T.subtle, fontWeight: 650 }}>{item.label}</div>
                      <div style={{ marginTop: 3, fontSize: 13, color: '#111', fontWeight: 720 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {included.length > 0 ? (
                    <span style={{ fontSize: 12, color: T.muted, marginRight: 2 }}>
                      {isEn ? 'Includes:' : 'Включва:'}
                    </span>
                  ) : null}
                  {included.length > 0 ? included.map((service) => (
                    <span key={String(service.id ?? service.name)} style={{ borderRadius: 999, background: '#F9FAFB', border: `1px solid ${T.border}`, padding: '4px 8px', fontSize: 12, fontWeight: 650, color: '#111' }}>
                      {service.name}
                    </span>
                  )) : (
                    <span style={{ fontSize: 12, color: '#b91c1c' }}>{isEn ? 'No matching services selected' : 'Няма избрани услуги'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <details style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: '#fff', padding: isMobile ? 10 : 12, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 850, color: '#111' }}>
              {isEn ? 'CSV import for client packages' : 'CSV import на клиентски пакети'}
            </span>
            <span style={{ fontSize: 12, color: T.muted }}>
              {isEn ? 'Upload or paste, check columns, then import.' : 'Качи или постави данни, провери колоните и импортирай.'}
            </span>
          </span>
          <span style={{ borderRadius: 999, border: `1px solid ${T.border}`, padding: '6px 10px', fontSize: 12, fontWeight: 800, color: '#111', background: '#fff', whiteSpace: 'nowrap' }}>
            {isEn ? 'Open' : 'Отвори'}
          </span>
        </summary>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#111' }}>
            {isEn ? 'CSV file' : 'CSV файл'}
            <input
              type="file"
              accept=".csv,text/csv,.txt"
              onChange={(event) => void readCsvFile(event.target.files?.[0] ?? null)}
              style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, fontSize: 13, color: '#111', background: '#fff' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#111' }}>
            {isEn ? 'Or paste rows' : 'Или постави редове'}
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportResult(null); setImportColumnMap({}); setImportError(''); }}
              placeholder={isEn ? 'name, phone, email, package, total credits, used, valid to\nMaria, 0888123456, maria@example.com, 8 trainings, 8, 2, 31.12.2026' : 'име, телефон, имейл, пакет, общо, използвани, валиден до\nМария, 0888123456, maria@example.com, 8 тренировки, 8, 2, 31.12.2026'}
              style={{ minHeight: 86, resize: 'vertical', border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.45, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#111', outline: 'none' }}
            />
          </label>

          {importResult?.headers?.length ? (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10, background: '#fafafa' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 850, color: '#111' }}>
                  {isEn ? 'Check matched columns before import' : 'Провери разпознатите колони преди import'}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: T.muted }}>
                  {isEn ? 'Change any column if the automatic match is wrong, then preview again.' : 'Смени колона, ако автоматичното разпознаване е грешно, после пусни преглед отново.'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {importFields.map((field) => (
                  <label key={field.id} style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#111' }}>
                    {field.label}{field.required ? ' *' : ''}
                    <select
                      value={effectiveImportColumnMap[field.id] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setImportColumnMap((current) => {
                          const next = { ...current };
                          if (value === '') delete next[field.id];
                          else next[field.id] = Number(value);
                          return next;
                        });
                        setImportResult((current) => current ? { ...current, ok: false } : current);
                      }}
                      style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, color: '#111', background: '#fff' }}
                    >
                      <option value="">{isEn ? 'Not used' : 'Не се използва'}</option>
                      {importResult.headers.map((header, index) => (
                        <option key={`${index}-${header}`} value={index}>
                          {index + 1}. {header || (isEn ? 'Empty header' : 'Празна колона')}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={!importText.trim() || importBusy != null}
              onClick={() => void runMembershipImport('preview')}
              style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '9px 13px', fontSize: 12, fontWeight: 850, cursor: importBusy ? 'wait' : 'pointer', opacity: !importText.trim() || importBusy ? 0.55 : 1 }}
            >
              {importBusy === 'preview' ? (isEn ? 'Previewing…' : 'Преглед…') : (isEn ? 'Preview / rematch columns' : 'Преглед / разпознай колоните')}
            </button>
            <button
              type="button"
              disabled={!importText.trim() || importBusy != null || !importResult?.ok}
              onClick={() => void runMembershipImport('import')}
              style={{ border: 'none', borderRadius: 999, background: '#111', color: '#fff', padding: '9px 14px', fontSize: 12, fontWeight: 850, cursor: importBusy ? 'wait' : 'pointer', opacity: !importText.trim() || importBusy || !importResult?.ok ? 0.45 : 1 }}
            >
              {importBusy === 'import' ? (isEn ? 'Importing…' : 'Импортира…') : (isEn ? 'Import valid rows' : 'Импортирай валидните')}
            </button>
          </div>

          {importError ? (
            <div style={{ border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '9px 10px', color: '#b91c1c', fontSize: 12 }}>
              {importError}
            </div>
          ) : null}

          {importResult ? (
            <div style={{ border: `1px solid ${importResult.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '9px 10px', background: importResult.ok ? '#ecfdf5' : '#fef2f2', color: importResult.ok ? '#047857' : '#b91c1c', fontSize: 12, fontWeight: 850 }}>
                {isEn
                  ? `${importResult.summary.validRows}/${importResult.summary.totalRows} valid rows`
                  : `${importResult.summary.validRows}/${importResult.summary.totalRows} валидни реда`}
                {importResult.summary.createdPackages || importResult.summary.updatedPackages
                  ? ` · ${isEn ? 'created' : 'създадени'} ${importResult.summary.createdPackages}, ${isEn ? 'updated' : 'обновени'} ${importResult.summary.updatedPackages}`
                  : ''}
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fafafa', color: T.subtle, textAlign: 'left' }}>
                      {['#', isEn ? 'Client' : 'Клиент', isEn ? 'Contact' : 'Контакт', isEn ? 'Package' : 'Пакет', isEn ? 'Used' : 'Ползвани', isEn ? 'Valid to' : 'Валиден до', isEn ? 'Status' : 'Статус'].map((header) => (
                        <th key={header} style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}`, fontWeight: 850 }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rows.slice(0, 80).map((row) => {
                      const hasErrors = row.errors.length > 0;
                      return (
                        <tr key={row.rowNumber} style={{ color: hasErrors ? '#b91c1c' : '#111' }}>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.rowNumber}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.name || '—'}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.phone || row.email || '—'}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.packageName}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.usedSessions}/{row.totalSessions}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.validTo}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
                            {hasErrors ? row.errors.join(', ') : row.action ?? (row.warnings[0] ?? (isEn ? 'Ready' : 'Готов'))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}


export function ClientsPanel({
  slug,
  clients,
  isMobile,
  T,
  onDelete,
  onEdit,
  onAddPackage,
  onUpdatePackage,
  onDeactivatePackage,
  onImportMemberships,
  locale,
}: {
  slug: string;
  clients: ClientSummary[];
  isMobile: boolean;
  T: ThemePalette;
  onDelete?: (key: string) => void;
  onEdit?: (key: string, data: { name: string; phone: string; email: string }) => void;
  onAddPackage?: (client: ClientSummary, data: {
    packageName: string;
    totalSessions: number;
    usedSessions: number;
    price: number | null;
    validFrom: string | null;
    validTo: string | null;
    validityDays: number | null;
  }) => Promise<void>;
  onUpdatePackage?: (client: ClientSummary, data: {
    packageId: string;
    packageName: string;
    totalSessions: number;
    usedSessions: number;
    price: number | null;
    validTo: string | null;
  }) => Promise<void>;
  onDeactivatePackage?: (client: ClientSummary, packageId: string) => Promise<void>;
  onImportMemberships?: (csvText: string, mode: MembershipImportMode) => Promise<MembershipImportResult>;
  locale: Locale;
}) {
  const isEn = locale === 'en';
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<EditDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [packageBusyKey, setPackageBusyKey] = React.useState<string | null>(null);
  const [packageDefinitions, setPackageDefinitions] = React.useState<PackageDefinition[]>([]);
  const [activationDraft, setActivationDraft] = React.useState<PackageActivationDraft | null>(null);
  const [activationError, setActivationError] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ClientSort>('newest');
  const frozenOrderRef = React.useRef<string[] | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importBusy, setImportBusy] = React.useState<MembershipImportMode | null>(null);
  const [importResult, setImportResult] = React.useState<MembershipImportResult | null>(null);
  const [importError, setImportError] = React.useState('');

  const sortedClients = React.useMemo(() => {
    const arr = [...clients];
    if (sortBy === 'alpha') return arr.sort(compareClientNames);
    if (sortBy === 'packages') {
      return arr.filter((client) => client.activePackage).sort((a, b) => {
        if (a.activePackage && b.activePackage) {
          const packageNameCompare = CLIENT_NAME_COLLATOR.compare(a.activePackage.packageName, b.activePackage.packageName);
          if (packageNameCompare !== 0) return packageNameCompare;
          const remainingCompare = b.activePackage.remainingSessions - a.activePackage.remainingSessions;
          if (remainingCompare !== 0) return remainingCompare;
        }
        return compareClientNames(a, b);
      });
    }
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

  const SORT_OPTIONS: { id: ClientSort; label: string }[] = [
    { id: 'newest', label: isEn ? 'Newest' : 'Най-нови' },
    { id: 'visits', label: isEn ? 'Bookings' : 'Резервации' },
    { id: 'alpha', label: isEn ? 'A-Z / А-Я' : 'А-Я / A-Z' },
    { id: 'packages', label: isEn ? 'With packages' : 'С пакети' },
  ];

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/package-definitions?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { packages?: PackageDefinition[] } | null) => {
        if (!cancelled) setPackageDefinitions(Array.isArray(data?.packages) ? data.packages.filter((pkg) => pkg.isActive !== false) : []);
      })
      .catch(() => {
        if (!cancelled) setPackageDefinitions([]);
      });
    return () => { cancelled = true; };
  }, [slug]);

  function defaultValidTo(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() + Math.max(1, days));
    return date.toISOString().slice(0, 10);
  }

  function openPackageActivation(client: ClientSummary) {
    const firstPackage = packageDefinitions[0];
    const validityDays = firstPackage?.validityDays ?? 30;
    setActivationError('');
    setActivationDraft({
      clientKey: client.key,
      mode: 'create',
      packageDefinitionId: firstPackage?.id ?? '',
      packageName: firstPackage?.name ?? '',
      totalSessions: String(firstPackage?.totalSessions ?? 8),
      usedSessions: '0',
      price: firstPackage?.price == null ? '' : String(firstPackage.price),
      validFrom: todayKey(),
      validTo: defaultValidTo(validityDays),
      validityDays: String(validityDays),
    });
  }

  function openPackageEdit(client: ClientSummary) {
    if (!client.activePackage) return;
    setActivationError('');
    setActivationDraft({
      clientKey: client.key,
      packageId: client.activePackage.id,
      mode: 'edit',
      packageDefinitionId: '',
      packageName: client.activePackage.packageName,
      totalSessions: String(client.activePackage.totalSessions),
      usedSessions: String(client.activePackage.usedSessions),
      price: '',
      validFrom: '',
      validTo: normalizeDateKey(client.activePackage.expiresAt),
      validityDays: '',
    });
  }

  function applyPackageDefinition(packageDefinitionId: string) {
    const selected = packageDefinitions.find((pkg) => pkg.id === packageDefinitionId);
    setActivationDraft((draft) => draft ? {
      ...draft,
      packageDefinitionId,
      packageName: selected?.name ?? draft.packageName,
      totalSessions: selected ? String(selected.totalSessions) : draft.totalSessions,
      price: selected?.price == null ? draft.price : String(selected.price),
      validityDays: selected ? String(selected.validityDays) : draft.validityDays,
      validTo: selected ? defaultValidTo(selected.validityDays) : draft.validTo,
    } : draft);
  }

  async function submitPackageActivation() {
    if (!activationDraft || !onAddPackage) return;
    const client = clients.find((item) => item.key === activationDraft.clientKey);
    if (!client) return;
    const totalSessions = Math.max(1, Math.round(Number(activationDraft.totalSessions) || 0));
    const usedSessions = Math.max(0, Math.round(Number(activationDraft.usedSessions) || 0));
    if (!activationDraft.packageName.trim() || totalSessions < 1) {
      setActivationError(isEn ? 'Package name and credits are required.' : 'Име на пакет и кредити са задължителни.');
      return;
    }
    if (usedSessions > totalSessions) {
      setActivationError(isEn ? 'Used credits cannot be more than total credits.' : 'Използваните кредити не могат да са повече от общите.');
      return;
    }
    setPackageBusyKey(client.key);
    setActivationError('');
    try {
      const price = activationDraft.price.trim() ? Math.max(0, Number(activationDraft.price) || 0) : null;
      if (activationDraft.mode === 'edit' && activationDraft.packageId) {
        if (!onUpdatePackage) return;
        await onUpdatePackage(client, {
          packageId: activationDraft.packageId,
          packageName: activationDraft.packageName.trim(),
          totalSessions,
          usedSessions,
          price,
          validTo: activationDraft.validTo || null,
        });
      } else {
        await onAddPackage(client, {
          packageName: activationDraft.packageName.trim(),
          totalSessions,
          usedSessions,
          price,
          validFrom: activationDraft.validFrom || null,
          validTo: activationDraft.validTo || null,
          validityDays: activationDraft.validityDays.trim() ? Math.max(1, Math.round(Number(activationDraft.validityDays) || 30)) : null,
        });
      }
      setActivationDraft(null);
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : (isEn ? 'Could not activate package.' : 'Пакетът не беше активиран.'));
    } finally {
      setPackageBusyKey(null);
    }
  }

  async function runMembershipImport(mode: MembershipImportMode) {
    if (!onImportMemberships) return;
    setImportBusy(mode);
    setImportError('');
    try {
      const result = await onImportMemberships(importText, mode);
      setImportResult(result);
      if (mode === 'import' && result.ok) setImportText('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : (isEn ? 'Import failed.' : 'Import неуспешен.'));
    } finally {
      setImportBusy(null);
    }
  }

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

    {activationDraft && (
      <div
        role="dialog"
        aria-modal="true"
        style={{ position: 'fixed', inset: 0, zIndex: 305, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.42)', padding: 16 }}
        onClick={() => !packageBusyKey && setActivationDraft(null)}
      >
        <div
          style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', display: 'grid', gap: 12, boxSizing: 'border-box' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: T.subtle, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isEn ? 'Client package' : 'Клиентски пакет'}
              </p>
              <h3 style={{ margin: '5px 0 0', fontSize: 18, fontWeight: 850, color: '#111' }}>
                {activationDraft.mode === 'edit'
                  ? (isEn ? 'Edit package' : 'Редактирай пакет')
                  : (isEn ? 'Activate package' : 'Активирай пакет')}
              </h3>
            </div>
            <button type="button" onClick={() => !packageBusyKey && setActivationDraft(null)} style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}>
              ×
            </button>
          </div>

          {activationDraft.mode === 'create' && packageDefinitions.length > 0 ? (
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Use saved package' : 'Избери създаден пакет'}
              <select
                value={activationDraft.packageDefinitionId}
                onChange={(event) => applyPackageDefinition(event.target.value)}
                style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111', background: '#fff' }}
              >
                <option value="">{isEn ? 'Manual package' : 'Ръчен пакет'}</option>
                {packageDefinitions.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Package name' : 'Име на пакет'}
              <input value={activationDraft.packageName} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, packageName: event.target.value } : draft)} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Total credits' : 'Общо кредити'}
              <input value={activationDraft.totalSessions} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, totalSessions: event.target.value } : draft)} inputMode="numeric" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Already used credits' : 'Вече използвани кредити'}
              <input value={activationDraft.usedSessions} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, usedSessions: event.target.value } : draft)} inputMode="numeric" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Price' : 'Цена'}
              <input value={activationDraft.price} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, price: event.target.value } : draft)} inputMode="decimal" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
            </label>
            {activationDraft.mode === 'create' ? (
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
                {isEn ? 'Valid from' : 'Валиден от'}
                <input type="date" value={activationDraft.validFrom} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, validFrom: event.target.value } : draft)} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
              </label>
            ) : null}
            <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 800, color: '#111' }}>
              {isEn ? 'Valid to' : 'Валиден до'}
              <input type="date" value={activationDraft.validTo} onChange={(event) => setActivationDraft((draft) => draft ? { ...draft, validTo: event.target.value } : draft)} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 11px', fontSize: 13, color: '#111' }} />
            </label>
          </div>

          {activationError ? <p style={{ margin: 0, color: '#B91C1C', fontSize: 13, fontWeight: 750 }}>{activationError}</p> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => !packageBusyKey && setActivationDraft(null)} style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '9px 13px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>
              {isEn ? 'Cancel' : 'Отказ'}
            </button>
            <button type="button" disabled={Boolean(packageBusyKey)} onClick={() => void submitPackageActivation()} style={{ border: 'none', borderRadius: 999, background: '#111', color: '#fff', padding: '9px 14px', fontSize: 12, fontWeight: 850, cursor: packageBusyKey ? 'wait' : 'pointer', opacity: packageBusyKey ? 0.55 : 1 }}>
              {packageBusyKey
                ? (activationDraft.mode === 'edit' ? (isEn ? 'Saving…' : 'Запазване…') : (isEn ? 'Activating…' : 'Активиране…'))
                : (activationDraft.mode === 'edit' ? (isEn ? 'Save package' : 'Запази пакет') : (isEn ? 'Activate package' : 'Активирай пакет'))}
            </button>
          </div>
        </div>
      </div>
    )}

    {onImportMemberships && (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: '#fff', padding: isMobile ? 12 : 14, marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{isEn ? 'Membership CSV import' : 'Import на пакети от CSV'}</div>
            <div style={{ marginTop: 3, fontSize: 12, color: T.muted }}>{isEn ? 'Paste CSV or tab-separated rows from Google Sheets/Excel.' : 'Постави CSV или копирани редове от Google Sheets/Excel.'}</div>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen((open) => !open)}
            style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: importOpen ? '#111' : '#fff', color: importOpen ? '#fff' : '#111', padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
          >
            {importOpen ? (isEn ? 'Close' : 'Затвори') : (isEn ? 'Open import' : 'Отвори import')}
          </button>
        </div>

        {importOpen && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportResult(null); setImportError(''); }}
              placeholder={isEn ? 'name, phone, email, package, total credits, used, valid to\nMaria, 0888123456, maria@example.com, 8 trainings, 8, 2, 31.12.2026' : 'име, телефон, имейл, пакет, общо, използвани, валиден до\nМария, 0888123456, maria@example.com, 8 тренировки, 8, 2, 31.12.2026'}
              style={{ minHeight: 110, resize: 'vertical', border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.45, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#111', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!importText.trim() || importBusy != null}
                onClick={() => void runMembershipImport('preview')}
                style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: importBusy ? 'wait' : 'pointer', opacity: !importText.trim() || importBusy ? 0.55 : 1 }}
              >
                {importBusy === 'preview' ? (isEn ? 'Previewing…' : 'Преглед…') : (isEn ? 'Preview' : 'Преглед')}
              </button>
              <button
                type="button"
                disabled={!importText.trim() || importBusy != null || !importResult?.ok}
                onClick={() => void runMembershipImport('import')}
                style={{ border: 'none', borderRadius: 999, background: '#111', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: importBusy ? 'wait' : 'pointer', opacity: !importText.trim() || importBusy || !importResult?.ok ? 0.45 : 1 }}
              >
                {importBusy === 'import' ? (isEn ? 'Importing…' : 'Импортира…') : (isEn ? 'Import valid rows' : 'Импортирай валидните')}
              </button>
            </div>
            {importError && (
              <div style={{ border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '9px 10px', color: '#b91c1c', fontSize: 12 }}>
                {importError}
              </div>
            )}
            {importResult && (
              <div style={{ border: `1px solid ${importResult.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '9px 10px', background: importResult.ok ? '#ecfdf5' : '#fef2f2', color: importResult.ok ? '#047857' : '#b91c1c', fontSize: 12, fontWeight: 800 }}>
                  {isEn
                    ? `${importResult.summary.validRows}/${importResult.summary.totalRows} valid rows`
                    : `${importResult.summary.validRows}/${importResult.summary.totalRows} валидни реда`}
                  {importResult.summary.createdPackages || importResult.summary.updatedPackages
                    ? ` · ${isEn ? 'created' : 'създадени'} ${importResult.summary.createdPackages}, ${isEn ? 'updated' : 'обновени'} ${importResult.summary.updatedPackages}`
                    : ''}
                </div>
                <div style={{ maxHeight: 260, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#fafafa', color: T.subtle, textAlign: 'left' }}>
                        {['#', isEn ? 'Client' : 'Клиент', isEn ? 'Contact' : 'Контакт', isEn ? 'Package' : 'Пакет', isEn ? 'Used' : 'Ползвани', isEn ? 'Valid to' : 'Валиден до', isEn ? 'Status' : 'Статус'].map((header) => (
                          <th key={header} style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}`, fontWeight: 800 }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.rows.slice(0, 50).map((row) => {
                        const hasErrors = row.errors.length > 0;
                        return (
                          <tr key={row.rowNumber} style={{ color: hasErrors ? '#b91c1c' : '#111' }}>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.rowNumber}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.name || '—'}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.phone || row.email || '—'}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.packageName}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.usedSessions}/{row.totalSessions}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>{row.validTo}</td>
                            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border}` }}>
                              {hasErrors ? row.errors.join(', ') : row.action ?? (row.warnings[0] ?? (isEn ? 'Ready' : 'Готов'))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {clients.length === 0 ? (
      <div style={{ borderRadius: 12, padding: '20px 14px', color: T.muted, textAlign: 'center' }}>
        {isEn ? 'No clients.' : 'Няма клиенти.'}
      </div>
    ) : (
      <>
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
                    {client.activePackage.packageName}
                    {' · '}
                    {client.activePackage.remainingSessions}/{client.activePackage.totalSessions}
                    {' · '}
                    {isEn ? 'valid until ' : 'до '}
                    {new Date(`${normalizeDateKey(client.activePackage.expiresAt)}T12:00:00`).toLocaleDateString(isEn ? 'en-US' : 'bg-BG')}
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', borderRadius: 999, background: '#f4f4f5', color: T.subtle, padding: '4px 9px', fontSize: 12, fontWeight: 600 }}>
                    {isEn ? 'No active package' : 'Няма активен пакет'}
                  </span>
                )}
                {onAddPackage && !client.activePackage ? (
                  <button
                    type="button"
                    disabled={packageBusyKey === client.key}
                    onClick={() => openPackageActivation(client)}
                    style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '4px 10px', fontSize: 12, fontWeight: 750, cursor: packageBusyKey === client.key ? 'wait' : 'pointer', opacity: packageBusyKey === client.key ? 0.6 : 1 }}
                  >
                    {packageBusyKey === client.key ? '…' : (isEn ? 'Activate package' : 'Активирай пакет')}
                  </button>
                ) : null}
                {client.activePackage && onUpdatePackage ? (
                  <button
                    type="button"
                    disabled={packageBusyKey === client.key}
                    onClick={async () => {
                      if (!client.activePackage) return;
                      setPackageBusyKey(client.key);
                      try {
                        await onUpdatePackage(client, {
                          packageId: client.activePackage.id,
                          packageName: client.activePackage.packageName,
                          totalSessions: client.activePackage.totalSessions + 1,
                          usedSessions: client.activePackage.usedSessions,
                          price: null,
                          validTo: normalizeDateKey(client.activePackage.expiresAt),
                        });
                      } finally {
                        setPackageBusyKey(null);
                      }
                    }}
                    style={{ border: '1px solid rgba(5,150,105,0.28)', borderRadius: 999, background: '#ECFDF5', color: '#047857', padding: '4px 10px', fontSize: 12, fontWeight: 750, cursor: packageBusyKey === client.key ? 'wait' : 'pointer', opacity: packageBusyKey === client.key ? 0.6 : 1 }}
                  >
                    {isEn ? 'Add credit' : 'Добави кредит'}
                  </button>
                ) : null}
                {client.activePackage && onUpdatePackage ? (
                  <button
                    type="button"
                    disabled={packageBusyKey === client.key || client.activePackage.remainingSessions <= 0}
                    onClick={async () => {
                      if (!client.activePackage) return;
                      setPackageBusyKey(client.key);
                      try {
                        await onUpdatePackage(client, {
                          packageId: client.activePackage.id,
                          packageName: client.activePackage.packageName,
                          totalSessions: client.activePackage.totalSessions,
                          usedSessions: Math.min(client.activePackage.totalSessions, client.activePackage.usedSessions + 1),
                          price: null,
                          validTo: normalizeDateKey(client.activePackage.expiresAt),
                        });
                      } finally {
                        setPackageBusyKey(null);
                      }
                    }}
                    style={{ border: '1px solid rgba(220,38,38,0.24)', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C', padding: '4px 10px', fontSize: 12, fontWeight: 750, cursor: packageBusyKey === client.key ? 'wait' : 'pointer', opacity: packageBusyKey === client.key || client.activePackage.remainingSessions <= 0 ? 0.55 : 1 }}
                  >
                    {isEn ? 'Remove credit' : 'Отнеми кредит'}
                  </button>
                ) : null}
                {client.activePackage && onUpdatePackage ? (
                  <button
                    type="button"
                    disabled={packageBusyKey === client.key}
                    onClick={() => openPackageEdit(client)}
                    style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: '#fff', color: '#111', padding: '4px 10px', fontSize: 12, fontWeight: 750, cursor: packageBusyKey === client.key ? 'wait' : 'pointer', opacity: packageBusyKey === client.key ? 0.6 : 1 }}
                  >
                    {isEn ? 'Edit package' : 'Редактирай пакет'}
                  </button>
                ) : null}
                {client.activePackage && onDeactivatePackage ? (
                  <button
                    type="button"
                    disabled={packageBusyKey === client.key}
                    onClick={async () => {
                      const ok = window.confirm(isEn ? 'Deactivate this package?' : 'Да деактивирам ли този пакет?');
                      if (!ok || !client.activePackage) return;
                      setPackageBusyKey(client.key);
                      try {
                        await onDeactivatePackage(client, client.activePackage.id);
                      } finally {
                        setPackageBusyKey(null);
                      }
                    }}
                    style={{ border: '1px solid rgba(220,38,38,0.24)', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C', padding: '4px 10px', fontSize: 12, fontWeight: 750, cursor: packageBusyKey === client.key ? 'wait' : 'pointer', opacity: packageBusyKey === client.key ? 0.6 : 1 }}
                  >
                    {isEn ? 'Deactivate' : 'Деактивирай'}
                  </button>
                ) : null}
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
    )}
    </>
  );
}
