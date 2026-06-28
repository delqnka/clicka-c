/**
 * Central brand configuration — single source of truth for engine branding.
 *
 * All email senders, footers, cookie names, support contacts, and ICS domains
 * read from here so the engine can be white-labeled by setting env vars.
 *
 * Defaults to Alternine branding for backward compatibility on the current
 * canonical deployment.
 */

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

export const BRAND = {
  /** Brand display name used in copy and email subjects. e.g. "Alternine" */
  name: env('BRAND_NAME') ?? 'Alternine',

  /** Short brand name for places that need it. e.g. "Alternine" */
  shortName: env('BRAND_SHORT_NAME') ?? 'Alternine',

  /** Marketing / engine site URL — used in email footers. */
  siteUrl: env('BRAND_SITE_URL') ?? 'https://app.alternine.co',

  /** Apex domain — used for ICS UIDs, cookies, internal references. */
  domain: env('BRAND_DOMAIN') ?? 'app.alternine.co',

  /** Default sender email for transactional messages. */
  senderEmail: env('BRAND_SENDER_EMAIL') ?? 'noreply@alternine.co',

  /** Display name shown in the From header. */
  senderName: env('BRAND_SENDER_NAME') ?? 'Alternine',

  /** Support contact shown in emails and legal pages. */
  supportEmail: env('BRAND_SUPPORT_EMAIL') ?? 'support@alternine.co',

  /** Cookie name for the admin session. */
  adminCookieName: env('BRAND_ADMIN_COOKIE') ?? 'clicka_admin_session',

  /** Shared Telegram bot username used for staff onboarding and the owner assistant.
   *  Single bot today; future per-deployment override allows multiple shards. */
  telegramBotUsername: env('BRAND_TELEGRAM_BOT') ?? 'clicka_booking_bot',
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
