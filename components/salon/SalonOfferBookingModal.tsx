'use client';

import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SalonOfferRow } from '@/lib/salon-offers';
import { normalizeOfferImages, offerSpotsLeft } from '@/lib/salon-offers';

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
  smsReminderConsent: boolean;
  termsHref: string;
  privacyHref: string;
  minDate: string;
  maxDate: string;
  timeSlots: string[] | 'closed' | null;
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onClientNameChange: (v: string) => void;
  onClientPhoneChange: (v: string) => void;
  onClientEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSmsReminderConsentChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const fieldClass =
  'mt-1.5 block w-full min-w-0 max-w-full box-border rounded-2xl border border-white/60 bg-white/72 px-3.5 py-3 text-base text-[#111] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_26px_rgba(0,0,0,0.05)] outline-none backdrop-blur-md transition focus:border-white/80 focus:ring-2 focus:ring-white/55';

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
  smsReminderConsent,
  termsHref,
  privacyHref,
  minDate,
  maxDate,
  timeSlots,
  isSubmitting,
  bookingError,
  bookingSuccess,
  onClose,
  onDateChange,
  onTimeChange,
  onClientNameChange,
  onClientPhoneChange,
  onClientEmailChange,
  onNotesChange,
  onSmsReminderConsentChange,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [imageIdx, setImageIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(1);
      setImageIdx(0);
    }
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

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    document.documentElement.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('position', 'fixed');
    document.body.style.setProperty('inset', '0');
    document.body.style.setProperty('width', '100%');
    const scrollY = window.scrollY;
    document.body.style.setProperty('top', `-${scrollY}px`);
    return () => {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('inset');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('top');
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open || !offer) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden" role="presentation" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label={`Резервация: ${offer.title}`}
        className="absolute inset-x-2 bottom-2 z-10 mx-auto flex max-h-[calc(100dvh-0.75rem)] w-auto max-w-none flex-col overflow-hidden rounded-[1.4rem] border border-white/35 bg-[linear-gradient(160deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] shadow-[0_-16px_48px_rgba(8,14,30,0.28)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-white/45 bg-white/38 px-4 py-3.5 backdrop-blur-xl sm:px-5">
          <h3 className="text-lg font-semibold tracking-tight text-[#161616]">Оферта</h3>
          <button
            type="button"
            className="shrink-0 rounded-full border border-white/60 bg-white/55 p-2 text-black/55 shadow-sm transition hover:bg-white/75"
            onClick={onClose}
            aria-label="Затвори"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-[1] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-black text-white">
            {images.length > 0 ? (
              <div className="relative aspect-[16/10] w-full">
                <img
                  src={images[imageIdx]}
                  alt={offer.title}
                  className="h-full w-full object-cover"
                />
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5"
                      onClick={() => setImageIdx((i) => (i - 1 + images.length) % images.length)}
                      aria-label="Предишна снимка"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5"
                      onClick={() => setImageIdx((i) => (i + 1) % images.length)}
                      aria-label="Следваща снимка"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#5B21B6] to-[#9333EA]" />
            )}
            <div className="p-4">
              {offer.discount != null && offer.discount > 0 ? (
                <span className="inline-block rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
                  -{offer.discount}%
                </span>
              ) : null}
              <p className="mt-2 text-lg font-semibold leading-tight">{offer.title}</p>
              {offer.description ? (
                <p className="mt-1 text-sm text-white/85">{offer.description}</p>
              ) : null}
              {spotsLeft != null ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Остават {spotsLeft} {spotsLeft === 1 ? 'място' : 'места'}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={`flex-1 rounded-full border py-2 text-sm font-medium ${
                  step === n
                    ? 'border-[color:var(--salon-primary)] text-[color:var(--salon-primary)]'
                    : 'border-black/10 text-black/50'
                }`}
                style={{ ['--salon-primary' as string]: primaryColor }}
              >
                {n === 1 ? 'Дата и час' : 'Данни'}
              </button>
            ))}
          </div>

          <form className="mt-4" onSubmit={onSubmit}>
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-black/60">
                  Продължителност: <strong>{durationMin} мин</strong>
                  {salonName ? ` · ${salonName}` : ''}
                </p>
                <div>
                  <p className="text-sm font-medium text-[#161616]">Дата</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {dateOptions.map((d) => (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => onDateChange(d.iso)}
                        className={`shrink-0 rounded-2xl border px-3 py-2 text-left text-sm ${
                          selectedDate === d.iso
                            ? 'border-[color:var(--salon-primary)] bg-white'
                            : 'border-black/10 bg-white/70'
                        }`}
                        style={{ ['--salon-primary' as string]: primaryColor }}
                      >
                        <span className="block text-[10px] uppercase text-black/45">{d.weekday}</span>
                        <span className="font-semibold">{d.day}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedDate ? (
                  <div>
                    <p className="text-sm font-medium text-[#161616]">Час</p>
                    {timeSlots === 'closed' ? (
                      <p className="mt-2 text-sm text-red-600">Салонът не работи на тази дата.</p>
                    ) : timeSlots && timeSlots.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => onTimeChange(slot)}
                            className={`rounded-full border px-3 py-1.5 text-sm ${
                              selectedTime === slot
                                ? 'border-[color:var(--salon-primary)] font-semibold text-[color:var(--salon-primary)]'
                                : 'border-black/10'
                            }`}
                            style={{ ['--salon-primary' as string]: primaryColor }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-black/55">Няма свободни часове.</p>
                    )}
                  </div>
                ) : null}
                {selectedTime && endTime ? (
                  <p className="text-sm text-black/55">
                    Край: <strong>{endTime}</strong>
                  </p>
                ) : null}
                <button
                  type="button"
                  className="w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: primaryColor }}
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(2)}
                >
                  Напред
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#161616]">
                  Име
                  <input
                    className={fieldClass}
                    value={clientName}
                    onChange={(e) => onClientNameChange(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-[#161616]">
                  Телефон
                  <input
                    className={fieldClass}
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => onClientPhoneChange(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-[#161616]">
                  Имейл
                  <input
                    className={fieldClass}
                    type="email"
                    value={clientEmail}
                    onChange={(e) => onClientEmailChange(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-[#161616]">
                  Бележка (по избор)
                  <textarea
                    className={fieldClass}
                    rows={2}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                  />
                </label>
                <label className="flex items-start gap-2 text-sm text-black/65">
                  <input
                    type="checkbox"
                    checked={smsReminderConsent}
                    onChange={(e) => onSmsReminderConsentChange(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    SMS напомняне преди часа. Виж{' '}
                    <a href={termsHref} className="underline" target="_blank" rel="noreferrer">
                      условия
                    </a>{' '}
                    и{' '}
                    <a href={privacyHref} className="underline" target="_blank" rel="noreferrer">
                      поверителност
                    </a>
                    .
                  </span>
                </label>
                {bookingError ? <p className="text-sm text-red-600">{bookingError}</p> : null}
                {bookingSuccess ? <p className="text-sm text-green-700">{bookingSuccess}</p> : null}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-black/15 py-3 text-sm font-medium"
                    onClick={() => setStep(1)}
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: primaryColor }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Резервирай офертата
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
