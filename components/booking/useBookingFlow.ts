'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isDateBlockedAllDay, isBlockedForStartTime } from '@/lib/booking-blocks';
import { trackBookingStarted, trackBookingCompleted } from '@/lib/tracking-events';
import { useT } from '@/lib/i18n-react';
import type {
  UseBookingFlowOptions,
  UseBookingFlowReturn,
  BookingServiceItem,
  BookingSuccessDetails,
  OccupiedSlot,
  PublicStaffMember,
} from './types';

const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalISODate(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]!;
}

export function useBookingFlow({
  slug,
  openingHours,
  bookingBlocks,
  slotIntervalMin,
  bookingAdvanceDays,
  bookingServices,
  engineUrl = '',
  successUrl,
  cancelUrl,
  locale = 'bg-BG',
  onEvent,
}: UseBookingFlowOptions): UseBookingFlowReturn {
  const t = useT();
  const api = engineUrl.replace(/\/$/, '');
  const slugPath = `/api/public/v1/salons/${encodeURIComponent(slug)}`;

  // ── Modal visibility ─────────────────────────────────────────────────
  const [bookingOpen, setBookingOpen] = useState(false);

  // ── Service selection ────────────────────────────────────────────────
  const [selectedServiceIdxs, setSelectedServiceIdxs] = useState<number[]>([]);

  // ── Date / time ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [occupiedByDate, setOccupiedByDate] = useState<Record<string, OccupiedSlot[]>>({});
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  // ── Contact fields ───────────────────────────────────────────────────
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // ── Staff (TEAM plan) ────────────────────────────────────────────────
  const [staffMembers, setStaffMembers] = useState<PublicStaffMember[]>([]);
  const [selectedStaffMemberId, setSelectedStaffMemberIdState] = useState<string | null>(null);
  const staffFetchedRef = useRef(false);

  // ── Submission ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingSuccessDetails, setBookingSuccessDetails] = useState<BookingSuccessDetails | null>(null);

  // ── Compute min/max dates on mount ──────────────────────────────────
  useEffect(() => {
    const today = new Date();
    setMinDate(toLocalISODate(today));
    const max = new Date(today);
    max.setDate(today.getDate() + Math.max(1, bookingAdvanceDays));
    setMaxDate(toLocalISODate(max));
  }, [bookingAdvanceDays]);

  // ── Fetch staff members once when modal first opens ──────────────────
  useEffect(() => {
    if (!bookingOpen || staffFetchedRef.current) return;
    staffFetchedRef.current = true;
    fetch(`${api}${slugPath}/staff`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { staff?: PublicStaffMember[] }) => {
        if (Array.isArray(d.staff)) setStaffMembers(d.staff);
      })
      .catch(() => {});
  }, [bookingOpen, slug]);

  // ── Fetch occupied slots whenever date or staff changes ──────────────
  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    const staffParam = selectedStaffMemberId
      ? `&staffMemberId=${encodeURIComponent(selectedStaffMemberId)}`
      : '';
    fetch(
      `${api}${slugPath}/slots?date=${encodeURIComponent(selectedDate)}${staffParam}`,
      { cache: 'no-store' },
    )
      .then((r) => r.json())
      .then((d: { occupied?: Array<{ time?: string; duration?: number }> }) => {
        if (cancelled || !Array.isArray(d.occupied)) return;
        const slots: OccupiedSlot[] = d.occupied
          .map((x) => ({
            time: String(x?.time ?? ''),
            duration: Math.max(5, Number(x?.duration ?? 30) || 30),
          }))
          .filter((x) => x.time.length >= 4);
        const cacheKey = selectedStaffMemberId
          ? `${selectedDate}:${selectedStaffMemberId}`
          : selectedDate;
        if (!cancelled) setOccupiedByDate((prev) => ({ ...prev, [cacheKey]: slots }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, selectedDate, selectedStaffMemberId]);

  // ── Derived: selected service objects ────────────────────────────────
  const selectedServices = useMemo<BookingServiceItem[]>(
    () =>
      selectedServiceIdxs
        .map((i) => bookingServices[i])
        .filter((s): s is BookingServiceItem => Boolean(s)),
    [selectedServiceIdxs, bookingServices],
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [selectedServices],
  );

  // ── Slot calculation ─────────────────────────────────────────────────
  const slotsForDate = useCallback(
    (date: string, durationMin: number): string[] | 'closed' | null => {
      if (!date) return null;
      const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()];
      const h = openingHours[dayKey] as { open?: string; close?: string } | null | undefined;
      if (!h?.open || !h?.close) return 'closed';
      if (isDateBlockedAllDay(bookingBlocks, date)) return 'closed';

      const dur = Math.max(5, durationMin || 30);
      const cacheKey = selectedStaffMemberId
        ? `${date}:${selectedStaffMemberId}`
        : date;
      const occupied = occupiedByDate[cacheKey] ?? [];

      const [oh = 0, om = 0] = h.open.split(':').map(Number);
      const [ch = 0, cm = 0] = h.close.split(':').map(Number);
      const start = oh * 60 + om;
      const latestStart = ch * 60 + cm - dur;
      const slots: string[] = [];

      for (let t = start; t <= latestStart; t += slotIntervalMin) {
        const slot = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
        const slotEnd = t + dur;
        const overlaps = occupied.some(({ time, duration: d }) => {
          const [bh = 0, bm = 0] = time.split(':').map(Number);
          const existStart = bh * 60 + bm;
          const existEnd = existStart + Math.max(5, d);
          return existStart < slotEnd && existEnd > t;
        });
        if (!overlaps && !isBlockedForStartTime(bookingBlocks, date, slot, dur)) {
          slots.push(slot);
        }
      }
      return slots;
    },
    [openingHours, bookingBlocks, occupiedByDate, selectedStaffMemberId, slotIntervalMin],
  );

  const timeSlots = useMemo<string[] | 'closed' | null>(
    () =>
      selectedServiceIdxs.length === 0
        ? null
        : slotsForDate(selectedDate, totalDuration || 30),
    [selectedServiceIdxs.length, slotsForDate, selectedDate, totalDuration],
  );

  // ── Actions ──────────────────────────────────────────────────────────
  const open = useCallback((serviceId?: string) => {
    setBookingError('');
    setBookingSuccess('');
    setBookingSuccessDetails(null);
    if (serviceId) {
      const idx = bookingServices.findIndex((s) => s.id === serviceId);
      setSelectedServiceIdxs(idx >= 0 ? [idx] : []);
    } else {
      setSelectedServiceIdxs([]);
    }
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setBookingOpen(true);
    if (onEvent) onEvent('booking_started');
    else trackBookingStarted();
  }, [bookingServices, onEvent]);

  const close = useCallback(() => {
    setBookingOpen(false);
    setBookingSuccessDetails(null);
    setSelectedStaffMemberIdState(null);
    setSelectedDate('');
    setSelectedTime('');
  }, []);

  const toggleService = useCallback((idx: number) => {
    setSelectedServiceIdxs((prev) => {
      const has = prev.includes(idx);
      return has ? prev.filter((x) => x !== idx) : [...prev, idx];
    });
    setSelectedTime('');
  }, []);

  const setDate = useCallback((d: string) => {
    setSelectedDate(d);
    setSelectedTime('');
  }, []);

  const setStaffMemberId = useCallback((id: string) => {
    setSelectedStaffMemberIdState(id);
    setSelectedDate('');
    setSelectedTime('');
  }, []);

  const markSlotOccupied = useCallback((date: string, time: string, duration: number) => {
    if (!date || !time) return;
    const dur = Math.max(5, Number(duration) || 30);
    setOccupiedByDate((prev) => {
      const day = prev[date] ?? [];
      if (day.some((s) => s.time === time)) return prev;
      return { ...prev, [date]: [...day, { time, duration: dur }] };
    });
  }, []);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (selectedServices.length === 0) { setBookingError(t('booking.errors.noService')); return; }
    if (!clientName.trim())  { setBookingError(t('booking.errors.noName')); return; }
    if (!clientPhone.trim()) { setBookingError(t('booking.errors.noPhone')); return; }
    if (!clientEmail.trim()) { setBookingError(t('booking.errors.noEmail')); return; }
    if (!selectedDate)       { setBookingError(t('booking.errors.noDate')); return; }
    if (!selectedTime)       { setBookingError(t('booking.errors.noTime')); return; }

    const serviceName = selectedServices.map((s) => s.name).join(' + ');
    const duration    = totalDuration || 30;
    const firstSvc    = selectedServices[0];
    const paymentType = firstSvc?.payment_type ?? 'none';
    const depositAmt  = firstSvc?.deposit_amount ?? 0;
    const amountEuros =
      paymentType === 'deposit' ? depositAmt :
      paymentType === 'full'    ? (totalPrice ?? 0) : 0;
    const requiresPayment = paymentType !== 'none' && amountEuros > 0;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${api}${slugPath}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:         clientName.trim(),
          clientPhone:        clientPhone.trim(),
          clientEmail:        clientEmail.trim().toLowerCase(),
          serviceName,
          servicePrice:       totalPrice,
          serviceDuration:    duration,
          date:               selectedDate,
          time:               selectedTime,
          notes:              notes.trim() || undefined,
          requiresPayment,
          staffMemberId:      selectedStaffMemberId ?? undefined,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string; bookingId?: string; id?: string;
      };
      if (!res.ok) {
        throw new Error(
          json.error ??
          (res.status === 500
            ? t('booking.errors.saveFailed')
            : t('booking.errors.httpError', { status: res.status })),
        );
      }

      // Stripe Checkout redirect for paid bookings
      const bookingId = json.bookingId ?? json.id;
      if (requiresPayment && bookingId) {
        const payRes = await fetch(`${api}${slugPath}/booking-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            salonSlug: slug,
            serviceName,
            amountEuros,
            paymentType,
            successUrl,
            cancelUrl,
          }),
        });
        const payJson = (await payRes.json().catch(() => ({}))) as {
          checkoutUrl?: string; error?: string;
        };
        if (!payRes.ok || !payJson.checkoutUrl) {
          throw new Error(payJson.error ?? t('booking.errors.paymentFailed'));
        }
        window.location.href = payJson.checkoutUrl;
        return;
      }

      const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      markSlotOccupied(selectedDate, selectedTime, duration);
      setBookingSuccessDetails({ serviceName, dateLabel, time: selectedTime });
      setBookingSuccess(`${serviceName} — ${dateLabel} ${selectedTime}`);
      const eventPayload = {
        serviceName,
        value: totalPrice > 0 ? totalPrice : undefined,
        currency: 'EUR',
      };
      if (onEvent) onEvent('booking_completed', eventPayload);
      else trackBookingCompleted(eventPayload);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : t('booking.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    slug, selectedServices, clientName, clientPhone, clientEmail,
    selectedDate, selectedTime, notes,
    totalDuration, totalPrice, selectedStaffMemberId, markSlotOccupied,
    successUrl, cancelUrl, locale, onEvent,
  ]);

  return {
    bookingOpen, open, close,
    selectedServiceIdxs, toggleService, totalDuration, totalPrice, selectedServices,
    selectedDate, setDate,
    selectedTime, setTime: setSelectedTime,
    timeSlots, minDate, maxDate,
    clientName, setClientName,
    clientPhone, setClientPhone,
    clientEmail, setClientEmail,
    notes, setNotes,
    staffMembers, selectedStaffMemberId, setStaffMemberId,
    isSubmitting, bookingError, bookingSuccess, bookingSuccessDetails,
    submit,
  };
}
