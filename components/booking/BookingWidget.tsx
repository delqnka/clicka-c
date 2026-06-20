'use client';

import dynamic from 'next/dynamic';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import { parseSalonServices } from '@/lib/salon-services';
import {
  enrichServiceCategories,
  buildServiceCategoryTabs,
} from '@/lib/salon-service-categories';
import { mergeOpeningHours } from '@/lib/salon-opening-hours';
import { normalizeBookingBlocks } from '@/lib/booking-blocks';
import type { BookingCatalogService } from '@/lib/booking-modal-catalog';
import { useBookingFlow } from './useBookingFlow';
import type { BookingServiceItem, BookingWidgetHandle, BookingWidgetProps } from './types';
import { I18nProvider } from '@/lib/i18n-react';
import type { Locale } from '@/lib/i18n';

const SalonBookingModal = dynamic(
  () => import('@/components/salon/SalonBookingModal').then((m) => m.SalonBookingModal),
  { ssr: false },
);

// ── Inner component ────────────────────────────────────────────────────────────
// Must live *inside* I18nProvider so that useBookingFlow → useT() reads the
// correct locale. If useBookingFlow were called in the outer BookingWidget,
// it would be outside the provider and always get the 'bg' default.

type InnerProps = {
  forwardedRef: React.Ref<BookingWidgetHandle>;
  slug: string;
  openingHours: ReturnType<typeof mergeOpeningHours>;
  bookingBlocks: ReturnType<typeof normalizeBookingBlocks>;
  slotIntervalMin: number;
  bookingAdvanceDays: number;
  bookingServices: BookingServiceItem[];
  serviceCatalog: BookingCatalogService[];
  categoryTabs: ReturnType<typeof buildServiceCategoryTabs>;
  engineUrl: string;
  primaryColor: string;
  salonName: string;
  basePath: string;
};

function BookingWidgetInner({
  forwardedRef,
  slug,
  openingHours,
  bookingBlocks,
  slotIntervalMin,
  bookingAdvanceDays,
  bookingServices,
  serviceCatalog,
  categoryTabs,
  engineUrl,
  primaryColor,
  salonName,
  basePath,
}: InnerProps) {
  const flow = useBookingFlow({
    slug,
    openingHours,
    bookingBlocks,
    slotIntervalMin,
    bookingAdvanceDays,
    bookingServices,
    engineUrl,
  });

  useImperativeHandle(forwardedRef, () => ({
    open:  (serviceId?: string) => flow.open(serviceId),
    close: () => flow.close(),
  }), [flow.open, flow.close]);

  const firstSelected = flow.selectedServices[0];

  return (
    <SalonBookingModal
      open={flow.bookingOpen}
      primaryColor={primaryColor}
      serviceCatalog={serviceCatalog}
      categoryTabs={categoryTabs}
      services={bookingServices}
      selectedServiceIdxs={flow.selectedServiceIdxs}
      selectedDate={flow.selectedDate}
      selectedTime={flow.selectedTime}
      totalDuration={flow.totalDuration}
      totalPrice={flow.totalPrice}
      clientName={flow.clientName}
      clientPhone={flow.clientPhone}
      clientEmail={flow.clientEmail}
      notes={flow.notes}
      salonName={salonName}
      termsHref={`${basePath}/terms`}
      privacyHref={`${basePath}/privacy`}
      minDate={flow.minDate}
      maxDate={flow.maxDate}
      timeSlots={flow.timeSlots}
      paymentType={firstSelected?.payment_type ?? 'none'}
      depositAmount={firstSelected?.deposit_amount}
      cancelPolicyHours={firstSelected?.cancel_policy_hours}
      cancelPolicyAction={firstSelected?.cancel_policy_action}
      isSubmitting={flow.isSubmitting}
      bookingError={flow.bookingError}
      bookingSuccess={flow.bookingSuccess}
      bookingSuccessDetails={flow.bookingSuccessDetails}
      staffMembers={flow.staffMembers}
      selectedStaffMemberId={flow.selectedStaffMemberId}
      onClose={flow.close}
      onToggleService={flow.toggleService}
      onDateChange={flow.setDate}
      onTimeChange={flow.setTime}
      onClientNameChange={flow.setClientName}
      onClientPhoneChange={flow.setClientPhone}
      onClientEmailChange={flow.setClientEmail}
      onNotesChange={flow.setNotes}
      onStaffMemberChange={flow.setStaffMemberId}
      onSubmit={flow.submit}
    />
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export const BookingWidget = forwardRef<BookingWidgetHandle, BookingWidgetProps>(
  function BookingWidget({ slug, salon, openingHours: openingHoursProp, bookingBlocks: blocksProp, basePath = '', engineUrl = '' }, ref) {

    // ── Opening hours ──────────────────────────────────────────────────
    const openingHours = useMemo(
      () => mergeOpeningHours(
        salon.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | undefined,
        salon.opening_hours,
      ),
      [salon.working_hours, salon.opening_hours],
    );

    const resolvedHours  = openingHoursProp  ?? openingHours;
    const resolvedBlocks = blocksProp ?? normalizeBookingBlocks(
      salon.opening_hours && typeof salon.opening_hours === 'object'
        ? (salon.opening_hours as Record<string, unknown>).booking_blocks
        : null,
    );

    // ── Slot config from salon settings ───────────────────────────────
    const slotIntervalMin = useMemo((): number => {
      const oh = salon.opening_hours;
      if (oh && typeof oh === 'object') {
        const v = Number((oh as Record<string, unknown>).slot_interval_min);
        if ([15, 20, 30, 45, 60].includes(v)) return v;
      }
      return 30;
    }, [salon.opening_hours]);

    const bookingAdvanceDays = useMemo((): number => {
      const oh = salon.opening_hours;
      if (oh && typeof oh === 'object') {
        const v = Number((oh as Record<string, unknown>).booking_advance_days);
        if (Number.isFinite(v) && v >= 1) return Math.round(v);
      }
      return 60;
    }, [salon.opening_hours]);

    // ── Services processing ────────────────────────────────────────────
    const serviceCatalog = useMemo(
      () => enrichServiceCategories(parseSalonServices(salon.services)) as BookingCatalogService[],
      [salon.services],
    );

    const categoryTabs = useMemo(
      () => buildServiceCategoryTabs(serviceCatalog),
      [serviceCatalog],
    );

    const bookingServices = useMemo<BookingServiceItem[]>(() => {
      const out: BookingServiceItem[] = [];
      for (const svc of serviceCatalog) {
        const variants = Array.isArray(svc.variants) ? svc.variants : [];
        if (variants.length === 0) {
          out.push(svc as unknown as BookingServiceItem);
          continue;
        }
        for (const v of variants) {
          out.push({
            ...(svc as unknown as BookingServiceItem),
            id:       `${svc.id}::${v.label}`,
            name:     `${svc.name} – ${v.label}`,
            price:    Number(v.price ?? svc.price ?? 0) || 0,
            duration: Math.max(5, Number(v.duration ?? svc.duration ?? 30) || 30),
            variants: undefined,
          });
        }
      }
      return out;
    }, [serviceCatalog]);

    // ── Locale ────────────────────────────────────────────────────────
    const lang = (typeof salon.language === 'string' ? salon.language : 'bg') as Locale;

    // ── Derived display props ─────────────────────────────────────────
    const primaryColor = typeof salon.primary_color === 'string' && salon.primary_color
      ? salon.primary_color
      : '#5B21B6';

    return (
      <I18nProvider locale={lang}>
        <BookingWidgetInner
          forwardedRef={ref}
          slug={slug}
          openingHours={resolvedHours}
          bookingBlocks={resolvedBlocks}
          slotIntervalMin={slotIntervalMin}
          bookingAdvanceDays={bookingAdvanceDays}
          bookingServices={bookingServices}
          serviceCatalog={serviceCatalog}
          categoryTabs={categoryTabs}
          engineUrl={engineUrl}
          primaryColor={primaryColor}
          salonName={String(salon.name ?? '')}
          basePath={basePath}
        />
      </I18nProvider>
    );
  },
);
