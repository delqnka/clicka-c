'use client';

import { useState } from 'react';
import {
  Accessibility,
  Baby,
  Bus,
  ChevronDown,
  CreditCard,
  MapPin,
  Package,
  TrainFront,
} from 'lucide-react';
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

function amenityIcon(label: string) {
  if (label.includes('паркинг') || label.includes('Паркинг') || label.includes('зона')) return MapPin;
  if (label.includes('Автобус') || label.includes('транспорт')) return Bus;
  if (label.includes('карта') || label.includes('Карта') || label.includes('кеш')) return CreditCard;
  if (label.includes('Метро') || label.includes('метро')) return TrainFront;
  if (label.includes('деца')) return Baby;
  if (label.includes('консуматив')) return Package;
  if (label.includes('увреждания')) return Accessibility;
  return MapPin;
}

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
    <section className="space-y-8 pt-8">
      {amenityLines.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold text-[#1a1a1a]">Удобства и достъп</h3>
          <ul className="mt-3 space-y-2">
            {amenityLines.map((line) => {
              const Icon = amenityIcon(line.label);
              return (
                <li
                  key={`${line.label}-${line.detail ?? ''}`}
                  className="flex gap-3 rounded-xl border border-black/8 bg-[#fafafa] px-3 py-2.5 text-sm text-[#1a1a1a]"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-black/45" aria-hidden />
                  <span>
                    <span
                      className="font-medium"
                      style={line.color ? { color: line.color } : undefined}
                    >
                      {line.label}
                    </span>
                    {line.detail ? (
                      <span className="mt-0.5 block text-black/60">{line.detail}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {visitorAdditionalInfo ? (
        <div>
          <h3 className="text-base font-semibold text-[#1a1a1a]">Допълнителна информация</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1a1a1a]/85">
            {visitorAdditionalInfo}
          </p>
        </div>
      ) : null}

      {faqItems.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold text-[#1a1a1a]">Често задавани въпроси</h3>
          <div className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
            {faqItems.map((item) => {
              const open = openFaqId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-[#1a1a1a]"
                    aria-expanded={open}
                    onClick={() => setOpenFaqId(open ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-black/40 transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {open ? (
                    <p className="border-t border-black/5 px-4 pb-3 pt-0 text-sm leading-relaxed text-black/65">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
