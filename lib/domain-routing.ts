type MaybeHost = string | null | undefined;

const DEFAULT_ROOT_DOMAIN = 'clicka.bg';

export const ROOT_DOMAIN =
  String(process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.CLICKA_ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '') || DEFAULT_ROOT_DOMAIN;

export const VERCEL_SHARED_CNAME = 'cname.vercel-dns.com';

export function extractHostname(host: MaybeHost) {
  return String(host ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
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

export function getPlatformSiteHost(slug: string) {
  return `${slug}.${ROOT_DOMAIN}`;
}

export function getOriginForHost(hostname: string) {
  const safeHost = extractHostname(hostname);
  if (!safeHost) return `https://${ROOT_DOMAIN}`;
  const protocol = safeHost === 'localhost' || safeHost.endsWith('.localhost') ? 'http' : 'https';
  return `${protocol}://${safeHost}`;
}

export function getPlatformSiteOrigin(slug: string) {
  return getOriginForHost(getPlatformSiteHost(slug));
}

export function getPlatformPublicUrl(slug: string) {
  return getPlatformSiteOrigin(slug);
}

export function getPlatformClaimUrl(slug: string) {
  return `${getPlatformSiteOrigin(slug)}/claim`;
}

export function getPlatformInstantClaimUrl(slug: string) {
  return `${getOriginForHost(ROOT_DOMAIN)}/${slug}/claim`;
}

export function getPlatformAdminUrl(slug: string) {
  return `${getPlatformSiteOrigin(slug)}/admin`;
}

export function getCustomDomainOrigin(domain: string) {
  return getOriginForHost(domain);
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
  const status = String(domainStatus ?? '').trim().toLowerCase();
  if (custom && (status === 'active' || status === 'verified' || status === 'connected')) {
    return getCustomDomainOrigin(custom);
  }

  return getPlatformPublicUrl(slug);
}
