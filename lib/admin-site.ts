import { sql } from '@/lib/db';
import crypto from 'crypto';
import {
  normalizeSalonFaqItems,
  normalizeSalonVisitorInfo,
  normalizeVisitorAdditionalInfo,
  type SalonFaqItem,
  type SalonVisitorInfo,
} from '@/lib/salon-visitor-info';

export type WorkingDay = {
  open: string;
  close: string;
  closed: boolean;
};

export type WorkingHours = Record<string, WorkingDay>;

export type ServiceItem = {
  name: string;
  price: number;
  duration_min: number;
};

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

export type LegalInfoPayload = {
  companyName: string;
  eik: string;
  managerName: string;
  address: string;
  contactEmail: string;
};

export type AdminSitePayload = {
  slug: string;
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
  coverImageUrl: string;
  logoImageUrl: string;
  galleryImages: string[];
  ownerName: string;
  ownerPublicRole: string;
  ownerPublicPhotoUrl: string;
  services: ServiceItem[];
  workingHours: WorkingHours;
  customDomain: string;
  domainStatus: string;
  domainConfig: unknown;
  googlePlaceId: string;
  telegramChatId: string;
  onboardingCode: string;
  siteStatus: string;
  legalInfo: LegalInfoPayload | null;
  faqItems: SalonFaqItem[];
  visitorInfo: SalonVisitorInfo;
  visitorAdditionalInfo: string;
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

export function normalizeServices(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? '').trim();
      if (!name) return null;
      return {
        name,
        price: Math.max(0, Number(row.price ?? 0) || 0),
        duration_min: Math.max(5, Number(row.duration_min ?? row.duration ?? 30) || 30),
      };
    })
    .filter(Boolean) as ServiceItem[];
}

export function normalizeWorkingHours(raw: unknown): WorkingHours {
  const base = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS)) as WorkingHours;
  if (!raw || typeof raw !== 'object') return base;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const row = value as Record<string, unknown>;
    if (!base[key]) continue;
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

export async function loadAdminSiteDataBySlug(slug: string): Promise<AdminSitePayload | null> {
  const rows = await sql`
    SELECT
      slug, name, category, phone, email, city, address, about,
      instagram_username, facebook_username, tiktok_username, google_maps_url,
      cover_image_url, logo_image_url, gallery_images,
      owner_name, owner_public_role, owner_public_photo_url,
      services, working_hours,
      custom_domain, domain_status, domain_config,
      google_place_id, telegram_chat_id, onboarding_code,
      site_status, legal_info, latitude, longitude,
      faq_items, visitor_info, visitor_additional_info
    FROM salons
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;

  if (!row.onboarding_code) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await sql`UPDATE salons SET onboarding_code = ${code} WHERE slug = ${slug}`;
    row.onboarding_code = code;
  }

  return {
    slug: String(row.slug ?? ''),
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
    coverImageUrl: String(row.cover_image_url ?? ''),
    logoImageUrl: String(row.logo_image_url ?? ''),
    galleryImages: normalizeImageList(row.gallery_images),
    ownerName: String(row.owner_name ?? ''),
    ownerPublicRole: String(row.owner_public_role ?? ''),
    ownerPublicPhotoUrl: String(row.owner_public_photo_url ?? ''),
    services: normalizeServices(row.services),
    workingHours: normalizeWorkingHours(row.working_hours),
    customDomain: String(row.custom_domain ?? ''),
    domainStatus: String(row.domain_status ?? ''),
    domainConfig: row.domain_config ?? null,
    googlePlaceId: String(row.google_place_id ?? ''),
    telegramChatId: String(row.telegram_chat_id ?? ''),
    onboardingCode: String(row.onboarding_code ?? ''),
    siteStatus: String(row.site_status ?? ''),
    legalInfo: (() => {
      const li = row.legal_info as Record<string, unknown> | null | undefined;
      if (!li || typeof li !== 'object') return null;
      return {
        companyName:  String(li.companyName  ?? ''),
        eik:          String(li.eik          ?? ''),
        managerName:  String(li.managerName  ?? ''),
        address:      String(li.address      ?? ''),
        contactEmail: String(li.contactEmail ?? ''),
      };
    })(),
    faqItems: normalizeSalonFaqItems(row.faq_items),
    visitorInfo: normalizeSalonVisitorInfo(row.visitor_info),
    visitorAdditionalInfo: normalizeVisitorAdditionalInfo(row.visitor_additional_info),
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
