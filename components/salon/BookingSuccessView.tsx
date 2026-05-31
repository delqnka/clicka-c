'use client';

import { useEffect, useState } from 'react';

type Props = {
  serviceName: string;
  dateLabel: string;
  time: string;
  salonName: string;
  onClose: () => void;
};

export function BookingSuccessView({
  serviceName,
  dateLabel,
  time,
  salonName,
  onClose,
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div
        className={`flex flex-col items-center transition-all duration-700 ease-out ${
          show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* Animated checkmark */}
        <div className="relative mb-6">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 ease-out ${
              show ? 'scale-100' : 'scale-50'
            }`}
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-10 w-10"
              aria-hidden
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={show ? 'animate-[draw_0.5s_ease-out_0.3s_forwards]' : ''}
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: show ? 0 : 24,
                  transition: 'stroke-dashoffset 0.5s ease-out 0.3s',
                }}
              />
            </svg>
          </div>
          <div
            className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
              show ? 'scale-150 opacity-0' : 'scale-100 opacity-30'
            }`}
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
            aria-hidden
          />
        </div>

        {/* Title */}
        <h3
          className={`text-center text-[22px] font-semibold leading-tight tracking-tight text-[#111] transition-all delay-200 duration-500 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          Резервацията е потвърдена
        </h3>

        {/* Subtitle */}
        <p
          className={`mt-2 text-center text-[15px] leading-relaxed text-black/45 transition-all delay-300 duration-500 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          Очакваме ви в <span className="font-medium text-black/60">{salonName}</span>
        </p>

        {/* Details card */}
        <div
          className={`mt-6 w-full max-w-[320px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all delay-[400ms] duration-500 ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-black/40" aria-hidden>
                  <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
                  <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 01-9.274 0C3.985 17.585 3 16.402 3 15.055z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-black/30">Услуга</p>
                <p className="mt-0.5 text-[14px] font-medium leading-snug text-[#111]">{serviceName}</p>
              </div>
            </div>

            <div className="h-px bg-black/[0.05]" />

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-black/40" aria-hidden>
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-black/30">Кога</p>
                <p className="mt-0.5 text-[14px] font-medium leading-snug text-[#111]">
                  {dateLabel}, {time} ч.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={`mt-8 w-full max-w-[320px] rounded-full bg-[#111] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all delay-500 duration-500 active:scale-[0.98] ${
            show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          Готово
        </button>
      </div>
    </div>
  );
}
