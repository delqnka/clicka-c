'use client';

import { Check, ChevronDown, Loader2, Plus, User, X } from 'lucide-react';
import { formatDualEurText } from '@/lib/salon-currency';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n-react';
import {
  CLICKA_MARKETING_GRADIENT_BORDER_STYLE,
  CLICKA_MARKETING_GRADIENT_STYLE,
} from '@/lib/clicka-marketing-site';
import {
  getBookingRowIndex,
  getCatalogDisplayPriceDuration,
  isCatalogServiceSelected,
  type BookingCatalogService,
} from '@/lib/booking-modal-catalog';
import { serviceMatchesCategory, type ServiceCategoryTab } from '@/lib/salon-service-categories';
import { formatPolicySummary, type CancelPolicyAction } from '@/lib/cancellation-policy';
import { SalonServiceCategoryTabs } from '@/components/salon/service-category-tabs';
import { BookingSuccessView } from '@/components/salon/BookingSuccessView';

export type PublicStaffMember = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
};

export type BookingServiceOption = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  duration: number;
  variants?: { label: string; price: number; duration?: number }[];
};

type SalonBookingModalProps = {
  open: boolean;
  primaryColor: string;
  /** One row per service (same as public site). */
  serviceCatalog: BookingCatalogService[];
  /** Expanded rows for booking API (includes variant rows). */
  services: BookingServiceOption[];
  categoryTabs: ServiceCategoryTab[];
  selectedServiceIdxs: number[];
  selectedDate: string;
  selectedTime: string;
  totalDuration: number;
  totalPrice: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  smsReminderConsent: boolean;
  smsEnabled?: boolean;
  salonName: string;
  termsHref: string;
  privacyHref: string;
  minDate: string;
  maxDate: string;
  timeSlots: string[] | 'closed' | null;
  paymentType?: 'none' | 'deposit' | 'full';
  depositAmount?: number;
  cancelPolicyHours?: number;
  cancelPolicyAction?: CancelPolicyAction;
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
  bookingSuccessDetails?: { serviceName: string; dateLabel: string; time: string } | null;
  onClose: () => void;
  onToggleService: (idx: number) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onClientNameChange: (v: string) => void;
  onClientPhoneChange: (v: string) => void;
  onClientEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSmsReminderConsentChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** TEAM plan: pass all non-owner staff members. Empty = SOLO flow (no staff step). */
  staffMembers?: PublicStaffMember[];
  selectedStaffMemberId?: string | null;
  onStaffMemberChange?: (id: string) => void;
  /** Direct staff link: pre-filters catalog and skips staff step. */
  directStaffName?: string;
};

const cardShadow =
  'shadow-[0_2px_6px_rgba(0,0,0,0.14),0_10px_32px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.1)]';
const backButtonShadow =
  'shadow-[0_4px_14px_rgba(0,0,0,0.22),0_14px_40px_rgba(0,0,0,0.16),0_1px_0_rgba(0,0,0,0.06)]';
const gradientCtaShadow = 'shadow-[0_8px_28px_rgba(225,29,72,0.32)]';
const gradientRingShadow = 'shadow-[0_2px_10px_rgba(219,39,119,0.1)]';
const blackCtaShadow = 'shadow-[0_4px_14px_rgba(0,0,0,0.15)]';

const fieldClass =
  `mt-1.5 block w-full min-w-0 max-w-full box-border rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 text-[16px] leading-tight text-[#111] touch-manipulation ${cardShadow} outline-none transition focus:border-[color:var(--salon-primary)]/40 focus:ring-2 focus:ring-[color:var(--salon-primary)]/12`;

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const total = h * 60 + m + minutesToAdd;
  const outH = Math.floor(total / 60) % 24;
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

function ServiceDescription({ text }: { text?: string }) {
  const description = text?.trim();
  if (!description) return null;
  return (
    <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-black/50">{description}</p>
  );
}

export function SalonBookingModal({
  open,
  primaryColor,
  serviceCatalog,
  services,
  categoryTabs,
  selectedServiceIdxs,
  selectedDate,
  selectedTime,
  totalDuration,
  totalPrice,
  clientName,
  clientPhone,
  clientEmail,
  notes,
  smsReminderConsent,
  smsEnabled,
  salonName,
  termsHref,
  privacyHref,
  minDate,
  maxDate,
  timeSlots,
  paymentType = 'none',
  depositAmount,
  cancelPolicyHours,
  cancelPolicyAction,
  isSubmitting,
  bookingError,
  bookingSuccess,
  bookingSuccessDetails,
  onClose,
  onToggleService,
  onDateChange,
  onTimeChange,
  onClientNameChange,
  onClientPhoneChange,
  onClientEmailChange,
  onNotesChange,
  onSmsReminderConsentChange,
  onSubmit,
  staffMembers = [],
  selectedStaffMemberId,
  onStaffMemberChange,
  directStaffName,
}: SalonBookingModalProps) {
  const t = useT();

  // isTeam = TEAM salon with multiple staff members; direct = pre-selected staff link
  const isTeam = staffMembers.length > 0 && !directStaffName;
  // Steps: 1=service, 2=staff(team only), 3=datetime, 4=contact
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [browseAllServices, setBrowseAllServices] = useState(true);
  const [selectedVariantByServiceId, setSelectedVariantByServiceId] = useState<Record<string, string>>({});
  const [variantDropdownOpenForServiceId, setVariantDropdownOpenForServiceId] = useState<string | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedCategory(null);
    setVariantDropdownOpenForServiceId(null);
    const initial: Record<string, string> = {};
    for (const service of serviceCatalog) {
      const variants = service.variants ?? [];
      if (variants.length > 0) initial[service.id] = variants[0]!.label;
    }
    setSelectedVariantByServiceId(initial);
  }, [open, serviceCatalog]);

  // Compute which staff members can perform ALL currently selected services.
  const selectedServiceIds = useMemo(() => {
    return selectedServiceIdxs
      .map((idx) => services[idx]?.id)
      .filter((id): id is string => Boolean(id));
  }, [selectedServiceIdxs, services]);

  const eligibleStaff = useMemo(() => {
    if (!isTeam) return [];
    if (selectedServiceIds.length === 0) return staffMembers;
    return staffMembers.filter((sm) =>
      selectedServiceIds.every((sid) => sm.serviceIds.includes(sid)),
    );
  }, [isTeam, staffMembers, selectedServiceIds]);

  // Auto-select when exactly 1 eligible staff member.
  useEffect(() => {
    if (!isTeam || eligibleStaff.length !== 1) return;
    onStaffMemberChange?.(eligibleStaff[0]!.id);
  }, [isTeam, eligibleStaff, onStaffMemberChange]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setBrowseAllServices(selectedServiceIdxs.length === 0);
    }
    prevOpenRef.current = open;
  }, [open, selectedServiceIdxs.length]);

  useEffect(() => {
    if (selectedServiceIdxs.length === 0) {
      setBrowseAllServices(true);
    } else {
      setBrowseAllServices(false);
    }
  }, [selectedServiceIdxs.length]);

  const hasServices = selectedServiceIdxs.length > 0;
  const endTime = useMemo(
    () => (selectedTime ? addMinutesToTime(selectedTime, Math.max(5, totalDuration || 0)) : ''),
    [selectedTime, totalDuration]
  );
  const selectedServices = useMemo(
    () =>
      selectedServiceIdxs
        .map((idx) => services[idx])
        .filter((svc): svc is BookingServiceOption => Boolean(svc)),
    [selectedServiceIdxs, services]
  );
  const visibleCatalog = useMemo(
    () => serviceCatalog.filter((service) => serviceMatchesCategory(service, selectedCategory)),
    [serviceCatalog, selectedCategory],
  );

  useEffect(() => {
    if (!selectedCategory) return;
    const hasCategory = serviceCatalog.some((svc) => serviceMatchesCategory(svc, selectedCategory));
    if (!hasCategory) setSelectedCategory(null);
  }, [serviceCatalog, selectedCategory]);

  function toggleCatalogService(service: BookingCatalogService) {
    const variants = service.variants ?? [];
    const variantLabel = variants.length > 0 ? selectedVariantByServiceId[service.id] ?? variants[0]!.label : null;
    const idx = getBookingRowIndex(services, service.id, variantLabel);
    if (idx < 0) return;
    onToggleService(idx);
  }

  const dateOptions = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const out: { iso: string; weekday: string; day: string }[] = [];
    const start = new Date(`${minDate}T12:00:00`);
    const end = new Date(`${maxDate}T12:00:00`);
    const cursor = new Date(start);
    while (cursor <= end && out.length < 45) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      out.push({
        iso,
        weekday: cursor.toLocaleDateString('bg-BG', { weekday: 'short' }),
        day: cursor.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [minDate, maxDate]);

  function goToStep(target: 1 | 2 | 3 | 4) {
    if (isTeam) {
      if (target >= 2 && !hasServices) return;
      if (target >= 3 && !selectedStaffMemberId) return;
      if (target >= 4 && (!hasServices || !selectedTime)) return;
    } else {
      if (target >= 2 && !hasServices) return;  // step 2 = datetime for solo
      if (target >= 3 && (!hasServices || !selectedTime)) return;
    }
    setStep(target);
  }

  // Step label definitions differ between SOLO and TEAM.
  const stepLabels = isTeam
    ? [
        { n: 1 as const, label: t('booking.modal.stepService') },
        { n: 2 as const, label: t('booking.modal.stepSpecialist') },
        { n: 3 as const, label: t('booking.modal.stepTime') },
        { n: 4 as const, label: t('booking.modal.stepDetails') },
      ]
    : [
        { n: 1 as const, label: t('booking.modal.stepService') },
        { n: 2 as const, label: t('booking.modal.stepTime') },
        { n: 3 as const, label: t('booking.modal.stepDetails') },
      ];

  function requestClose() {
    if (typeof window !== 'undefined') {
      const shouldClose = window.confirm(t('booking.modal.confirmClose'));
      if (!shouldClose) return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    document.documentElement.style.setProperty('overflow', 'hidden');
    document.documentElement.style.setProperty('background-color', '#ffffff');
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('position', 'fixed');
    document.body.style.setProperty('inset', '0');
    document.body.style.setProperty('width', '100%');
    document.body.style.setProperty('background-color', '#ffffff');
    const scrollY = window.scrollY;
    document.body.style.setProperty('top', `-${scrollY}px`);
    return () => {
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('inset');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('top');
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-white sm:bg-transparent" role="presentation">
      <div className="absolute inset-0 hidden bg-black/30 backdrop-blur-sm sm:block" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label={t('booking.modal.ariaLabel')}
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem] sm:bg-white sm:shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/10 sm:hidden" aria-hidden />

        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-2 bg-white px-4 pb-3 pt-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-black">
              {directStaffName ? t('booking.modal.titleWithStaff', { name: directStaffName }) : t('booking.modal.titleDefault')}
            </h3>
            <div className="flex items-center gap-1.5">
              {stepLabels.map(({ n, label }) => {
                const active = step === n;
                const complete = step > n;
                const disabled = isTeam
                  ? (n >= 2 && !hasServices) || (n >= 3 && !selectedStaffMemberId) || (n >= 4 && (!hasServices || !selectedTime))
                  : (n >= 2 && !hasServices) || (n >= 3 && (!hasServices || !selectedTime));
                return (
                  <button
                    key={`header-step-${n}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => goToStep(n)}
                    className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2.5 text-[11px] font-bold transition disabled:opacity-20 ${
                      active || complete
                        ? `text-white ${gradientCtaShadow}`
                        : `bg-white text-black/50 ${cardShadow}`
                    }`}
                    style={active || complete ? CLICKA_MARKETING_GRADIENT_STYLE : undefined}
                    title={label}
                    aria-label={t('booking.modal.stepAria', { n, label })}
                  >
                    {complete && !active ? '✓' : n}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className={`shrink-0 rounded-full bg-white p-2 text-black/40 transition active:bg-black/[0.03] ${cardShadow}`}
            onClick={requestClose}
            aria-label={t('booking.modal.closeAria')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-[1] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 py-5 sm:px-5">
          {bookingSuccess ? (
            bookingSuccessDetails ? (
              <BookingSuccessView
                serviceName={bookingSuccessDetails.serviceName}
                dateLabel={bookingSuccessDetails.dateLabel}
                time={bookingSuccessDetails.time}
                salonName={salonName}
                onClose={onClose}
              />
            ) : (
              <p className="rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm leading-relaxed text-emerald-700">
                {bookingSuccess}
              </p>
            )
          ) : (
            <form id="salon-booking-form" onSubmit={onSubmit} className="min-w-0 space-y-3.5 bg-white">
              {step === 1 ? (
                <div className="space-y-3">
                  {hasServices && !browseAllServices ? (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-black">{t('booking.modal.selectedServices')}</p>
                        <p className="text-[12px] font-medium tabular-nums text-black/40">
                          {t(selectedServices.length === 1 ? 'booking.modal.serviceCountOne' : 'booking.modal.serviceCountMany', { count: selectedServices.length })}
                        </p>
                      </div>
                      {selectedServiceIdxs.map((idx) => {
                        const svc = services[idx];
                        if (!svc) return null;
                        return (
                          <div
                            key={`selected-${svc.id}-${idx}`}
                            className={`rounded-2xl p-px transition ${gradientRingShadow}`}
                            style={CLICKA_MARKETING_GRADIENT_BORDER_STYLE}
                          >
                            <div className="flex items-start justify-between gap-3 rounded-[15px] bg-white px-3.5 py-3.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[16px] font-semibold text-black">{svc.name}</p>
                                <ServiceDescription text={svc.description} />
                                <p className="mt-1 text-[13px] tabular-nums text-black/70">
                                  {svc.duration} {t('booking.modal.minSuffix')} · {formatDualEurText(Number(svc.price ?? 0).toFixed(2))}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleService(idx)}
                                className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black/60 transition active:bg-black/[0.04] ${cardShadow}`}
                                aria-label={t('booking.modal.removeAria')}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden />
                                {t('booking.modal.remove')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setBrowseAllServices(true)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white px-3.5 py-3 text-sm font-semibold text-black ${cardShadow}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        {t('booking.modal.addMoreServices')}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-black">{t('booking.modal.services')}</p>
                        <p className="text-[12px] font-medium tabular-nums text-black/40">
                          {t(visibleCatalog.length === 1 ? 'booking.modal.serviceCountOne' : 'booking.modal.serviceCountMany', { count: visibleCatalog.length })}
                        </p>
                      </div>

                      {hasServices ? (
                        <button
                          type="button"
                          onClick={() => setBrowseAllServices(false)}
                          className="text-[12px] font-semibold text-black underline underline-offset-2"
                        >
                          {t('booking.modal.hideList', { count: selectedServices.length })}
                        </button>
                      ) : null}

                      <SalonServiceCategoryTabs
                        categories={categoryTabs}
                        selectedId={selectedCategory}
                        onSelect={setSelectedCategory}
                        size="sm"
                        className="-mx-1 px-1"
                      />

                      {visibleCatalog.map((service) => {
                    const variants = service.variants ?? [];
                    const variantLabel =
                      variants.length > 0
                        ? selectedVariantByServiceId[service.id] ?? variants[0]!.label
                        : null;
                    const active = isCatalogServiceSelected(
                      selectedServiceIdxs,
                      services,
                      service,
                      variantLabel,
                    );
                    const { price, duration } = getCatalogDisplayPriceDuration(service, variantLabel);
                    return (
                      <div
                        key={service.id}
                        className={`rounded-2xl transition ${
                          active ? `p-px ${gradientRingShadow}` : `bg-white ${cardShadow}`
                        }`}
                        style={active ? CLICKA_MARKETING_GRADIENT_BORDER_STYLE : undefined}
                      >
                        <div
                          className={`flex items-start justify-between gap-3 ${
                            active ? 'rounded-[15px] bg-white px-3.5 py-3.5' : 'px-3.5 py-3.5'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-semibold text-black">{service.name}</p>
                            <ServiceDescription text={service.description} />
                            {variants.length > 0 ? (
                              <div className="relative mt-1.5 max-w-full">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariantDropdownOpenForServiceId((prev) =>
                                      prev === service.id ? null : service.id,
                                    )
                                  }
                                  className="flex w-full items-center justify-between rounded-full border border-black/12 bg-white px-3 py-1.5 text-left text-xs transition hover:border-black/25"
                                >
                                  <span className="truncate">{variantLabel}</span>
                                  <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-black/45" aria-hidden />
                                </button>
                                {variantDropdownOpenForServiceId === service.id ? (
                                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                                    {variants.map((variant) => (
                                      <button
                                        key={variant.label}
                                        type="button"
                                        onClick={() => {
                                          setSelectedVariantByServiceId((prev) => ({
                                            ...prev,
                                            [service.id]: variant.label,
                                          }));
                                          setVariantDropdownOpenForServiceId(null);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs hover:bg-black/[0.04] ${
                                          variantLabel === variant.label ? 'font-semibold text-black' : 'text-black/70'
                                        }`}
                                      >
                                        {variant.label} · {formatDualEurText(String(variant.price))}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            <p className="mt-1.5 text-[13px] tabular-nums text-black/45">
                              {duration} {t('booking.modal.minSuffix')} · {formatDualEurText(String(price))}
                            </p>
                          </div>
                          {active ? (
                            <button
                              type="button"
                              onClick={() => toggleCatalogService(service)}
                              className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-black/60 transition active:bg-black/[0.04] ${cardShadow}`}
                              aria-label={t('booking.modal.removeAria')}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                              {t('booking.modal.remove')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleCatalogService(service)}
                              className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-white transition ${gradientCtaShadow}`}
                              style={CLICKA_MARKETING_GRADIENT_STYLE}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                              {t('booking.modal.add')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {visibleCatalog.length === 0 ? (
                    <p className={`rounded-2xl bg-white px-3.5 py-3 text-sm text-black/40 ${cardShadow}`}>
                      {t('booking.modal.noServicesInCategory')}
                    </p>
                  ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {/* Staff selection step — TEAM only, step 2 */}
              {step === 2 && isTeam ? (
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-black">{t('booking.modal.selectSpecialist')}</p>
                  {selectedServiceIds.length > 0 && (
                    <p className="text-[12px] text-black/45">
                      {t('booking.modal.availableFor')}&nbsp;
                      <span className="font-medium text-black/70">
                        {selectedServiceIds
                          .map((sid) => serviceCatalog.find((s) => s.id === sid)?.name ?? sid)
                          .join(' + ')}
                      </span>
                    </p>
                  )}
                  {eligibleStaff.length === 0 ? (
                    <div className={`rounded-2xl bg-white px-4 py-5 text-center ${cardShadow}`}>
                      <p className="text-[14px] font-medium text-black/50">
                        {t('booking.modal.serviceUnavailable')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="mt-3 text-[13px] font-semibold text-[color:var(--salon-primary)] underline underline-offset-2"
                      >
                        {t('booking.modal.selectOtherService')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {eligibleStaff.map((sm) => {
                        const selected = selectedStaffMemberId === sm.id;
                        return (
                          <button
                            key={sm.id}
                            type="button"
                            onClick={() => onStaffMemberChange?.(sm.id)}
                            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition ${
                              selected
                                ? `p-px ${gradientRingShadow}`
                                : `bg-white ${cardShadow}`
                            }`}
                            style={selected ? CLICKA_MARKETING_GRADIENT_BORDER_STYLE : undefined}
                          >
                            {selected ? (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={CLICKA_MARKETING_GRADIENT_STYLE}>
                                <Check className="h-4 w-4" aria-hidden />
                              </div>
                            ) : (
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black/30 ${cardShadow}`}>
                                <User className="h-4 w-4" aria-hidden />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold text-black">{sm.name}</p>
                              {sm.bio && (
                                <p className="mt-0.5 truncate text-[12px] text-black/45">{sm.bio}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Date/time step — step 2 for SOLO/direct, step 3 for TEAM */}
              {((isTeam && step === 3) || (!isTeam && step === 2)) ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-black">
                      {selectedStaffMemberId
                        ? t('booking.modal.timeWithStaff', { name: staffMembers.find((s) => s.id === selectedStaffMemberId)?.name ?? '' })
                        : t('booking.modal.dateTime')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--salon-primary)] ${cardShadow} active:bg-black/[0.03]`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('booking.modal.addService')}
                    </button>
                  </div>

                  {hasServices ? (
                    <p className="text-[15px] font-semibold text-black">
                      {selectedServices.map((s) => s.name).join(' + ')}
                    </p>
                  ) : null}

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.date')}
                    </label>
                    <div className="-mx-1 mt-2 flex gap-2.5 overflow-x-auto px-1 pb-1.5 scrollbar-none">
                      {dateOptions.map((d) => {
                        const active = selectedDate === d.iso;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => onDateChange(d.iso)}
                            className={`flex h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl text-center transition ${
                              active
                                ? 'text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]'
                                : 'border border-black/[0.06] bg-white text-black/60 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]'
                            }`}
                            style={active ? { backgroundColor: '#000' } : undefined}
                          >
                            <span className="text-[10px] font-medium uppercase leading-none tabular-nums opacity-75">
                              {d.weekday}
                            </span>
                            <span className="mt-1 text-[12px] font-bold leading-tight tabular-nums">{d.day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.time')}
                    </label>
                    {!selectedDate ? (
                      <p className="mt-1.5 text-sm text-black/35">{t('booking.modal.selectDateFirst')}</p>
                    ) : timeSlots === 'closed' ? (
                      <p className="mt-1.5 text-sm text-black/35">{t('booking.modal.dayClosed')}</p>
                    ) : Array.isArray(timeSlots) && timeSlots.length === 0 ? (
                      <p className="mt-1.5 text-sm text-black/35">{t('booking.modal.noSlots')}</p>
                    ) : Array.isArray(timeSlots) ? (
                      <div className="mt-2 grid w-full max-w-full grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {timeSlots.map((t) => {
                          const active = selectedTime === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => onTimeChange(t)}
                              className={`min-w-0 touch-manipulation rounded-2xl px-2 py-3 text-center text-[14px] font-semibold tabular-nums transition ${
                                active
                                  ? 'text-white shadow-[0_4px_14px_rgba(0,0,0,0.22)]'
                                  : 'border border-black/[0.08] bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] active:bg-black/[0.03] active:shadow-[0_1px_2px_rgba(0,0,0,0.10)]'
                              }`}
                              style={active ? { backgroundColor: '#000' } : undefined}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm text-black/35">{t('booking.modal.selectServiceFirst')}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Contact step — step 3 for SOLO/direct, step 4 for TEAM */}
              {((isTeam && step === 4) || (!isTeam && step === 3)) ? (
                <div className="space-y-3.5">
                  <p className="text-[13px] font-semibold text-black">
                    {t('booking.modal.contactDetails')}
                  </p>
                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.name')}
                    </label>
                    <input
                      className={fieldClass}
                      value={clientName}
                      onChange={(e) => onClientNameChange(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.phone')}
                    </label>
                    <input
                      type="tel"
                      className={fieldClass}
                      value={clientPhone}
                      onChange={(e) => onClientPhoneChange(e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.email')}
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={fieldClass}
                      value={clientEmail}
                      onChange={(e) => onClientEmailChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      {t('booking.modal.notes')}
                    </label>
                    <textarea
                      className={`${fieldClass} resize-none`}
                      rows={2}
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                    />
                  </div>

                  {smsEnabled ? (
                    <>
                      <label className={`flex cursor-pointer gap-3 rounded-2xl bg-white px-3.5 py-3 ${cardShadow}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--salon-primary)]"
                          checked={smsReminderConsent}
                          onChange={(e) => onSmsReminderConsentChange(e.target.checked)}
                        />
                        <span className="text-sm leading-relaxed text-black/50">
                          {t('booking.modal.smsConsentPre')}{' '}
                          <strong className="font-semibold text-black">{salonName}</strong>{' '}
                          {t('booking.modal.smsConsentPost')}{' '}
                          <a
                            href={termsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[color:var(--salon-primary)] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('booking.modal.terms')}
                          </a>{' '}
                          {t('booking.modal.smsConsentAnd')}{' '}
                          <a
                            href={privacyHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[color:var(--salon-primary)] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('booking.modal.privacy')}
                          </a>
                          .
                        </span>
                      </label>
                      <p className="text-xs leading-relaxed text-black/30">
                        {t('booking.modal.smsConsentNote')}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}

              {bookingError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {bookingError}
                </p>
              ) : null}
            </form>
          )}
        </div>

        {!bookingSuccess && !bookingSuccessDetails ? (
          <div className="relative z-[2] shrink-0 border-t border-black/[0.06] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {hasServices ? (
              <div className="mb-3 px-1">
                <p className="text-[13px] tabular-nums text-black/50">
                  {t('booking.modal.totalDuration', { min: Math.max(0, totalDuration) })}
                </p>
                <p className="text-[17px] font-semibold tabular-nums text-black/70 leading-tight">
                  {t('booking.modal.totalPrice', { price: formatDualEurText(totalPrice.toFixed(2)) })}
                </p>
                {selectedTime ? (
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-black">
                    {t('booking.modal.startTime', { start: selectedTime, end: endTime })}
                  </p>
                ) : step > 1 ? (
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-black">
                    {selectedServices.map((s) => s.name).join(' + ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 3 && paymentType !== 'none' && (
              <div className="mb-2.5 space-y-1 text-center">
                <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#635BFF]">
                  <svg width="14" height="14" viewBox="0 0 60 60" fill="none" aria-hidden>
                    <rect width="60" height="60" rx="8" fill="#635BFF"/>
                    <path d="M27.5 22.5c0-1.7 1.4-2.4 3.6-2.4 3.2 0 7.3 1 10.4 2.7v-9.8c-3.5-1.4-7-2-10.4-2C23.1 11 18 15.2 18 22.9c0 12.1 16.6 10.2 16.6 15.4 0 2-1.7 2.7-4.1 2.7-3.5 0-8-1.5-11.5-3.5v9.9c3.9 1.7 7.9 2.4 11.5 2.4 8.8 0 14.8-4.3 14.8-12.2C45.3 25.4 27.5 27.6 27.5 22.5z" fill="white"/>
                  </svg>
                  {paymentType === 'deposit' && depositAmount && depositAmount > 0
                    ? <>{t('booking.modal.depositRequired')} <strong className="mx-0.5">{formatDualEurText(String(depositAmount))}</strong></>
                    : <>{t('booking.modal.paymentFrom')} <strong className="mx-0.5">{formatDualEurText(totalPrice.toFixed(2))}</strong></>
                  }
                </p>
                <p className="text-[11px] text-black/35">
                  {t('booking.modal.securePayment')} <span className="font-bold text-[#635BFF]">Stripe</span>
                </p>
                {cancelPolicyHours ? (
                  <p className="mx-auto max-w-[320px] text-[11px] leading-relaxed text-black/45">
                    {formatPolicySummary({
                      cancelPolicyHours,
                      cancelPolicyAction: cancelPolicyAction ?? 'keep_deposit',
                      depositAmountEuros: depositAmount,
                    })}
                  </p>
                ) : null}
              </div>
            )}
            {(() => {
              const maxStep = isTeam ? 4 : 3;
              const isLastStep = step === maxStep;
              const nextDisabled =
                (step === 1 && !hasServices) ||
                (isTeam && step === 2 && (!selectedStaffMemberId || eligibleStaff.length === 0)) ||
                (isTeam ? step === 3 : step === 2) && (!selectedDate || !selectedTime);
              return (
                <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
                    disabled={step === 1}
                    className="rounded-full border border-black/10 bg-white py-2.5 text-[14px] font-medium text-black/60 transition disabled:opacity-25 active:scale-[0.98]"
                  >
                    {t('booking.modal.back')}
                  </button>
                  {!isLastStep ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!nextDisabled) setStep((s) => (s < maxStep ? ((s + 1) as 1 | 2 | 3 | 4) : s));
                      }}
                      disabled={nextDisabled}
                      className={`rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                      style={CLICKA_MARKETING_GRADIENT_STYLE}
                    >
                      {t('booking.modal.continue')}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      form="salon-booking-form"
                      disabled={isSubmitting || !selectedTime || !hasServices}
                      className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                      style={CLICKA_MARKETING_GRADIENT_STYLE}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      {paymentType !== 'none' ? t('booking.modal.payAndBook') : t('booking.modal.sendRequest')}
                    </button>
                  )}
                </div>
                {isLastStep ? (
                  <p className="mt-2.5 text-center text-[10.5px] leading-snug text-black/35">
                    {t('booking.modal.disclaimerPre')}
                    {' '}{t('booking.modal.disclaimerAccept')}{' '}
                    <a href={termsHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {t('booking.modal.terms')}
                    </a>{' '}
                    {t('booking.modal.smsConsentAnd')}{' '}
                    <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {t('booking.modal.privacy')}
                    </a>
                    .
                  </p>
                ) : null}
              </>
              );
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
