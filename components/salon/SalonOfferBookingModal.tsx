'use client';

import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CLICKA_MARKETING_GRADIENT_BORDER_STYLE,
  CLICKA_MARKETING_GRADIENT_STYLE,
} from '@/lib/clicka-marketing-site';
import type { SalonOfferRow } from '@/lib/salon-offers';
import { normalizeOfferImages, offerSpotsLeft } from '@/lib/salon-offers';
import { BookingSuccessView } from '@/components/salon/BookingSuccessView';

type Props = {
  open: boolean;
  offer: SalonOfferRow | null;
  primaryColor: string;
  salonName: string;
  selectedDate: string;
  selectedTime: string;
  durationMin: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  termsHref: string;
  privacyHref: string;
  minDate: string;
  maxDate: string;
  timeSlots: string[] | 'closed' | null;
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
  bookingSuccessDetails?: { serviceName: string; dateLabel: string; time: string; quantity?: number; totalPrice?: number } | null;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onClientNameChange: (v: string) => void;
  onClientPhoneChange: (v: string) => void;
  onClientEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const cardShadow =
  'shadow-[0_2px_6px_rgba(0,0,0,0.14),0_10px_32px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.1)]';
const backButtonShadow =
  'shadow-[0_4px_14px_rgba(0,0,0,0.22),0_14px_40px_rgba(0,0,0,0.16),0_1px_0_rgba(0,0,0,0.06)]';
const gradientCtaShadow = 'shadow-[0_8px_28px_rgba(225,29,72,0.32)]';
const gradientRingShadow = 'shadow-[0_2px_10px_rgba(219,39,119,0.1)]';

const fieldClass =
  `mt-1.5 block w-full min-w-0 max-w-full box-border rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 text-[16px] leading-tight text-[#111] ${cardShadow} outline-none transition focus:border-[color:var(--salon-primary)]/40 focus:ring-2 focus:ring-[color:var(--salon-primary)]/12`;

function wireMediaUri(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return s;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const total = h * 60 + m + minutesToAdd;
  const outH = Math.floor(total / 60) % 24;
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

export function SalonOfferBookingModal({
  open,
  offer,
  primaryColor,
  salonName,
  selectedDate,
  selectedTime,
  durationMin,
  clientName,
  clientPhone,
  clientEmail,
  notes,
  termsHref,
  privacyHref,
  minDate,
  maxDate,
  timeSlots,
  isSubmitting,
  bookingError,
  bookingSuccess,
  bookingSuccessDetails,
  onClose,
  onDateChange,
  onTimeChange,
  onClientNameChange,
  onClientPhoneChange,
  onClientEmailChange,
  onNotesChange,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageIdx, setImageIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setImageIdx(0);
  }, [open, offer?.id]);

  const images = useMemo(() => normalizeOfferImages(offer?.images).map(wireMediaUri), [offer?.images]);
  const spotsLeft = offer ? offerSpotsLeft(offer) : null;
  const endTime = useMemo(
    () => (selectedTime ? addMinutesToTime(selectedTime, Math.max(5, durationMin || 60)) : ''),
    [selectedTime, durationMin],
  );

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
    if (target === 2 && !offer) return;
    if (target === 3 && (!offer || !selectedTime)) return;
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

  if (!open || !offer) return null;

  const discount =
    offer.discount != null && Number.isFinite(Number(offer.discount)) && Number(offer.discount) > 0
      ? Number(offer.discount)
      : null;

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-white sm:bg-transparent" role="presentation">
      <div className="absolute inset-0 hidden bg-black/30 backdrop-blur-sm sm:block" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label={`Резервация: ${offer.title}`}
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem] sm:bg-white sm:shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--salon-primary' as string]: primaryColor }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/10 sm:hidden" aria-hidden />

        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-2 bg-white px-4 pb-3 pt-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-black">Резервация</h3>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { n: 1 as const, label: 'Оферта' },
                  { n: 2 as const, label: 'Дата' },
                  { n: 3 as const, label: 'Данни' },
                ] as const
              ).map(({ n, label }) => {
                const active = step === n;
                const complete = step > n;
                const disabled = (n === 2 && !offer) || (n === 3 && (!offer || !selectedTime));
                return (
                  <button
                    key={`offer-header-step-${n}`}
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
                quantity={bookingSuccessDetails.quantity}
                totalPriceLabel={
                  typeof bookingSuccessDetails.totalPrice === 'number'
                    ? `${bookingSuccessDetails.totalPrice} €`
                    : undefined
                }
                salonName={salonName}
                onClose={onClose}
              />
            ) : (
              <p className="rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm leading-relaxed text-emerald-700">
                {bookingSuccess}
              </p>
            )
          ) : (
            <form id="salon-offer-booking-form" onSubmit={onSubmit} className="min-w-0 space-y-3.5 bg-white">
              {step === 1 ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-black">Избрана оферта</p>
                    {spotsLeft != null ? (
                      <p className="text-[12px] font-medium tabular-nums text-amber-700">
                        {spotsLeft} {spotsLeft === 1 ? 'място' : 'места'}
                      </p>
                    ) : null}
                  </div>

                  <div className={`rounded-2xl p-px transition ${gradientRingShadow}`} style={CLICKA_MARKETING_GRADIENT_BORDER_STYLE}>
                    <div className="overflow-hidden rounded-[15px] bg-white">
                      {images.length > 0 ? (
                        <div className="relative aspect-[16/10] w-full bg-black/5">
                          <img
                            src={images[imageIdx]}
                            alt={offer.title}
                            className="h-full w-full object-cover"
                          />
                          {images.length > 1 ? (
                            <>
                              <button
                                type="button"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
                                onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                                aria-label="Предишна снимка"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
                                onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                                aria-label="Следваща снимка"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="px-3.5 py-3.5">
                        {discount != null ? (
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                            style={CLICKA_MARKETING_GRADIENT_STYLE}
                          >
                            -{discount}%
                          </span>
                        ) : null}
                        <p className="mt-1 truncate text-[15px] font-semibold text-black">{offer.title}</p>
                        {offer.description ? (
                          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-black/50">
                            {offer.description}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[13px] tabular-nums text-black/45">
                          {Math.max(5, durationMin || 60)} мин
                          {salonName ? ` · ${salonName}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-black">Дата и час</p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--salon-primary)] ${cardShadow} active:bg-black/[0.03]`}
                    >
                      {offer.title}
                    </button>
                  </div>

                  {offer.title ? (
                    <p className="text-sm text-black/45">
                      {offer.title}
                    </p>
                  ) : null}

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">Дата</label>
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
                    <label className="block text-[13px] font-semibold text-black">Час</label>
                    {!selectedDate ? (
                      <p className="mt-1.5 text-sm text-black/35">Първо изберете дата.</p>
                    ) : timeSlots === 'closed' ? (
                      <p className="mt-1.5 text-sm text-black/35">В този ден салонът е затворен.</p>
                    ) : Array.isArray(timeSlots) && timeSlots.length === 0 ? (
                      <p className="mt-1.5 text-sm text-black/35">Няма свободни часове за тази оферта.</p>
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
                      <p className="mt-1.5 text-sm text-black/35">Зареждане на часове…</p>
                    )}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-3.5">
                  <p className="text-[13px] font-semibold text-black">Данни за контакт</p>
                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">Име</label>
                    <input
                      className={fieldClass}
                      value={clientName}
                      onChange={(e) => onClientNameChange(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[13px] font-semibold text-black">Телефон</label>
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
                    <label className="block text-[13px] font-semibold text-black">Имейл</label>
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
                    <label className="block text-[13px] font-semibold text-black">Бележки (по желание)</label>
                    <textarea
                      className={`${fieldClass} resize-none`}
                      rows={2}
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                    />
                  </div>

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
            <div className="mb-3 rounded-2xl bg-white px-3.5 py-2.5">
              <p className="text-sm font-semibold tabular-nums text-black">
                Общо: {Math.max(5, durationMin || 60)} мин
                {discount != null ? ` · -${discount}%` : ''}
              </p>
              {selectedTime ? (
                <p className="mt-0.5 text-xs tabular-nums text-black/45">
                  Старт {selectedTime} · Готови около {endTime}
                </p>
              ) : step > 1 ? (
                <p className="mt-0.5 truncate text-xs text-black/35">{offer.title}</p>
              ) : null}
            </div>

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
                    if (step === 1 && !offer) return;
                    if (step === 2 && !selectedTime) return;
                    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
                  }}
                  disabled={step === 2 && (!selectedDate || !selectedTime)}
                  className={`rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                  style={CLICKA_MARKETING_GRADIENT_STYLE}
                >
                  Продължи
                </button>
              ) : (
                <button
                  type="submit"
                  form="salon-offer-booking-form"
                  disabled={isSubmitting || !selectedTime || !offer}
                  className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40 ${gradientCtaShadow}`}
                  style={CLICKA_MARKETING_GRADIENT_STYLE}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Изпрати заявка
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
