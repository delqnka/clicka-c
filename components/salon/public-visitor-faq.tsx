'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SalonFaqItem, SalonVisitorInfo } from '@/lib/salon-visitor-info';
import { getPublicVisitorAmenityLines } from '@/lib/salon-visitor-info';
import {
  getPublicVenueExtraLines,
  mergeLegacyVisitorIntoVenueExtras,
  parseSalonVenueExtras,
  type PublicVenueExtraLine,
} from '@/lib/salon-venue-extras';

type PublicVisitorFaqProps = {
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
  venueExtrasRaw?: unknown;
};

export function PublicVisitorFaq({
  faqItems,
  visitorInfo,
  visitorAdditionalInfo,
  venueExtrasRaw,
}: PublicVisitorFaqProps) {
  const venueExtras = mergeLegacyVisitorIntoVenueExtras(
    parseSalonVenueExtras(venueExtrasRaw),
    visitorInfo,
  );
  const venueLines = getPublicVenueExtraLines(venueExtras);
  const legacyLines = getPublicVisitorAmenityLines(visitorInfo).filter(
    (line) => !line.label.toLowerCase().includes('плащане с карта'),
  );
  const amenityLines: PublicVenueExtraLine[] = [
    ...venueLines,
    ...legacyLines.filter((line) => !venueLines.some((v) => v.label.toLowerCase() === line.label.toLowerCase())),
  ].filter((line, index, arr) => {
    const key = line.label.toLowerCase();
    return arr.findIndex((x) => x.label.toLowerCase() === key) === index;
  });

  const [openFaqId, setOpenFaqId] = useState<string | null>(faqItems[0]?.id ?? null);

  if (amenityLines.length === 0 && !visitorAdditionalInfo && faqItems.length === 0) {
    return null;
  }

  return (
    <section className="pt-14">
      <div className="lg:grid lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-3 lg:pt-1">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-black/45">
            Практична информация
          </p>
          <h2 className="max-w-[12ch] text-balance text-[1.2rem] font-semibold tracking-[-0.03em] text-[#171717]">
            Често задавани въпроси
          </h2>
          <p className="max-w-[24ch] text-sm leading-relaxed text-[#5a5a5a]">
            Всичко важно за посещението, удобствата и подготовката преди тренировка.
          </p>
        </div>

        <div className="mt-6 min-w-0 max-w-3xl space-y-5 lg:mt-0">
          {amenityLines.length > 0 ? (
            <div className="rounded-[1.35rem] border border-black/8 bg-[#f7f7f5] p-5">
              <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-[#171717]">Удобства и достъп</h3>
              <ul className="mt-3 list-disc space-y-2 pl-4 marker:text-[#1a1a1a]">
                {amenityLines.map((line) => (
                  <li
                    key={`${line.label}-${line.detail ?? ''}`}
                    className="text-[0.95rem] leading-relaxed text-[#1a1a1a]"
                  >
                    <span style={line.color ? { color: line.color } : undefined}>{line.label}</span>
                    {line.detail ? <span className="mt-0.5 block text-black/60">{line.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {visitorAdditionalInfo ? (
            <div className="rounded-[1.35rem] border border-black/8 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-[#171717]">Допълнителна информация</h3>
              <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[#1a1a1a]/80">
                {visitorAdditionalInfo}
              </p>
            </div>
          ) : null}

          {faqItems.length > 0 ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-black/8 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
              {faqItems.map((item, index) => {
                const open = openFaqId === item.id;
                return (
                  <div key={item.id} className={index > 0 ? 'border-t border-black/8' : undefined}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[0.96rem] font-medium text-[#171717]"
                      aria-expanded={open}
                      onClick={() => setOpenFaqId(open ? null : item.id)}
                    >
                      <span className="max-w-[44ch] text-balance">{item.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-black/40 transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <p className="border-t border-black/5 px-5 pb-4 pt-0 text-[0.95rem] leading-relaxed text-black/65">
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
