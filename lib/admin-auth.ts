import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSmsSchema } from '@/lib/ensure-sms-schema';
import {
  ROOT_DOMAIN,
  extractHostname,
  getPlatformSubdomain,
  getPlatformSiteOrigin,
  getHostAwareSalonPath,
  isPlatformApexHost,
} from '@/lib/domain-routing';

export const ADMIN_COOKIE_NAME = 'clicka_admin_session';

type MaybeHost = string | null | undefined;

export type AdminGateResult =
  | { kind: 'missing-salon' }
  | { kind: 'claim'; salon: SalonLookupRow }
  | { kind: 'sign-in'; salon: SalonLookupRow }
  | { kind: 'authorized'; salon: SalonLookupRow; session: AdminSessionRow };

export type SalonLookupRow = {
  salonId: string;
  slug: string;
  name: string;
  email: string;
  isActive: boolean;
  customDomain: string | null;
  domainStatus: string | null;
};

export type OwnerRow = {
  ownerId: string;
  email: string;
};

export type AdminSessionRow = {
  ownerId: string;
  ownerEmail: string;
  salonId: string;
  salonSlug: string;
  salonName: string;
  role: string;
};

let ensureSchemaPromise: Promise<void> | null = null;

export function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isPlatformHost(hostname: string) {
  return isPlatformApexHost(hostname);
}

export function normalizeDomainCandidate(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export function isValidDomain(domain: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain);
}

export async function ensureAdminAuthSchema() {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      const [{ exists }] = await sql`
        SELECT to_regclass('owner_sessions') IS NOT NULL AS exists
      ` as [{ exists: boolean }];
      if (exists) return;

      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS admin_login_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          token_hash text NOT NULL,
          expires_at timestamptz NOT NULL,
          used_at timestamptz NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS admin_login_tokens_salon_id_idx ON admin_login_tokens(salon_id)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_login_tokens_token_hash_uniq ON admin_login_tokens(token_hash)`;
      await sql`
        CREATE TABLE IF NOT EXISTS site_owners (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL,
          email_norm text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS site_owners_email_norm_uniq ON site_owners(email_norm)`;
      await sql`
        CREATE TABLE IF NOT EXISTS salon_owner_memberships (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          owner_id uuid NOT NULL REFERENCES site_owners(id) ON DELETE CASCADE,
          role text NOT NULL DEFAULT 'owner',
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS salon_owner_memberships_salon_owner_uniq
        ON salon_owner_memberships(salon_id, owner_id)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS salon_claim_otp (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          email_norm text NOT NULL,
          code_hash text NOT NULL,
          expires_at timestamptz NOT NULL,
          attempts integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS salon_claim_otp_salon_email_uniq
        ON salon_claim_otp(salon_id, email_norm)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS owner_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          salon_id text NOT NULL,
          owner_id uuid NOT NULL REFERENCES site_owners(id) ON DELETE CASCADE,
          session_hash text NOT NULL,
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS owner_sessions_session_hash_uniq ON owner_sessions(session_hash)`;
      await sql`CREATE INDEX IF NOT EXISTS owner_sessions_owner_id_idx ON owner_sessions(owner_id)`;
      await sql`ALTER TABLE admin_login_tokens ADD COLUMN IF NOT EXISTS email_norm text`;
      await sql`ALTER TABLE site_owners ADD COLUMN IF NOT EXISTS password_hash text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS category text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_name text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_role text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_photo_url text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS tiktok_username text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS custom_domain text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_status text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_verified_at timestamptz`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_last_checked_at timestamptz`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS domain_config jsonb`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS salons_custom_domain_uniq
        ON salons ((lower(custom_domain)))
        WHERE custom_domain IS NOT NULL
      `;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_public_bio text`;
      await sql`ALTER TABLE salons ADD COLUMN IF NOT EXISTS venue_extras jsonb`;
      await sql`ALTER TABLE site_owners ADD COLUMN IF NOT EXISTS pending_email text`;
      await sql`ALTER TABLE site_owners ADD COLUMN IF NOT EXISTS pending_email_token_hash text`;
      await sql`ALTER TABLE site_owners ADD COLUMN IF NOT EXISTS pending_email_expires_at timestamptz`;
      await ensureSmsSchema();
    })();
  }

  await ensureSchemaPromise;
}

export async function resolveSalonBySlugOrHost({
  slug,
  host,
  includeInactive = false,
}: {
  slug?: string | null;
  host?: MaybeHost;
  includeInactive?: boolean;
}): Promise<SalonLookupRow | null> {
  await ensureAdminAuthSchema();

  const safeSlug = String(slug ?? '').trim();
  if (safeSlug) {
    const rows = includeInactive
      ? await sql`
          SELECT
            CAST(id AS text) AS salon_id,
            slug,
            name,
            email,
            is_active,
            custom_domain,
            domain_status
          FROM salons
          WHERE slug = ${safeSlug}
          LIMIT 1
        `
      : await sql`
          SELECT
            CAST(id AS text) AS salon_id,
            slug,
            name,
            email,
            is_active,
            custom_domain,
            domain_status
          FROM salons
          WHERE slug = ${safeSlug} AND is_active = true
          LIMIT 1
        `;

    if (rows.length > 0) {
      const row = rows[0] as Record<string, unknown>;
      return {
        salonId: String(row.salon_id ?? ''),
        slug: String(row.slug ?? ''),
        name: String(row.name ?? 'Салон'),
        email: String(row.email ?? ''),
        isActive: row.is_active === true,
        customDomain: typeof row.custom_domain === 'string' ? row.custom_domain : null,
        domainStatus: typeof row.domain_status === 'string' ? row.domain_status : null,
      };
    }
  }

  const hostname = extractHostname(host);
  const subdomain = getPlatformSubdomain(hostname);
  if (subdomain) {
    return resolveSalonBySlugOrHost({ slug: subdomain, includeInactive });
  }
  if (!hostname || isPlatformHost(hostname)) return null;

  // Only route custom domains that have been verified (domain_status = 'active').
  // This prevents an unverified/squatted domain from intercepting traffic.
  const customRows = includeInactive
    ? await sql`
        SELECT
          CAST(id AS text) AS salon_id,
          slug,
          name,
          email,
          is_active,
          custom_domain,
          domain_status
        FROM salons
        WHERE lower(custom_domain) = lower(${hostname})
          AND domain_status = 'active'
        LIMIT 1
      `
    : await sql`
        SELECT
          CAST(id AS text) AS salon_id,
          slug,
          name,
          email,
          is_active,
          custom_domain,
          domain_status
        FROM salons
        WHERE lower(custom_domain) = lower(${hostname})
          AND is_active = true
          AND domain_status = 'active'
        LIMIT 1
      `;

  if (customRows.length === 0 && hostname.startsWith('www.')) {
    return resolveSalonBySlugOrHost({
      host: hostname.slice(4),
      includeInactive,
    });
  }
  if (customRows.length === 0) return null;

  const row = customRows[0] as Record<string, unknown>;
  return {
    salonId: String(row.salon_id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? 'Салон'),
    email: String(row.email ?? ''),
    isActive: row.is_active === true,
    customDomain: typeof row.custom_domain === 'string' ? row.custom_domain : null,
    domainStatus: typeof row.domain_status === 'string' ? row.domain_status : null,
  };
}

export async function getPrimaryOwnerForSalon(salonId: string): Promise<OwnerRow | null> {
  await ensureAdminAuthSchema();
  const rows = await sql`
    SELECT o.id AS owner_id, o.email
    FROM salon_owner_memberships m
    JOIN site_owners o ON o.id = m.owner_id
    WHERE m.salon_id = ${salonId}
    ORDER BY m.created_at ASC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  return {
    ownerId: String(row.owner_id ?? ''),
    email: String(row.email ?? ''),
  };
}

export async function ensureOwnerForSalon({
  salonId,
  email,
}: {
  salonId: string;
  email: string;
}) {
  await ensureAdminAuthSchema();
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) {
    throw new Error('Липсва имейл за собственик');
  }

  const ownerRows = await sql`
    INSERT INTO site_owners (email, email_norm, created_at, updated_at)
    VALUES (${email.trim()}, ${emailNorm}, now(), now())
    ON CONFLICT (email_norm)
    DO UPDATE SET email = EXCLUDED.email, updated_at = now()
    RETURNING id
  `;
  const ownerId = String(ownerRows[0].id ?? '');

  await sql`
    INSERT INTO salon_owner_memberships (salon_id, owner_id, role, created_at)
    VALUES (${salonId}, ${ownerId}, 'owner', now())
    ON CONFLICT (salon_id, owner_id) DO NOTHING
  `;

  return { ownerId, email: email.trim() };
}

export async function createOwnerSession({
  salonId,
  ownerId,
}: {
  salonId: string;
  ownerId: string;
}) {
  await ensureAdminAuthSchema();
  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionHash = sha256(sessionId);
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO owner_sessions (salon_id, owner_id, session_hash, expires_at, created_at)
    VALUES (${salonId}, ${ownerId}, ${sessionHash}, ${sessionExpires.toISOString()}, now())
  `;

  return { sessionId, sessionExpires };
}

export async function getAdminSessionByCookieValue(sessionId: string, salonSlug: string): Promise<AdminSessionRow | null> {
  await ensureAdminAuthSchema();
  if (!sessionId || !salonSlug) return null;

  const sessionHash = sha256(sessionId);
  const rows = await sql`
    SELECT
      os.owner_id,
      o.email AS owner_email,
      os.salon_id,
      s.slug AS salon_slug,
      s.name AS salon_name,
      m.role
    FROM owner_sessions os
    JOIN site_owners o ON o.id = os.owner_id
    JOIN salon_owner_memberships m ON m.owner_id = os.owner_id AND m.salon_id = os.salon_id
    JOIN salons s ON CAST(s.id AS text) = os.salon_id
    WHERE os.session_hash = ${sessionHash}
      AND os.expires_at > now()
      AND s.slug = ${salonSlug}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  return {
    ownerId: String(row.owner_id ?? ''),
    ownerEmail: String(row.owner_email ?? ''),
    salonId: String(row.salon_id ?? ''),
    salonSlug: String(row.salon_slug ?? ''),
    salonName: String(row.salon_name ?? ''),
    role: String(row.role ?? 'owner'),
  };
}

export async function resolveAdminGate({
  slug,
  host,
  sessionId,
}: {
  slug?: string | null;
  host?: MaybeHost;
  sessionId?: string | null;
}): Promise<AdminGateResult> {
  const salon = await resolveSalonBySlugOrHost({ slug, host, includeInactive: true });
  if (!salon) return { kind: 'missing-salon' };

  if (sessionId) {
    const session = await getAdminSessionByCookieValue(sessionId, salon.slug);
    if (session) {
      return { kind: 'authorized', salon, session };
    }
  }

  const owner = await getPrimaryOwnerForSalon(salon.salonId);
  return owner ? { kind: 'sign-in', salon } : { kind: 'claim', salon };
}

export async function requireAdminRequestAccess(
  request: NextRequest,
  slug?: string | null
) {
  const sessionId = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
  const gate = await resolveAdminGate({
    slug,
    host: request.headers.get('host'),
    sessionId,
  });

  if (gate.kind === 'authorized') {
    return { ok: true as const, salon: gate.salon, session: gate.session };
  }

  const redirectTo =
    gate.kind === 'claim'
      ? getHostAwareSalonPath({
          host: request.headers.get('host'),
          slug: gate.salon.slug,
          path: 'claim',
        })
      : gate.kind === 'sign-in'
        ? getHostAwareSalonPath({
            host: request.headers.get('host'),
            slug: gate.salon.slug,
            path: 'admin/sign-in',
          })
        : '/';

  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: 'Нямате достъп до този салон.',
        redirectTo,
      },
      { status: 401 }
    ),
  };
}

export async function destroyOwnerSession(sessionId: string) {
  await ensureAdminAuthSchema();
  if (!sessionId) return;
  const sessionHash = sha256(sessionId);
  await sql`DELETE FROM owner_sessions WHERE session_hash = ${sessionHash}`;
}

/** Invalidate ALL sessions for this owner except the current one (used on password change). */
export async function destroyAllOtherOwnerSessions(ownerId: string, currentSessionId: string) {
  await ensureAdminAuthSchema();
  const currentHash = sha256(currentSessionId);
  await sql`
    DELETE FROM owner_sessions
    WHERE owner_id = ${ownerId}
      AND session_hash <> ${currentHash}
  `;
}

export function setAdminSessionCookie(response: NextResponse, request: NextRequest, sessionId: string, expiresAt: Date) {
  const hostname = request.nextUrl.hostname;
  const isPlatformHost = hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: expiresAt,
    // Share the session across the apex and salon subdomains (e.g. clicka.bg ↔ didisalon.clicka.bg).
    domain: isPlatformHost ? `.${ROOT_DOMAIN}` : undefined,
  });
}

export async function generateAdminMagicLink({
  salonId,
  slug,
  email,
  expiresMs = 72 * 60 * 60 * 1000,
}: {
  salonId: string;
  slug: string;
  email: string;
  expiresMs?: number;
}): Promise<string> {
  await ensureAdminAuthSchema();

  const base = getPlatformSiteOrigin(slug);

  // If the owner already has a password, send them to sign-in instead of
  // making them set a new one — a login token would be wasted on them anyway.
  const owner = await getPrimaryOwnerForSalon(salonId);
  if (owner) {
    const ownerRows = await sql`
      SELECT password_hash FROM site_owners WHERE id = ${owner.ownerId} LIMIT 1
    `;
    const passwordHash = String((ownerRows[0] as Record<string, unknown>)?.password_hash ?? '');
    if (passwordHash) {
      return `${base}/admin/sign-in?email=${encodeURIComponent(normalizeEmail(email))}`;
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + expiresMs);

  await sql`DELETE FROM admin_login_tokens WHERE salon_id = ${salonId}`;
  await sql`
    INSERT INTO admin_login_tokens (salon_id, token_hash, email_norm, expires_at, created_at)
    VALUES (${salonId}, ${tokenHash}, ${normalizeEmail(email)}, ${expiresAt.toISOString()}, now())
  `;

  // Points to set-password page on the salon's own subdomain (first-time activation).
  return `${base}/admin/set-password?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(`${salt}:${buf.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIndex = stored.indexOf(':');
  if (colonIndex === -1) return false;
  const salt = stored.slice(0, colonIndex);
  const hash = stored.slice(colonIndex + 1);
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) { resolve(false); return; }
      try {
        resolve(crypto.timingSafeEqual(buf, Buffer.from(hash, 'hex')));
      } catch {
        resolve(false);
      }
    });
  });
}

export function generateOtpCode() {
  // 6-digit code via crypto — range 100000–999999
  const n = crypto.randomInt(100_000, 1_000_000);
  return String(n);
}

export function hashOtpCode(emailNorm: string, code: string) {
  const pepper = process.env.BUSINESS_REGISTRATION_OTP_PEPPER || 'clicka-claim-otp-v1';
  return sha256(`${emailNorm}:${code}:${pepper}`);
}
