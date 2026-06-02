'use client';

import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { SalonServiceCategoryTabs } from '@/components/salon/service-category-tabs';
import { BookingSuccessView } from '@/components/salon/BookingSuccessView';

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
};

const cardShadow =
  'shadow-[0_2px_6px_rgba(0,0,0,0.14),0_10px_32px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.1)]';
const backButtonShadow =
  'shadow-[0_4px_14px_rgba(0,0,0,0.22),0_14px_40px_rgba(0,0,0,0.16),0_1px_0_rgba(0,0,0,0.06)]';
const gradientCtaShadow = 'shadow-[0_8px_28px_rgba(225,29,72,0.32)]';
const gradientRingShadow = 'shadow-[0_2px_10px_rgba(219,39,119,0.1)]';
const blackCtaShadow = 'shadow-[0_4px_14px_rgba(0,0,0,0.15)]';

const fieldClass =
  `mt-1.5 block w-full min-w-0 max-w-full box-border rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 text-[16px] leading-tight text-[#111] ${cardShadow} outline-none transition focus:border-[color:var(--salon-primary)]/40 focus:ring-2 focus:ring-[color:var(--salon-primary)]/12`;

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
}: SalonBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setBrowseAllServices(selectedServiceIdxs.length === 0);
    }
    prevOpenRef.current = open;
  }, [open, selectedServiceIdxs.length]);

  useEffect(() => {
    if (selectedServiceIdxs.length === 0) {
      setBrowseAllServices(true);
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

  function goToStep(target: 1 | 2 | 3) {
    if (target === 2 && !hasServices) return;
    if (target === 3 && (!hasServices || !selectedTime)) return;
    setStep(target);
  }

  function requestClose() {
    if (typeof window !== 'undefined') {
      const shouldClose = window.confirm('Сигурни ли сте, че искате да затворите резервацията?');
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
        aria-label="Резервация"
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem] sm:bg-white sm:shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/10 sm:hidden" aria-hidden />

        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-2 bg-white px-4 pb-3 pt-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-black">Резервация</h3>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { n: 1 as const, label: 'Услуги' },
                  { n: 2 as const, label: 'Дата' },
                  { n: 3 as const, label: 'Данни' },
                ] as const
              ).map(({ n, label }) => {
                const active = step === n;
                const complete = step > n;
                const disabled =
                  (n === 2 && !hasServices) || (n === 3 && (!hasServices || !selectedTime));
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
                    aria-label={`Стъпка ${n}: ${label}`}
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
            aria-label="Затвори"
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
                        <p className="text-[13px] font-semibold text-black">Избрани услуги</p>
                        <p className="text-[12px] font-medium tabular-nums text-black/40">
                          {selectedServices.length} {selectedServices.length === 1 ? 'услуга' : 'услуги'}
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
                                <p className="truncate text-[15px] font-semibold text-black">{svc.name}</p>
                                <ServiceDescription text={svc.description} />
                                <p className="mt-1 text-[13px] tabular-nums text-black/45">
                                  {svc.duration} мин · {Number(svc.price ?? 0).toFixed(2)} EUR
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleService(idx)}
                                className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-white transition ${gradientCtaShadow}`}
                                style={CLICKA_MARKETING_GRADIENT_STYLE}
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                Добавена
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
                        Добави още услуги
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-black">Услуги</p>
                        <p className="text-[12px] font-medium tabular-nums text-black/40">
                          {visibleCatalog.length} {visibleCatalog.length === 1 ? 'услуга' : 'услуги'}
                        </p>
                      </div>

                      {hasServices ? (
                        <button
                          type="button"
                          onClick={() => setBrowseAllServices(false)}
                          className="text-[12px] font-semibold text-black underline underline-offset-2"
                        >
                          Скрий списъка · {selectedServices.length} избрани
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
                            <p className="truncate text-[15px] font-semibold text-black">{service.name}</p>
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
                                        {variant.label} · {variant.price} €
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            <p className="mt-1.5 text-[13px] tabular-nums text-black/45">
                              {duration} мин · {price} EUR
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCatalogService(service)}
                            className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-white transition ${gradientCtaShadow}`}
                            style={CLICKA_MARKETING_GRADIENT_STYLE}
                          >
                            {active ? (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                Добавена
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" aria-hidden />
                                Добави
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {visibleCatalog.length === 0 ? (
                    <p className={`rounded-2xl bg-white px-3.5 py-3 text-sm text-black/40 ${cardShadow}`}>
                      Няма услуги в избраната категория.
                    </p>
                  ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-black">
                      Дата и час
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--salon-primary)] ${cardShadow} active:bg-black/[0.03]`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Добави услуга
                    </button>
                  </div>

                  {hasServices ? (
                    <p className="text-sm text-black/45">
                      {selectedServices.map((s) => s.name).join(' + ')}
                    </p>
                  ) : null}

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      Дата
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
                      Час
                    </label>
                    {!selectedDate ? (
                      <p className="mt-1.5 text-sm text-black/35">Първо изберете дата.</p>
                    ) : timeSlots === 'closed' ? (
                      <p className="mt-1.5 text-sm text-black/35">В този ден салонът е затворен.</p>
                    ) : Array.isArray(timeSlots) && timeSlots.length === 0 ? (
                      <p className="mt-1.5 text-sm text-black/35">Няма свободни часове за избраните услуги.</p>
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
                                  ? 'text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]'
                                  : 'border border-black/[0.06] bg-white text-black/70 shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] active:bg-black/[0.03] active:shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                              }`}
                              style={active ? { backgroundColor: '#000' } : undefined}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm text-black/35">Първо изберете услуга.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-3.5">
                  <p className="text-[13px] font-semibold text-black">
                    Данни за контакт
                  </p>
                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">
                      Име
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
                      Телефон
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
                      Имейл
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
                      Бележки (по желание)
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
                          Съгласявам се да получавам SMS напомняния за резервацията от{' '}
                          <strong className="font-semibold text-black">{salonName}</strong> на посочения
                          телефон. Прочетох{' '}
                          <a
                            href={termsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[color:var(--salon-primary)] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Общите условия
                          </a>{' '}
                          и{' '}
                          <a
                            href={privacyHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[color:var(--salon-primary)] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Политиката за поверителност
                          </a>
                          .
                        </span>
                      </label>
                      <p className="text-xs leading-relaxed text-black/30">
                        Без отметка резервацията ви остава валидна, но няма да получите SMS напомняние от салона.
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
              <div className="mb-3 rounded-2xl bg-white px-3.5 py-2.5">
                <p className="text-sm font-semibold tabular-nums text-black">
                  Общо: {Math.max(0, totalDuration)} мин · {totalPrice.toFixed(2)} EUR
                </p>
                {selectedTime ? (
                  <p className="mt-0.5 text-xs tabular-nums text-black/45">
                    Старт {selectedTime} · Готови около {endTime}
                  </p>
                ) : step > 1 ? (
                  <p className="mt-0.5 truncate text-xs text-black/35">
                    {selectedServices.map((s) => s.name).join(' + ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                disabled={step === 1}
                className={`rounded-full border border-black/[0.04] bg-white py-3.5 text-[15px] font-semibold text-black/75 transition disabled:opacity-25 active:scale-[0.98] active:shadow-[0_2px_8px_rgba(0,0,0,0.14)] ${backButtonShadow}`}
              >
                Назад
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !hasServices) return;
                    if (step === 2 && !selectedTime) return;
                    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
                  }}
                  disabled={
                    (step === 1 && !hasServices) ||
                    (step === 2 && (!selectedDate || !selectedTime))
                  }
                  className={`rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                  style={CLICKA_MARKETING_GRADIENT_STYLE}
                >
                  Продължи
                </button>
              ) : (
                <>
                  {paymentType !== 'none' && (
                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                      {paymentType === 'deposit' && depositAmount && depositAmount > 0 ? (
                        <>💳 Тази услуга изисква <strong>депозит от €{depositAmount}</strong>. Ще бъдеш пренасочена към Stripe за плащане.</>
                      ) : (
                        <>💳 Тази услуга изисква <strong>пълно плащане от €{totalPrice.toFixed(2)}</strong>. Ще бъдеш пренасочена към Stripe за плащане.</>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    form="salon-booking-form"
                    disabled={isSubmitting || !selectedTime || !hasServices}
                    className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                    style={CLICKA_MARKETING_GRADIENT_STYLE}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {paymentType !== 'none' ? 'Плати и резервирай' : 'Изпрати заявка'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
