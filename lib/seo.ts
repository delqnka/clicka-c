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

export function buildSalonJsonLd(salon: Record<string, unknown>, slug: string) {
  const name = String(salon.name ?? '');
  const category = String(salon.category ?? '');
  const city = String(salon.city ?? '');
  const address = String(salon.address ?? '');
  const phone = String(salon.phone ?? '');
  const email = String(salon.email ?? '');
  const about = String(salon.about ?? '');
  const coverImage = String(salon.cover_image_url ?? '');
  const logoImage = String(salon.logo_image_url ?? '');

  const url = getPrimaryPublicUrl({
    slug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });

  const schemaType = CATEGORY_SCHEMA_MAP[category] || 'BeautySalon';

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
  };

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
