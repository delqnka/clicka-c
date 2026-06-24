import { BRAND } from '@/lib/brand';

type MaybeHost = string | null | undefined;

// Root domain is derived from BRAND config (which itself reads BRAND_DOMAIN env).
// NEXT_PUBLIC_ROOT_DOMAIN takes precedence so the value is available client-side
// in middleware/edge code without the BRAND import. Falls back to BRAND.domain
// (which falls back to 'clicka.bg' only on the canonical deploy).
export const ROOT_DOMAIN =
  String(process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.CLICKA_ROOT_DOMAIN || BRAND.domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '') || BRAND.domain;

export const VERCEL_SHARED_CNAME = 'cname.vercel-dns.com';

export function extractHostname(host: MaybeHost) {
  return String(host ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

/**
 * Browser-facing host as seen by the user, even when the request reached the
 * engine through a proxy from a client site (e.g. salonurban.online → engine).
 *
 * Header precedence:
 *   1. x-clicka-host — set explicitly by the client-site Edge Middleware
 *      proxy. Vercel managed headers like x-forwarded-host are overwritten
 *      on inbound to the engine project, so we use our own header.
 *   2. x-forwarded-host — direct same-project rewrites / dev / curl tests.
 *   3. Host header — direct requests.
 *
 * Forging x-clicka-host doesn't bypass auth — it only changes which salon's
 * flow runs and credentials/sessions are still required.
 */
export function getBrowserHost(headers: { get(name: string): string | null }) {
  const clicka = headers.get('x-clicka-host');
  const forwarded = headers.get('x-forwarded-host');
  const fallback = headers.get('host');
  return extractHostname(clicka || forwarded || fallback);
}

export function isPlatformApexHost(hostname: string) {
  return (
    !hostname ||
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  );
}

export function getPlatformSubdomain(hostname: string) {
  const normalized = extractHostname(hostname);
  if (!normalized.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const subdomain = normalized.slice(0, -1 * (`.${ROOT_DOMAIN}`).length);
  if (!subdomain || subdomain === 'www') return null;
  return subdomain;
}

/**
 * Returns the synthetic host string `<slug>.<root>` used ONLY as a stable
 * cache-tag key for ISR revalidation in `lib/revalidate-salon-public.ts`. It
 * is never used as a public URL — the engine does not provision per-salon
 * subdomains. End-user-facing URLs must always come from the salon's own
 * custom domain via `getCustomDomainOrigin` / `getCustomDomainAdminUrl`.
 */
export function getPlatformSiteHost(slug: string) {
  return `${slug}.${ROOT_DOMAIN}`;
}

export function getOriginForHost(hostname: string) {
  const safeHost = extractHostname(hostname);
  if (!safeHost) return `https://${ROOT_DOMAIN}`;
  const protocol = safeHost === 'localhost' || safeHost.endsWith('.localhost') ? 'http' : 'https';
  return `${protocol}://${safeHost}`;
}

export function getCustomDomainOrigin(domain: string) {
  return getOriginForHost(domain);
}

export function getAdminSubdomainHost(domain: string) {
  const safeDomain = extractHostname(domain);
  if (!safeDomain) return '';
  return `admin.${safeDomain}`;
}

export function isAdminSubdomainHost(hostname: string) {
  const normalized = extractHostname(hostname);
  return normalized.startsWith('admin.') && normalized.split('.').length >= 3;
}

export function stripAdminSubdomain(hostname: string) {
  const normalized = extractHostname(hostname);
  if (!isAdminSubdomainHost(normalized)) return normalized;
  return normalized.slice('admin.'.length);
}

export function getCustomDomainAdminUrl(domain: string) {
  return getCustomDomainOrigin(domain);
}

export function getHostAwareSalonPath({
  host,
  slug,
  path,
}: {
  host?: MaybeHost;
  slug: string;
  path?: string;
}) {
  const normalizedPath = String(path ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const hostname = extractHostname(host);

  if (isPlatformApexHost(hostname)) {
    return normalizedPath ? `/${slug}/${normalizedPath}` : `/${slug}`;
  }

  return normalizedPath ? `/${normalizedPath}` : '/';
}

export function isSalonCustomDomainLive(domainStatus?: string | null) {
  const status = String(domainStatus ?? '').trim().toLowerCase();
  return status === 'active' || status === 'verified' || status === 'connected';
}

/**
 * Public URL for a salon page.
 *
 * Returns the salon's own custom-domain origin when the domain is active —
 * the only URL real end-clients should ever see.
 *
 * When no active custom domain exists yet, falls back to an apex path-based
 * URL (`https://<root>/<slug>`). This is an internal-only construction used
 * by SEO/sitemap/email helpers so they don't crash on half-provisioned
 * salons — it is NOT meant to be shared with end-clients and never appears
 * in a magic link / invite email (those flows block on missing custom
 * domain). Per `docs/project-vision.md` Clicka does not provision per-salon
 * subdomains, so the legacy `<slug>.<root>` form is intentionally absent.
 */
export function getPrimaryPublicUrl({
  slug,
  customDomain,
  domainStatus,
}: {
  slug: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}) {
  const custom = String(customDomain ?? '').trim();
  if (custom && isSalonCustomDomainLive(domainStatus)) {
    return getCustomDomainOrigin(custom);
  }

  return `${getOriginForHost(ROOT_DOMAIN)}/${slug}`;
}

export type LegalDocumentPath = 'terms' | 'privacy' | 'cookies';

export const SALON_LEGAL_PATHS = new Set<string>(['/cookies', '/terms', '/privacy']);

/** Rewrite /cookies (etc.) on salon hosts to internal salon-home legal routes. */
export function getSalonHomeLegalRewritePath(pathname: string): string | null {
  if (!SALON_LEGAL_PATHS.has(pathname)) return null;
  return `/salon-home${pathname}`;
}

/** Публичен URL на правен документ (собствен домейн или slug.clicka.bg). */
export function getLegalDocumentUrl({
  slug,
  customDomain,
  domainStatus,
  document,
}: {
  slug: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  document: LegalDocumentPath;
}) {
  const origin = getPrimaryPublicUrl({ slug, customDomain, domainStatus });
  return `${origin}/${document}`;
}
