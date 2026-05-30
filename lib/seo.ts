import type { Metadata } from 'next';
import { getPrimaryPublicUrl } from '@/lib/domain-routing';
import { SALON_CURRENCY_CODE } from '@/lib/salon-currency';

const CATEGORY_SCHEMA_MAP: Record<string, string> = {
  'Фризьорски салон': 'HairSalon',
  'Барбър шоп': 'BarberShop',
  'Козметичен салон': 'BeautySalon',
  'Салон за красота': 'BeautySalon',
  'Маникюр': 'NailSalon',
  'СПА': 'DaySpa',
};

const META_DESC_MAX = 160;

function salonServiceNames(salon: Record<string, unknown>, limit = 3): string[] {
  const services = salon.services;
  if (!Array.isArray(services)) return [];
  return services
    .map((s) => (s && typeof s === 'object' ? String((s as Record<string, unknown>).name ?? '').trim() : ''))
    .filter(Boolean)
    .slice(0, limit);
}

/** `<title>` — e.g. „Urban by Delyana — Фризьорски салон във Варна“. */
export function buildSalonMetaTitle(salon: Record<string, unknown>): string {
  const name = String(salon.name ?? '').trim();
  const city = String(salon.city ?? '').trim();
  const category = String(salon.category ?? '').trim() || 'Салон';

  if (city) {
    const cityPrep = /^[aeiou]/i.test(city) ? 'във' : 'в';
    return name ? `${name} — ${category} ${cityPrep} ${city}` : `${category} ${cityPrep} ${city}`;
  }
  return name ? `${name} — ${category}` : category;
}

/** Meta description with local keywords when „За салона“ is empty or short. */
export function buildSalonMetaDescription(salon: Record<string, unknown>): string {
  const about = String(salon.about ?? '').trim();
  if (about.length >= 40) {
    return about.length > META_DESC_MAX ? `${about.slice(0, META_DESC_MAX - 1).trim()}…` : about;
  }

  const name = String(salon.name ?? '').trim();
  const city = String(salon.city ?? '').trim();
  const category = String(salon.category ?? '').trim() || 'Салон';
  const address = String(salon.address ?? '').trim();
  const serviceNames = salonServiceNames(salon, 3);

  const lead =
    category && city
      ? `${category} ${/^[aeiou]/i.test(city) ? 'във' : 'в'} ${city}`
      : category || city;

  const parts = [
    lead,
    name ? `— ${name}.` : '.',
    serviceNames.length > 0 ? `Услуги: ${serviceNames.join(', ')}.` : '',
    'Онлайн резервация на час.',
    address && city ? `Адрес: ${address}, ${city}.` : city ? `Локация: ${city}.` : '',
  ].filter(Boolean);

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > META_DESC_MAX ? `${text.slice(0, META_DESC_MAX - 1).trim()}…` : text;
}

/** Keywords for `<meta name="keywords">` — category + city combos Google may still use indirectly. */
export function buildSalonMetaKeywords(salon: Record<string, unknown>): string[] {
  const name = String(salon.name ?? '').trim();
  const city = String(salon.city ?? '').trim();
  const category = String(salon.category ?? '').trim();
  const serviceNames = salonServiceNames(salon, 5);

  const keywords = new Set<string>();
  if (category) keywords.add(category);
  if (city) keywords.add(city);
  if (category && city) {
    keywords.add(`${category} ${city}`);
    keywords.add(`${category.toLowerCase()} ${city.toLowerCase()}`);
  }
  if (name) keywords.add(name);
  for (const svc of serviceNames) keywords.add(svc);
  keywords.add('резервация');
  keywords.add('онлайн записване');

  return [...keywords].filter(Boolean);
}

export function buildSalonPageMetadata(
  salon: Record<string, unknown>,
  slug: string,
  options?: { notFound?: boolean },
): Metadata {
  if (options?.notFound) {
    return { title: 'Салонът не е намерен', robots: { index: false, follow: false } };
  }

  const title = buildSalonMetaTitle(salon);
  const description = buildSalonMetaDescription(salon);
  const keywords = buildSalonMetaKeywords(salon);
  const coverImage = String(salon.cover_image_url ?? '').trim();

  const canonicalUrl = getPrimaryPublicUrl({
    slug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });

  const siteName = String(salon.name ?? '').trim() || title;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      type: 'website',
      locale: 'bg_BG',
      ...(coverImage ? { images: [{ url: coverImage, width: 1200, height: 630, alt: siteName }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverImage ? { images: [coverImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export function buildSalonJsonLd(salon: Record<string, unknown>, slug: string) {
  const name = String(salon.name ?? '');
  const category = String(salon.category ?? '');
  const city = String(salon.city ?? '');
  const address = String(salon.address ?? '');
  const phone = String(salon.phone ?? '');
  const email = String(salon.email ?? '');
  const about = String(salon.about ?? '').trim() || buildSalonMetaDescription(salon);
  const coverImage = String(salon.cover_image_url ?? '');
  const logoImage = String(salon.logo_image_url ?? '');

  const url = getPrimaryPublicUrl({
    slug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });

  const schemaType = CATEGORY_SCHEMA_MAP[category] || 'BeautySalon';

  const lat = salon.latitude != null ? Number(salon.latitude) : NaN;
  const lng = salon.longitude != null ? Number(salon.longitude) : NaN;

  const hours = salon.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  const openingHours: string[] = [];
  if (hours && typeof hours === 'object') {
    const dayMap: Record<string, string> = {
      monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
      thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
    };
    for (const [day, val] of Object.entries(hours)) {
      if (val && !val.closed && val.open && val.close) {
        const abbr = dayMap[day];
        if (abbr) openingHours.push(`${abbr} ${val.open}-${val.close}`);
      }
    }
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name,
    url,
    ...(about ? { description: about } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(coverImage ? { image: coverImage } : {}),
    ...(logoImage ? { logo: logoImage } : {}),
    ...(openingHours.length > 0 ? { openingHours } : {}),
    ...(category ? { additionalType: category } : {}),
  };

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng,
    };
  }

  if (city || address) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(address ? { streetAddress: address } : {}),
      ...(city ? { addressLocality: city } : {}),
      addressCountry: 'BG',
    };
  }

  const services = salon.services;
  if (Array.isArray(services) && services.length > 0) {
    jsonLd.makesOffer = services
      .filter((s: Record<string, unknown>) => s && String(s.name ?? '').trim())
      .slice(0, 20)
      .map((s: Record<string, unknown>) => {
        const offer: Record<string, unknown> = {
          '@type': 'Offer',
          name: String(s.name ?? ''),
          ...(s.price != null ? { price: String(s.price), priceCurrency: SALON_CURRENCY_CODE } : {}),
        };
        return offer;
      });
  }

  return jsonLd;
}
