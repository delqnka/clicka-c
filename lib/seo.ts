import type { Metadata } from 'next';
import { getPrimaryPublicUrl } from '@/lib/domain-routing';
import { SALON_CURRENCY_CODE } from '@/lib/salon-currency';
import type { PublicSalonBlogPost } from '@/lib/salon-blog';
import { resolveBlogSectionTitle } from '@/lib/salon-blog-shared';
import {
  BLOG_META_DESC_MAX,
  suggestBlogMetaDescription,
  truncateMetaText,
} from '@/lib/blog-seo-meta';

const CATEGORY_SCHEMA_MAP: Record<string, string> = {
  'Фризьорски салон': 'HairSalon',
  'Барбър шоп': 'BarberShop',
  'Козметичен салон': 'BeautySalon',
  'Салон за красота': 'BeautySalon',
  'Маникюр': 'NailSalon',
  'СПА': 'DaySpa',
};

const META_DESC_MAX = BLOG_META_DESC_MAX;

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
    icons: {
      icon: '/icon.svg',
      apple: '/icon.svg',
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

function salonPublicBaseUrl(salon: Record<string, unknown>, slug: string): string {
  return getPrimaryPublicUrl({
    slug,
    customDomain: String(salon.custom_domain ?? ''),
    domainStatus: String(salon.domain_status ?? ''),
  });
}

function blogPostPublicUrl(salon: Record<string, unknown>, slug: string, postSlug: string): string {
  return `${salonPublicBaseUrl(salon, slug)}/blog/${encodeURIComponent(postSlug)}`;
}

function blogPostDescription(post: PublicSalonBlogPost): string {
  const custom = post.metaDescription.trim();
  if (custom) {
    return truncateMetaText(custom, META_DESC_MAX);
  }
  return suggestBlogMetaDescription(post.excerpt, post.bodyMarkdown);
}

export function buildBlogIndexMetadata(
  salon: Record<string, unknown>,
  slug: string,
): Metadata {
  const salonName = String(salon.name ?? '').trim() || 'Салон';
  const city = String(salon.city ?? '').trim();
  const sectionTitle = resolveBlogSectionTitle(salon.blog_title);
  const title = city
    ? `${sectionTitle} — ${salonName}, ${city}`
    : `${sectionTitle} — ${salonName}`;
  const description = city
    ? `${sectionTitle} от ${salonName} в ${city}. Полезна информация за грижа и услуги.`
    : `${sectionTitle} от ${salonName}. Полезна информация за грижа и услуги.`;
  const canonicalUrl = `${salonPublicBaseUrl(salon, slug)}/blog`;
  const coverImage = String(salon.cover_image_url ?? '').trim();

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: salonName,
      type: 'website',
      locale: 'bg_BG',
      ...(coverImage ? { images: [{ url: coverImage, width: 1200, height: 630, alt: salonName }] } : {}),
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

export function buildBlogPostMetadata(
  post: PublicSalonBlogPost,
  salon: Record<string, unknown>,
  slug: string,
): Metadata {
  const salonName = String(salon.name ?? '').trim() || 'Салон';
  const title = post.metaTitle.trim() || post.title.trim() || 'Статия';
  const fullTitle = title.includes(salonName) ? title : `${title} — ${salonName}`;
  const description = blogPostDescription(post);
  const canonicalUrl = blogPostPublicUrl(salon, slug, post.slug);
  const coverImage = post.coverImageUrl.trim() || String(salon.cover_image_url ?? '').trim();
  const keywords = blogPostKeywords(post, salon);

  return {
    title: fullTitle,
    description,
    keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: salonName,
      type: 'article',
      locale: 'bg_BG',
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      ...(coverImage
        ? { images: [{ url: coverImage, width: 1200, height: 630, alt: title }] }
        : {}),
      section: resolveBlogSectionTitle(salon.blog_title),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      ...(coverImage ? { images: [coverImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

function blogPostKeywords(
  post: PublicSalonBlogPost,
  salon: Record<string, unknown>,
): string[] {
  const city = String(salon.city ?? '').trim();
  const category = String(salon.category ?? '').trim();
  const keywords = new Set<string>();
  if (post.title.trim()) keywords.add(post.title.trim());
  if (city) keywords.add(city);
  if (category) keywords.add(category);
  if (category && city) keywords.add(`${category} ${city}`);
  for (const word of post.title.split(/\s+/).filter((w) => w.length > 3).slice(0, 4)) {
    keywords.add(word);
  }
  return [...keywords].slice(0, 12);
}

export function buildBlogBreadcrumbJsonLd(
  post: PublicSalonBlogPost,
  salon: Record<string, unknown>,
  slug: string,
) {
  const salonName = String(salon.name ?? '').trim() || 'Салон';
  const homeUrl = salonPublicBaseUrl(salon, slug);
  const blogUrl = `${homeUrl}/blog`;
  const postUrl = blogPostPublicUrl(salon, slug, post.slug);
  const sectionTitle = resolveBlogSectionTitle(salon.blog_title);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: salonName, item: homeUrl },
      { '@type': 'ListItem', position: 2, name: sectionTitle, item: blogUrl },
      { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
    ],
  };
}

export function buildBlogIndexJsonLd(
  salon: Record<string, unknown>,
  slug: string,
  posts: PublicSalonBlogPost[],
) {
  const salonName = String(salon.name ?? '').trim() || 'Салон';
  const blogUrl = `${salonPublicBaseUrl(salon, slug)}/blog`;
  const sectionTitle = resolveBlogSectionTitle(salon.blog_title);

  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${sectionTitle} — ${salonName}`,
    url: blogUrl,
    inLanguage: 'bg-BG',
    publisher: {
      '@type': 'Organization',
      name: salonName,
    },
    blogPost: posts.slice(0, 20).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: blogPostPublicUrl(salon, slug, post.slug),
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    })),
  };
}

export function buildBlogPostingJsonLd(
  post: PublicSalonBlogPost,
  salon: Record<string, unknown>,
  slug: string,
) {
  const salonName = String(salon.name ?? '').trim() || 'Салон';
  const city = String(salon.city ?? '').trim();
  const url = blogPostPublicUrl(salon, slug, post.slug);
  const blogUrl = `${salonPublicBaseUrl(salon, slug)}/blog`;
  const description = blogPostDescription(post);
  const coverImage = post.coverImageUrl.trim() || String(salon.cover_image_url ?? '').trim();
  const logoImage = String(salon.logo_image_url ?? '').trim();
  const sectionTitle = resolveBlogSectionTitle(salon.blog_title);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(description ? { description } : {}),
    url,
    inLanguage: 'bg-BG',
    ...(city ? { contentLocation: { '@type': 'Place', name: city } } : {}),
    isPartOf: {
      '@type': 'Blog',
      name: `${sectionTitle} — ${salonName}`,
      url: blogUrl,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    ...(coverImage
      ? { image: { '@type': 'ImageObject', url: coverImage, caption: post.title } }
      : {}),
    author: {
      '@type': 'Organization',
      name: salonName,
      ...(logoImage ? { logo: logoImage } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: salonName,
      ...(logoImage ? { logo: { '@type': 'ImageObject', url: logoImage } } : {}),
    },
  };
}
