export type SalonFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type SalonVisitorInfo = {
  hasParking: boolean;
  parkingNotes: string;
  busLines: string;
  acceptsCard: boolean;
  hasMetroNearby: boolean;
  suitableForChildren: boolean;
  singleUseConsumables: boolean;
  wheelchairAccessible: boolean;
};

export const DEFAULT_SALON_VISITOR_INFO: SalonVisitorInfo = {
  hasParking: false,
  parkingNotes: '',
  busLines: '',
  acceptsCard: false,
  hasMetroNearby: false,
  suitableForChildren: false,
  singleUseConsumables: false,
  wheelchairAccessible: false,
};

export const VISITOR_AMENITY_LABELS: {
  key: keyof Omit<SalonVisitorInfo, 'parkingNotes' | 'busLines'>;
  label: string;
}[] = [
  { key: 'hasParking', label: 'Има паркинг' },
  { key: 'acceptsCard', label: 'Плащане с карта' },
  { key: 'hasMetroNearby', label: 'Метро наблизо' },
  { key: 'suitableForChildren', label: 'Подходящо за деца' },
  { key: 'singleUseConsumables', label: 'Работа с еднократни консумативи' },
  { key: 'wheelchairAccessible', label: 'Достъпно за хора с увреждания' },
];

export function normalizeSalonFaqItems(raw: unknown): SalonFaqItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SalonFaqItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const question = String(row.question ?? '').trim();
    const answer = String(row.answer ?? '').trim();
    if (!question || !answer) continue;
    out.push({
      id: String(row.id ?? '').trim() || `faq-${out.length + 1}`,
      question,
      answer,
    });
  }
  return out.slice(0, 30);
}

export function normalizeSalonVisitorInfo(raw: unknown): SalonVisitorInfo {
  const base = { ...DEFAULT_SALON_VISITOR_INFO };
  if (!raw || typeof raw !== 'object') return base;
  const row = raw as Record<string, unknown>;
  return {
    hasParking: row.hasParking === true,
    parkingNotes: String(row.parkingNotes ?? '').trim(),
    busLines: String(row.busLines ?? '').trim(),
    acceptsCard: row.acceptsCard === true,
    hasMetroNearby: row.hasMetroNearby === true,
    suitableForChildren: row.suitableForChildren === true,
    singleUseConsumables: row.singleUseConsumables === true,
    wheelchairAccessible: row.wheelchairAccessible === true,
  };
}

export function normalizeVisitorAdditionalInfo(raw: unknown): string {
  return String(raw ?? '').trim();
}

/** Редове за публичния сайт — само попълнените. */
export function getPublicVisitorAmenityLines(info: SalonVisitorInfo): { label: string; detail?: string }[] {
  const lines: { label: string; detail?: string }[] = [];

  for (const { key, label } of VISITOR_AMENITY_LABELS) {
    if (info[key]) {
      if (key === 'hasParking' && info.parkingNotes) {
        lines.push({ label, detail: info.parkingNotes });
      } else {
        lines.push({ label });
      }
    }
  }

  if (info.busLines) {
    lines.push({ label: 'Автобуси', detail: info.busLines });
  }

  return lines;
}

export function hasPublicVisitorSection(
  info: SalonVisitorInfo,
  additionalInfo: string,
  faqItems: SalonFaqItem[],
): boolean {
  return (
    getPublicVisitorAmenityLines(info).length > 0 ||
    additionalInfo.length > 0 ||
    faqItems.length > 0
  );
}
