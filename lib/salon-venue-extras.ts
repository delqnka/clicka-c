export const SALON_VENUE_EXTRA_KEYS = [
  'instantConfirmation',
  'showers',
  'lockers',
  'bathTowels',
  'organicProductsOnly',
  'ecoFriendly',
  'lgbtqFriendly',
  'adultsOnly',
  'childFriendly',
  'nearMetro',
  'convenientTransport',
] as const;

export type SalonVenueExtraKey = (typeof SALON_VENUE_EXTRA_KEYS)[number];

export type SalonPaymentPreference = 'card_and_cash' | 'card_only' | 'cash_only';

export const SALON_VENUE_TRANSPORT_DETAIL_MAX = 400;

export const SALON_PARKING_KEYS = [
  'parkingBlueZone',
  'parkingGreenZone',
  'parkingNoZone',
  'parkingAvailable',
] as const;

export type SalonParkingKey = (typeof SALON_PARKING_KEYS)[number];

export const SALON_PARKING_LABELS_BG: Record<SalonParkingKey, string> = {
  parkingBlueZone: 'Синя зона',
  parkingGreenZone: 'Зелена зона',
  parkingNoZone: 'Няма зона',
  parkingAvailable: 'Наличен паркинг',
};

export const SALON_PARKING_PUBLIC_TEXT_COLOR: Partial<Record<SalonParkingKey, string>> = {
  parkingBlueZone: '#007AFF',
  parkingGreenZone: '#78C841',
};

export type SalonVenueExtras = Partial<Record<SalonVenueExtraKey, boolean>> &
  Partial<Record<SalonParkingKey, boolean>> & {
    paymentPreference?: SalonPaymentPreference;
    nearMetroDetails?: string;
    convenientTransportDetails?: string;
  };

export const SALON_VENUE_EXTRA_LABELS_BG: Record<SalonVenueExtraKey, string> = {
  instantConfirmation: 'Незабавно потвърждение',
  showers: 'Душове',
  lockers: 'Шкафчета',
  bathTowels: 'Кърпи за баня',
  organicProductsOnly: 'Само биологични продукти',
  ecoFriendly: 'Екологично чист',
  lgbtqFriendly: 'ЛГБТК+ приятелски',
  adultsOnly: 'Само за възрастни',
  childFriendly: 'Подходящо за деца',
  nearMetro: 'Близо до метро',
  convenientTransport: 'Удобен транспорт',
};

export const SALON_PAYMENT_LABELS_BG: Record<SalonPaymentPreference, string> = {
  card_and_cash: 'Карта и кеш',
  card_only: 'Само карта',
  cash_only: 'Само кеш',
};

export type LegacyParkingOption = 'none' | 'blue_zone' | 'green_zone' | 'available';

export function isLegacyParkingOption(v: unknown): v is LegacyParkingOption {
  return v === 'none' || v === 'blue_zone' || v === 'green_zone' || v === 'available';
}

export function parseSalonVenueExtras(raw: unknown): SalonVenueExtras {
  const out: SalonVenueExtras = {};
  let data: unknown = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t || t === '{}') return out;
    try {
      data = JSON.parse(t) as unknown;
    } catch {
      return out;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  const o = data as Record<string, unknown>;
  for (const k of SALON_VENUE_EXTRA_KEYS) {
    if (o[k] === true) (out as Record<string, boolean>)[k] = true;
  }
  let anyParkingKey = false;
  for (const k of SALON_PARKING_KEYS) {
    if (o[k] === true) {
      (out as Record<string, boolean>)[k] = true;
      anyParkingKey = true;
    }
  }
  if (!anyParkingKey) {
    const pk = o.parkingOption;
    if (isLegacyParkingOption(pk)) {
      if (pk === 'blue_zone') out.parkingBlueZone = true;
      else if (pk === 'green_zone') out.parkingGreenZone = true;
      else if (pk === 'available') out.parkingAvailable = true;
      else if (pk === 'none') out.parkingNoZone = true;
    } else if (o.parking === true) {
      out.parkingAvailable = true;
    }
  }
  const p = o.paymentPreference;
  if (p === 'card_only' || p === 'cash_only' || p === 'card_and_cash') {
    out.paymentPreference = p;
  }
  const nm = o.nearMetroDetails;
  if (typeof nm === 'string' && nm.trim()) {
    out.nearMetroDetails = nm.trim().slice(0, SALON_VENUE_TRANSPORT_DETAIL_MAX);
  }
  const ct = o.convenientTransportDetails;
  if (typeof ct === 'string' && ct.trim()) {
    out.convenientTransportDetails = ct.trim().slice(0, SALON_VENUE_TRANSPORT_DETAIL_MAX);
  }
  return out;
}

export function serializeSalonVenueExtras(ve: SalonVenueExtras): SalonVenueExtras {
  const out: SalonVenueExtras = {};
  for (const k of SALON_VENUE_EXTRA_KEYS) {
    if (ve[k] === true) (out as Record<string, boolean>)[k] = true;
  }
  for (const k of SALON_PARKING_KEYS) {
    if (ve[k] === true) (out as Record<string, boolean>)[k] = true;
  }
  if (ve.paymentPreference) out.paymentPreference = ve.paymentPreference;
  if (ve.nearMetroDetails?.trim()) {
    out.nearMetroDetails = ve.nearMetroDetails.trim().slice(0, SALON_VENUE_TRANSPORT_DETAIL_MAX);
  }
  if (ve.convenientTransportDetails?.trim()) {
    out.convenientTransportDetails = ve.convenientTransportDetails
      .trim()
      .slice(0, SALON_VENUE_TRANSPORT_DETAIL_MAX);
  }
  return out;
}

export type PublicVenueExtraLine = {
  label: string;
  detail?: string;
  color?: string;
};

/** Lines for public „Удобства и достъп“ from venue_extras. */
export function getPublicVenueExtraLines(ve: SalonVenueExtras): PublicVenueExtraLine[] {
  const lines: PublicVenueExtraLine[] = [];
  for (const k of SALON_VENUE_EXTRA_KEYS) {
    if (ve[k] !== true) continue;
    let detail: string | undefined;
    if (k === 'nearMetro' && ve.nearMetroDetails?.trim()) detail = ve.nearMetroDetails.trim();
    if (k === 'convenientTransport' && ve.convenientTransportDetails?.trim()) {
      detail = ve.convenientTransportDetails.trim();
    }
    lines.push({ label: SALON_VENUE_EXTRA_LABELS_BG[k], detail });
  }
  for (const k of SALON_PARKING_KEYS) {
    if (ve[k] !== true) continue;
    lines.push({
      label: SALON_PARKING_LABELS_BG[k],
      color: SALON_PARKING_PUBLIC_TEXT_COLOR[k],
    });
  }
  if (ve.paymentPreference) {
    lines.push({ label: SALON_PAYMENT_LABELS_BG[ve.paymentPreference] });
  }
  return lines;
}

/** Map legacy visitor_info checkboxes into venue_extras for admin + public display. */
export function mergeLegacyVisitorIntoVenueExtras(
  ve: SalonVenueExtras,
  visitor: {
    hasParking?: boolean;
    parkingNotes?: string;
    busLines?: string;
    acceptsCard?: boolean;
    hasMetroNearby?: boolean;
    suitableForChildren?: boolean;
  },
): SalonVenueExtras {
  const out: SalonVenueExtras = { ...ve };
  if (visitor.hasMetroNearby && !out.nearMetro) out.nearMetro = true;
  if (visitor.suitableForChildren && !out.childFriendly) out.childFriendly = true;
  if (visitor.acceptsCard && !out.paymentPreference) out.paymentPreference = 'card_and_cash';
  const hasParkingZone =
    out.parkingBlueZone || out.parkingGreenZone || out.parkingNoZone || out.parkingAvailable;
  if (visitor.hasParking && !hasParkingZone) out.parkingAvailable = true;
  if (visitor.parkingNotes?.trim() && !out.convenientTransportDetails) {
    if (!hasParkingZone && !out.parkingAvailable) out.parkingAvailable = true;
  }
  if (visitor.busLines?.trim()) {
    if (!out.convenientTransport) out.convenientTransport = true;
    if (!out.convenientTransportDetails?.trim()) {
      out.convenientTransportDetails = visitor.busLines.trim().slice(0, SALON_VENUE_TRANSPORT_DETAIL_MAX);
    }
  }
  return out;
}
