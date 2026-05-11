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
