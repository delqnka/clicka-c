/**
 * Central brand configuration — single source of truth for engine branding.
 *
 * All email senders, footers, cookie names, support contacts, and ICS domains
 * read from here so the engine can be white-labeled by setting env vars.
 *
 * Defaults to Clicka.bg for backward compatibility on the canonical deployment.
 */

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

export const BRAND = {
  /** Brand display name used in copy and email subjects. e.g. "Clicka.bg" */
  name: env('BRAND_NAME') ?? 'Clicka.bg',

  /** Short brand name for places that need it. e.g. "Clicka" */
  shortName: env('BRAND_SHORT_NAME') ?? 'Clicka',

  /** Marketing site URL — used in email footers. e.g. "https://clicka.bg" */
  siteUrl: env('BRAND_SITE_URL') ?? 'https://clicka.bg',

  /** Apex domain — used for ICS UIDs, cookies, internal references. */
  domain: env('BRAND_DOMAIN') ?? 'clicka.bg',

  /** Default sender email for transactional messages. */
  senderEmail: env('BRAND_SENDER_EMAIL') ?? 'noreply@clicka.bg',

  /** Display name shown in the From header. */
  senderName: env('BRAND_SENDER_NAME') ?? 'Clicka.bg',

  /** Support contact shown in emails and legal pages. */
  supportEmail: env('BRAND_SUPPORT_EMAIL') ?? 'support@clicka.bg',

  /** Cookie name for the admin session. */
  adminCookieName: env('BRAND_ADMIN_COOKIE') ?? 'clicka_admin_session',
} as const;

/** "Brand Name <email@brand.tld>" header string for Resend / nodemailer. */
export function brandSender(): string {
  return `${BRAND.senderName} <${BRAND.senderEmail}>`;
}

/** Per-salon sender override: fall back to brand sender if no salon name. */
export function senderFromSalonName(salonName?: string | null): string {
  const name = (salonName ?? '').trim();
  if (!name) return brandSender();
  return `${name} <${BRAND.senderEmail}>`;
}
