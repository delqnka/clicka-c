'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import type { getPublicSalonPageData } from '@/lib/public-salon';
import { parseSalonServices, localizeService } from '@/lib/salon-services';
import { enrichServiceCategories, buildServiceCategoryTabs } from '@/lib/salon-service-categories';
import { mergeOpeningHours, getEffectiveHours, type OpeningDayRecord } from '@/lib/salon-opening-hours';
import { trackBookingCompleted } from '@/lib/tracking-events';
import { normalizeBookingBlocks, isDateBlockedAllDay, isBlockedForStartTime } from '@/lib/booking-blocks';
import { parseTimeToMinutes } from '@/lib/booking-time';
import type { BookingCatalogService } from '@/lib/booking-modal-catalog';
import { I18nProvider } from '@/lib/i18n-react';
import { resolveSalonLocale, toLocaleTag } from '@/lib/salon-locale';

const SalonBookingModal = dynamic(
  () => import('@/components/salon/SalonBookingModal').then((m) => m.SalonBookingModal),
  { ssr: false },
);

type SalonPageData = NonNullable<Awaited<ReturnType<typeof getPublicSalonPageData>>>;

type Props = { pageData: SalonPageData };

function closeEmbed() {
  if (typeof window === 'undefined') return;
  if (window.parent !== window) {
    // Send both message types for backward compatibility with older widget.js versions
    window.parent.postMessage({ type: 'booking:close' }, '*');
    window.parent.postMessage({ type: 'clicka:close' }, '*');
  } else {
    window.history.back();
  }
}

export function SalonEmbedBookingView({ pageData }: Props) {
  const salonRecord = pageData.salon as Record<string, unknown>;
  const salonSlug = pageData.salonSlug;
  const salonName = String(salonRecord.name ?? '');
  const primary = String(salonRecord.primary_color ?? '#000000');
  const salonLocale = resolveSalonLocale(typeof salonRecord.language === 'string' ? salonRecord.language : 'bg');
  const bookingLocale = toLocaleTag(salonLocale);
  const isEn = salonLocale === 'en';

  const serviceCatalog = useMemo(
    () => enrichServiceCategories(
      parseSalonServices(salonRecord.services).map((s) => localizeService(s, salonLocale))
    ) as BookingCatalogService[],
    [salonRecord.services, salonLocale],
  );
  const categoryTabs = useMemo(() => buildServiceCategoryTabs(serviceCatalog), [serviceCatalog]);

  const bookingServices = useMemo(() => {
    const out: BookingCatalogService[] = [];
    for (const service of serviceCatalog) {
      const variants = Array.isArray(service.variants) ? service.variants : [];
      if (variants.length === 0) { out.push(service); continue; }
      for (const v of variants) {
        out.push({
          ...service,
          id: `${service.id}::${v.label}`,
          name: `${service.name} – ${v.label}`,
          price: Number(v.price ?? service.price ?? 0) || 0,
          duration: Math.max(5, Number(v.duration ?? service.duration ?? 30) || 30),
          variants: undefined,
        });
      }
    }
    return out;
  }, [serviceCatalog]);

  const workingHours = salonRecord.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | undefined;
  const openingHours: OpeningDayRecord = useMemo(
    () => mergeOpeningHours(workingHours, salonRecord.opening_hours),
    [workingHours, salonRecord.opening_hours],
  );
  const bookingBlocks = useMemo(
    () => normalizeBookingBlocks(
      salonRecord.opening_hours && typeof salonRecord.opening_hours === 'object'
        ? (salonRecord.opening_hours as Record<string, unknown>).booking_blocks
        : null,
    ),
    [salonRecord.opening_hours],
  );

  const [serviceIdxs, setServiceIdxs] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [occupiedByDate, setOccupiedByDate] = useState<Record<string, Array<{ time: string; duration: number; quantity?: number; blocksAll?: boolean }>>>({});
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [successDetails, setSuccessDetails] = useState<{ serviceName: string; dateLabel: string; time: string; quantity?: number; totalPrice?: number } | null>(null);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  useEffect(() => {
    const toLocal = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]!;
    const today = new Date();
    setMinDate(toLocal(today));
    const oh = salonRecord?.opening_hours;
    const advanceDays =
      oh && typeof oh === 'object' && Number.isFinite(Number((oh as Record<string, unknown>).booking_advance_days)) && Number((oh as Record<string, unknown>).booking_advance_days) >= 1
        ? Math.round(Number((oh as Record<string, unknown>).booking_advance_days))
        : 60;
    const max = new Date(today);
    max.setDate(today.getDate() + advanceDays);
    setMaxDate(toLocal(max));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    fetch(
      `/api/bookings?public=1&slug=${encodeURIComponent(salonSlug)}&date=${encodeURIComponent(selectedDate)}`,
      { cache: 'no-store' },
    )
      .then((r) => r.json())
      .then((d: { occupied?: Array<{ time?: string; duration?: number; quantity?: number; blocksAll?: boolean }> }) => {
        if (cancelled || !Array.isArray(d.occupied)) return;
        const occupied = d.occupied
          .map((x) => ({
            time: String(x?.time ?? ''),
            duration: Math.max(5, Number(x?.duration ?? 30) || 30),
            quantity: Math.max(1, Math.round(Number(x?.quantity ?? 1) || 1)),
            ...(x?.blocksAll === true ? { blocksAll: true } : {}),
          }))
          .filter((x) => x.time.length >= 4);
        if (!cancelled) setOccupiedByDate((prev) => ({ ...prev, [selectedDate]: occupied }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedDate, salonSlug]);

  const selectedServices = useMemo(
    () => serviceIdxs.map((i) => bookingServices[i]).filter((s): s is BookingCatalogService => Boolean(s)),
    [serviceIdxs, bookingServices],
  );
  const totalDuration = useMemo(() => selectedServices.reduce((a, s) => a + s.duration, 0), [selectedServices]);
  const totalPrice = useMemo(() => selectedServices.reduce((a, s) => a + (s.price ?? 0), 0), [selectedServices]);
  const selectedCapacity = useMemo(() => {
    if (selectedServices.length === 0) return 1;
    return Math.max(
      1,
      Math.min(...selectedServices.map((s) => Math.max(1, Math.round(Number(s.capacity ?? 1) || 1)))),
    );
  }, [selectedServices]);

  const slotIntervalMin = (() => {
    const oh = salonRecord?.opening_hours;
    if (oh && typeof oh === 'object') {
      const v = Number((oh as Record<string, unknown>).slot_interval_min);
      if ([15, 20, 30, 45, 60].includes(v)) return v;
    }
    return 30;
  })();

  const timeSlots = useMemo((): string[] | 'closed' | null => {
    if (serviceIdxs.length === 0 || !selectedDate) return null;
    if (isDateBlockedAllDay(bookingBlocks, selectedDate)) return 'closed';
    const dayKey = new Date(`${selectedDate}T12:00:00`)
      .toLocaleDateString('en-US', { weekday: 'long' }) as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    const h = getEffectiveHours(openingHours, dayKey);
    if (!h?.open || !h?.close) return 'closed';
    const dur = Math.max(5, totalDuration || 30);
    const occupied = occupiedByDate[selectedDate] ?? [];
    const [oh = 0, om = 0] = h.open.split(':').map(Number);
    const [ch = 0, cm = 0] = h.close.split(':').map(Number);
    const startMin = oh * 60 + om;
    const latestStart = ch * 60 + cm - dur;
    const slots: string[] = [];
    for (let t = startMin; t <= latestStart; t += slotIntervalMin) {
      const timeStr = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      if (isBlockedForStartTime(bookingBlocks, selectedDate, timeStr, dur)) continue;
      const overlappingBookings = occupied.filter((o) => {
        const oStart = parseTimeToMinutes(o.time) ?? 0;
        return t < oStart + o.duration && t + dur > oStart;
      });
      const usedQuantity = overlappingBookings.reduce(
        (sum, booking) => sum + Math.max(1, Math.round(Number(booking.quantity ?? 1) || 1)),
        0,
      );
      if (!overlappingBookings.some((booking) => booking.blocksAll === true) && usedQuantity < selectedCapacity) {
        slots.push(timeStr);
      }
    }
    return slots;
  }, [serviceIdxs, selectedDate, totalDuration, openingHours, bookingBlocks, occupiedByDate, selectedCapacity, slotIntervalMin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingError('');
    if (!selectedDate || !selectedTime || serviceIdxs.length === 0) return;
    setSubmitting(true);
    try {
      const serviceName = selectedServices.map((s) => s?.name ?? '').join(' + ');
      const res = await fetch(`/api/bookings?slug=${encodeURIComponent(salonSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          serviceName,
          servicePrice: totalPrice,
          serviceDuration: totalDuration || 30,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? (isEn ? `Error ${res.status}` : `Грешка ${res.status}`));
      const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(bookingLocale, {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      setSuccessDetails({ serviceName, dateLabel, time: selectedTime, quantity: 1, totalPrice });
      trackBookingCompleted({ serviceName, value: totalPrice > 0 ? totalPrice : undefined });
      setBookingSuccess(isEn ? `${serviceName} — ${dateLabel} at ${selectedTime}` : `${serviceName} — ${dateLabel} в ${selectedTime} ч.`);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : (isEn ? 'Booking error.' : 'Грешка при резервация.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <I18nProvider locale={salonLocale}>
      <SalonBookingModal
        open
        primaryColor={primary}
        locale={bookingLocale}
        serviceCatalog={serviceCatalog}
        services={bookingServices}
        categoryTabs={categoryTabs}
        selectedServiceIdxs={serviceIdxs}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        totalDuration={totalDuration}
        totalPrice={totalPrice}
        clientName={clientName}
        clientPhone={clientPhone}
        clientEmail={clientEmail}
        notes={notes}
        salonName={salonName}
        termsHref={`/${salonSlug}/terms`}
        privacyHref={`/${salonSlug}/privacy`}
        minDate={minDate}
        maxDate={maxDate}
        timeSlots={timeSlots}
        paymentType="none"
        isSubmitting={submitting}
        bookingError={bookingError}
        bookingSuccess={bookingSuccess}
        bookingSuccessDetails={successDetails}
        onClose={closeEmbed}
        onToggleService={(idx) => {
          setServiceIdxs((prev) => {
            const has = prev.includes(idx);
            return has ? prev.filter((x) => x !== idx) : [...prev, idx];
          });
          setSelectedTime('');
        }}
        onDateChange={(d) => { setSelectedDate(d); setSelectedTime(''); }}
        onTimeChange={setSelectedTime}
        onClientNameChange={setClientName}
        onClientPhoneChange={setClientPhone}
        onClientEmailChange={setClientEmail}
        onNotesChange={setNotes}
        onSubmit={handleSubmit}
      />
    </I18nProvider>
  );
}
