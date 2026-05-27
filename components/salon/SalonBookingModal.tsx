'use client';

import { Loader2, X } from 'lucide-react';

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
  serviceIdx: number | '';
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  minDate: string;
  maxDate: string;
  timeSlots: string[] | 'closed' | null;
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
  onClose: () => void;
  onServiceChange: (idx: number | '') => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onClientNameChange: (v: string) => void;
  onClientPhoneChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const fieldClass =
  'mt-1.5 block w-full min-w-0 max-w-full box-border rounded-xl border border-black/15 bg-white px-3 py-3 text-base text-[#1a1a1a] outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10';

export function SalonBookingModal({
  open,
  primaryColor,
  services,
  serviceIdx,
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  notes,
  minDate,
  maxDate,
  timeSlots,
  isSubmitting,
  bookingError,
  bookingSuccess,
  onClose,
  onServiceChange,
  onDateChange,
  onTimeChange,
  onClientNameChange,
  onClientPhoneChange,
  onNotesChange,
  onSubmit,
}: SalonBookingModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] overflow-hidden"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div
        role="dialog"
        aria-modal
        aria-label="Резервация"
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-[min(92dvh,92vh)] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[1.25rem] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15 sm:hidden" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/8 px-4 py-3 sm:px-5">
          <h3 className="text-lg font-semibold text-[#1a1a1a]">Резервация</h3>
          <button
            type="button"
            className="shrink-0 rounded-full p-2 text-black/55 hover:bg-black/5"
            onClick={onClose}
            aria-label="Затвори"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {bookingSuccess ? (
            <p className="text-sm leading-relaxed text-[#1a1a1a]">{bookingSuccess}</p>
          ) : (
            <form onSubmit={onSubmit} className="min-w-0 space-y-4">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-black/55">Услуга</label>
                <select
                  className={`${fieldClass} truncate`}
                  value={serviceIdx === '' ? '' : String(serviceIdx)}
                  onChange={(e) =>
                    onServiceChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                >
                  <option value="">Изберете услуга</option>
                  {services.map((s, i) => (
                    <option key={s.id} value={i} title={s.name}>
                      {s.name}
                      {s.price != null ? ` — ${s.price} €` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-black/55">Дата</label>
                <input
                  type="date"
                  className={fieldClass}
                  min={minDate}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  required
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-black/55">Час</label>
                {!selectedDate ? (
                  <p className="mt-1.5 text-sm text-black/45">Първо изберете дата.</p>
                ) : timeSlots === 'closed' ? (
                  <p className="mt-1.5 text-sm text-black/45">В този ден салонът е затворен.</p>
                ) : Array.isArray(timeSlots) && timeSlots.length === 0 ? (
                  <p className="mt-1.5 text-sm text-black/45">Няма свободни часове.</p>
                ) : Array.isArray(timeSlots) ? (
                  <div className="mt-2 grid w-full max-w-full grid-cols-3 gap-2 sm:grid-cols-4">
                    {timeSlots.map((t) => {
                      const active = selectedTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onTimeChange(t)}
                          className={`min-w-0 touch-manipulation rounded-lg border px-1 py-2.5 text-center text-sm font-medium transition ${
                            active
                              ? 'border-[color:var(--salon-primary)] bg-[color:var(--salon-primary)]/12 text-[color:var(--salon-primary)]'
                              : 'border-black/15 bg-white text-[#1a1a1a] active:bg-black/5'
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

              <div className="min-w-0">
                <label className="block text-xs font-medium text-black/55">Име</label>
                <input
                  className={fieldClass}
                  value={clientName}
                  onChange={(e) => onClientNameChange(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-black/55">Телефон</label>
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
                <label className="block text-xs font-medium text-black/55">Бележки (по желание)</label>
                <textarea
                  className={`${fieldClass} resize-none`}
                  rows={2}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                />
              </div>

              {bookingError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {bookingError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !selectedTime}
                className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-full py-3.5 text-base font-semibold text-white disabled:opacity-50"
                style={{ background: primaryColor }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Изпрати заявка
              </button>
            </form>
          )}

          <button
            type="button"
            className="mt-4 w-full py-2 text-sm text-[color:var(--salon-primary)]"
            onClick={onClose}
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
