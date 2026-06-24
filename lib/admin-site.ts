import { sql } from '@/lib/db';
import crypto from 'crypto';
import {
  normalizeSalonFaqItems,
  normalizeSalonVisitorInfo,
  normalizeVisitorAdditionalInfo,
  type SalonFaqItem,
  type SalonVisitorInfo,
} from '@/lib/salon-visitor-info';
import {
  mergeLegacyVisitorIntoVenueExtras,
  parseSalonVenueExtras,
  type SalonVenueExtras,
} from '@/lib/salon-venue-extras';
import { normalizeBookingBlocks, type BookingBlock } from '@/lib/booking-blocks';
import { ensureAdminSiteSchema } from '@/lib/ensure-admin-site-schema';

export type WorkingDay = {
  open: string;
  close: string;
  closed: boolean;
};

export type WorkingHours = Record<string, WorkingDay>;

import { normalizeServices, type ServiceItem } from '@/lib/salon-services';
import type { Locale } from '@/lib/i18n';
import { resolveSalonLocale } from '@/lib/salon-locale';

export type { ServiceItem };
export { normalizeServices };

export type BookingRecord = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  service_price: number | null;
  service_duration: number | null;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AdminSitePayload = {
  slug: string;
  language: Locale;
  name: string;
  category: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  about: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  googleMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  ownerName: string;
  ownerPublicRole: string;
  ownerPublicPhotoUrl: string;
  ownerPublicBio: string;
  stripeConnected: boolean;
  services: ServiceItem[];
  workingHours: WorkingHours;
  bookingBlocks: BookingBlock[];
  bookingAdvanceDays: number;
  slotIntervalMin: number;
  customDomain: string;
  domainStatus: string;
  domainConfig: unknown;
  googlePlaceId: string;
  telegramChatId: string;
  onboardingCode: string;
  siteStatus: string;
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
  venueExtras: SalonVenueExtras;
  onboardingTourDone: boolean;
  ga4Id: string;
  metaPixelId: string;
  clarityId: string;
};

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

export function normalizeWorkingHours(raw: unknown): WorkingHours {
  const base = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS)) as WorkingHours;
  if (!raw || typeof raw !== 'object') return base;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!base[key]) continue;
    if (!value || typeof value !== 'object') {
      base[key] = { open: '', close: '', closed: true };
      continue;
    }
    const row = value as Record<string, unknown>;
    base[key] = {
      open: String(row.open ?? base[key].open ?? ''),
      close: String(row.close ?? base[key].close ?? ''),
      closed: row.closed === true,
    };
  }

  return base;
}

export function normalizeImageList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => String(item ?? '').trim())
    .filter(Boolean);
}

export type AdminImageFields = Pick<
  AdminSitePayload,
  'images' | 'ownerPublicPhotoUrl'
>;

export async function loadAdminImageFieldsBySlug(slug: string): Promise<AdminImageFields | null> {
  const rows = await sql`
    SELECT images, owner_public_photo_url
    FROM salons
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  return {
    images: normalizeImageList(row.images),
    ownerPublicPhotoUrl: String(row.owner_public_photo_url ?? ''),
  };
}

export async function loadAdminSiteDataBySlug(slug: string): Promise<AdminSitePayload | null> {
  await ensureAdminSiteSchema();
  const rows = await sql`
    SELECT
      slug, name, category, phone, email, city, address, about,
      language,
      instagram_username, facebook_username, tiktok_username, google_maps_url,
      images,
      owner_name, owner_public_role, owner_public_photo_url, owner_public_bio,
      services, working_hours, opening_hours,
      custom_domain, domain_status, domain_config,
      google_place_id, telegram_chat_id, onboarding_code, onboarding_tour_done,
      site_status, latitude, longitude,
      faq_items, visitor_info, visitor_additional_info, venue_extras,
      stripe_account_id, stripe_charges_enabled,
      ga4_id, meta_pixel_id, clarity_id
    FROM salons
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  const normalizedServices = normalizeServices(row.services);

  if (!row.onboarding_code) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await sql`UPDATE salons SET onboarding_code = ${code} WHERE slug = ${slug}`;
    row.onboarding_code = code;
  }

  return {
    slug: String(row.slug ?? ''),
    language: resolveSalonLocale(String(row.language ?? 'bg')),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    city: String(row.city ?? ''),
    address: String(row.address ?? ''),
    about: String(row.about ?? ''),
    instagram: String(row.instagram_username ?? ''),
    facebook: String(row.facebook_username ?? ''),
    tiktok: String(row.tiktok_username ?? ''),
    googleMapsUrl: String(row.google_maps_url ?? ''),
    latitude: row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
    longitude: row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
    images: normalizeImageList(row.images),
    ownerName: String(row.owner_name ?? ''),
    ownerPublicRole: String(row.owner_public_role ?? ''),
    ownerPublicPhotoUrl: String(row.owner_public_photo_url ?? ''),
    ownerPublicBio: String(row.owner_public_bio ?? ''),
    stripeConnected: !!row.stripe_account_id && !!row.stripe_charges_enabled,
    services: normalizedServices,
    workingHours: normalizeWorkingHours(row.working_hours),
    bookingBlocks: normalizeBookingBlocks(
      row.opening_hours && typeof row.opening_hours === 'object'
        ? (row.opening_hours as Record<string, unknown>).booking_blocks
        : null
    ),
    bookingAdvanceDays: (() => {
      const oh = row.opening_hours;
      if (oh && typeof oh === 'object') {
        const v = Number((oh as Record<string, unknown>).booking_advance_days);
        if (Number.isFinite(v) && v >= 1) return v;
      }
      return 60;
    })(),
    slotIntervalMin: (() => {
      const oh = row.opening_hours;
      if (oh && typeof oh === 'object') {
        const v = Number((oh as Record<string, unknown>).slot_interval_min);
        if ([15, 20, 30, 45, 60].includes(v)) return v;
      }
      return 30;
    })(),
    customDomain: String(row.custom_domain ?? ''),
    domainStatus: String(row.domain_status ?? ''),
    domainConfig: row.domain_config ?? null,
    googlePlaceId: String(row.google_place_id ?? ''),
    telegramChatId: String(row.telegram_chat_id ?? ''),
    onboardingCode: String(row.onboarding_code ?? ''),
    onboardingTourDone: row.onboarding_tour_done === true,
    siteStatus: String(row.site_status ?? ''),
    faqItems: normalizeSalonFaqItems(row.faq_items),
    visitorInfo: normalizeSalonVisitorInfo(row.visitor_info),
    visitorAdditionalInfo: normalizeVisitorAdditionalInfo(row.visitor_additional_info),
    venueExtras: mergeLegacyVisitorIntoVenueExtras(
      parseSalonVenueExtras(row.venue_extras),
      normalizeSalonVisitorInfo(row.visitor_info),
    ),
    ga4Id: String(row.ga4_id ?? ''),
    metaPixelId: String(row.meta_pixel_id ?? ''),
    clarityId: String(row.clarity_id ?? ''),
  };
}

export async function loadBookingsBySalonId(salonId: string, limit = 200): Promise<BookingRecord[]> {
  const rows = await sql`
    SELECT
      id, client_name, client_phone, client_email,
      service_name, service_price, service_duration,
      date, time, status, notes, created_at, completed_at
    FROM bookings
    WHERE salon_id = ${salonId}
    ORDER BY date DESC, time DESC
    LIMIT ${Math.min(Math.max(limit, 1), 200)}
  `;

  return rows as BookingRecord[];
}
