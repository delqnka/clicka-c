'use client';

import { Check, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type BookingServiceOption = {
  id: string;
  name: string;
  price?: number;
  duration: number;
};

type SalonBookingModalProps = {
  open: boolean;
  primaryColor: string;
  services: BookingServiceOption[];
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
  salonName: string;
  termsHref: string;
  privacyHref: string;
  minDate: string;
  maxDate: string;
  timeSlots: string[] | 'closed' | null;
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
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

const fieldClass =
  'mt-1.5 block w-full min-w-0 max-w-full box-border rounded-2xl border border-white/60 bg-white/72 px-3.5 py-3 text-base text-[#111] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_26px_rgba(0,0,0,0.05)] outline-none backdrop-blur-md transition focus:border-white/80 focus:ring-2 focus:ring-white/55';

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const total = h * 60 + m + minutesToAdd;
  const outH = Math.floor(total / 60) % 24;
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

export function SalonBookingModal({
  open,
  primaryColor,
  services,
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
  salonName,
  termsHref,
  privacyHref,
  minDate,
  maxDate,
  timeSlots,
  isSubmitting,
  bookingError,
  bookingSuccess,
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
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden" role="presentation" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0b1020]/45 backdrop-blur-[2px]" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label="Резервация"
        className="absolute inset-x-2 bottom-2 z-10 mx-auto flex max-h-[calc(100dvh-0.75rem)] w-auto max-w-none flex-col overflow-hidden rounded-[1.4rem] border border-white/35 bg-[linear-gradient(160deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] shadow-[0_-16px_48px_rgba(8,14,30,0.28)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.6rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_68%)]"
          aria-hidden
        />
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15 sm:hidden" aria-hidden />

        <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-white/45 bg-white/38 px-4 py-3.5 backdrop-blur-xl sm:px-5">
          <h3 className="text-lg font-semibold tracking-tight text-[#161616]">Резервация</h3>
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
          <div className="mb-3 flex flex-wrap gap-1.5">
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
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => goToStep(n)}
                  className={`inline-flex h-11 min-w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2 text-[10px] font-semibold leading-tight transition disabled:opacity-40 ${
                    active || complete
                      ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)] text-white'
                      : 'border-white/60 bg-white/70 text-black/55'
                  }`}
                >
                  <span className="text-[11px]">{complete && !active ? '✓' : n}</span>
                  <span className="mt-0.5 max-w-[4.5rem] truncate font-medium opacity-90">{label}</span>
                </button>
              );
            })}
          </div>

          {bookingSuccess ? (
            <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-3.5 py-3 text-sm leading-relaxed text-[#0f5132]">
              {bookingSuccess}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="min-w-0 space-y-3.5">
              {step === 1 ? (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
                      1/3 Услуги
                    </p>
                    <p className="mt-1 text-sm text-black/55">
                      Изберете една или повече услуги — докоснете всяка, за да я добавите.
                    </p>
                  </div>

                  {hasServices ? (
                    <div className="rounded-2xl border border-[color:var(--salon-primary)]/25 bg-[color:var(--salon-primary)]/8 px-3 py-2.5">
                      <p className="text-xs font-semibold text-[color:var(--salon-primary)]">
                        Избрани: {selectedServices.length}
                      </p>
                      <p className="mt-1 text-sm text-black/65 truncate">
                        {selectedServices.map((s) => s.name).join(' · ')}
                      </p>
                      <p className="mt-1.5 text-xs text-black/45">
                        За още услуга — докоснете ред от списъка по-долу.
                      </p>
                    </div>
                  ) : null}

                  {services.map((s, i) => {
                    const active = selectedServiceIdxs.includes(i);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onToggleService(i)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition ${
                          active
                            ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)]/12'
                            : 'border-white/60 bg-white/70'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold text-[#131313]">{s.name}</span>
                          <span className="mt-0.5 block text-sm text-black/55">
                            {s.duration} мин · {s.price ?? 0} EUR
                          </span>
                        </span>
                        <span
                          className={`ml-3 inline-flex shrink-0 items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-semibold ${
                            active
                              ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)] text-white'
                              : 'border-black/15 bg-white text-black/70'
                          }`}
                        >
                          {active ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Добавена
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Добави
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
                      2/3 Дата и час
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 rounded-xl border border-white/60 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-[color:var(--salon-primary)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Добави услуга
                    </button>
                  </div>

                  {hasServices ? (
                    <p className="text-sm text-black/55 truncate">
                      {selectedServices.map((s) => s.name).join(' + ')}
                    </p>
                  ) : null}

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
                      Дата
                    </label>
                    <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                      {dateOptions.map((d) => {
                        const active = selectedDate === d.iso;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => onDateChange(d.iso)}
                            className={`flex h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border text-center transition ${
                              active
                                ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)]/14 text-[color:var(--salon-primary)]'
                                : 'border-white/60 bg-white/75 text-black/70'
                            }`}
                          >
                            <span className="text-[10px] font-medium uppercase leading-none opacity-80">
                              {d.weekday}
                            </span>
                            <span className="mt-1 text-[12px] font-bold leading-tight">{d.day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
                      Час
                    </label>
                    {!selectedDate ? (
                      <p className="mt-1.5 text-sm text-black/45">Първо изберете дата.</p>
                    ) : timeSlots === 'closed' ? (
                      <p className="mt-1.5 text-sm text-black/45">В този ден салонът е затворен.</p>
                    ) : Array.isArray(timeSlots) && timeSlots.length === 0 ? (
                      <p className="mt-1.5 text-sm text-black/45">Няма свободни часове за избраните услуги.</p>
                    ) : Array.isArray(timeSlots) ? (
                      <div className="mt-2 grid w-full max-w-full grid-cols-3 gap-2 sm:grid-cols-4">
                        {timeSlots.map((t) => {
                          const active = selectedTime === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => onTimeChange(t)}
                              className={`min-w-0 touch-manipulation rounded-xl border px-1 py-2.5 text-center text-sm font-medium shadow-sm backdrop-blur-md transition ${
                                active
                                  ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)]/16 text-[color:var(--salon-primary)]'
                                  : 'border-white/60 bg-white/65 text-[#1a1a1a] active:bg-white/85'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm text-black/45">Първо изберете услуга.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
                    3/3 Данни за контакт
                  </p>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
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
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
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
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
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
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">
                      Бележки (по желание)
                    </label>
                    <textarea
                      className={`${fieldClass} resize-none`}
                      rows={2}
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                    />
                  </div>

                  <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/60 bg-white/70 px-3.5 py-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--salon-primary)]"
                      checked={smsReminderConsent}
                      onChange={(e) => onSmsReminderConsentChange(e.target.checked)}
                    />
                    <span className="text-sm leading-relaxed text-black/70">
                      Съгласявам се да получавам SMS напомняния за резервацията от{' '}
                      <strong className="font-semibold text-[#171717]">{salonName}</strong> на посочения
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
                  <p className="text-xs leading-relaxed text-black/45">
                    Без отметка резервацията ви остава валидна, но няма да получите SMS напомняние от салона.
                  </p>
                </div>
              ) : null}

              {hasServices ? (
                <div className="rounded-2xl border border-white/65 bg-white/60 px-3.5 py-3">
                  <p className="text-sm font-semibold text-[#171717]">
                    Общо: {Math.max(0, totalDuration)} мин · {totalPrice.toFixed(2)} EUR
                  </p>
                  {selectedTime ? (
                    <p className="mt-1 text-sm text-black/60">
                      Старт {selectedTime} · Готови около {endTime}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-black/45 truncate">
                    {selectedServices.map((s) => s.name).join(' + ')}
                  </p>
                </div>
              ) : null}

              {bookingError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {bookingError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                  disabled={step === 1}
                  className="rounded-full border border-white/60 bg-white/60 py-3 text-sm font-semibold text-black/65 disabled:opacity-40"
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
                    className="rounded-full border border-white/60 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 92%, white), color-mix(in srgb, ${primaryColor} 74%, #2b2b2b))`,
                    }}
                  >
                    Продължи
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedTime || !hasServices}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/60 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 92%, white), color-mix(in srgb, ${primaryColor} 74%, #2b2b2b))`,
                    }}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    Изпрати заявка
                  </button>
                )}
              </div>
            </form>
          )}

          <button
            type="button"
            className="mt-4 w-full rounded-2xl border border-white/60 bg-white/45 py-2.5 text-sm font-medium text-[color:var(--salon-primary)] shadow-sm"
            onClick={onClose}
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
