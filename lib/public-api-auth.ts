/**
 * Public API key verification for external white-label frontends.
 *
 * Custom Next.js sites (paradise.bg, hairandart.bg, …) send their API key in
 * the `X-API-Key` header. The engine resolves it to a salon_id and checks
 * scope. Keys are never stored in plaintext — only sha256(key).
 *
 * Toggle: set `REQUIRE_PUBLIC_API_KEY=1` to enforce; otherwise public routes
 * remain open by `slug` only (legacy compatibility for the canonical deploy).
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const HEADER_NAME = 'x-api-key';

export type ApiKeyScope = 'read' | 'book';

function isEnforced(): boolean {
  const raw = process.env.REQUIRE_PUBLIC_API_KEY ?? '';
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Constant-time string compare to avoid timing leaks on the key prefix path. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export type ApiKeyResult =
  | { ok: true; salonId: string; scopes: string[] }
  | { ok: false; response: NextResponse };

export async function verifyApiKey(
  request: NextRequest,
  opts: { slug: string; requiredScope: ApiKeyScope; corsHeaders?: Record<string, string> },
): Promise<ApiKeyResult> {
  const corsHeaders = opts.corsHeaders ?? {};
  const enforced = isEnforced();

  const rawKey = request.headers.get(HEADER_NAME)?.trim() ?? '';

  if (!enforced && !rawKey) {
    // Legacy mode: no key required. Resolve salon by slug for the caller.
    const rows = await sql`SELECT id FROM salons WHERE slug = ${opts.slug} LIMIT 1`;
    if (rows.length === 0) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Salon not found' },
          { status: 404, headers: corsHeaders },
        ),
      };
    }
    return { ok: true, salonId: String((rows[0] as Record<string, unknown>).id), scopes: ['read', 'book'] };
  }

  if (!rawKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing API key' },
        { status: 401, headers: corsHeaders },
      ),
    };
  }

  // Brute-force guard: cap per-IP key submissions. Bucket is keyed only by IP
  // (not by the submitted key) so an attacker can't dodge the limit by rotating
  // candidates. 60/min matches /api/bookings public bucket sizing.
  const ip = getClientIp(request as unknown as Request);
  const rl = await checkRateLimit('public-api-key', ip, 60, 60_000);
  if (rl.limited) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Твърде много заявки.' },
        { status: 429, headers: corsHeaders },
      ),
    };
  }

  const keyHash = sha256(rawKey);
  const rows = await sql`
    SELECT k.salon_id, k.scopes, s.slug AS salon_slug
    FROM public_api_keys k
    JOIN salons s ON s.id::text = k.salon_id
    WHERE k.key_hash = ${keyHash}
      AND k.revoked_at IS NULL
    LIMIT 1
  `;

  if (rows.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders },
      ),
    };
  }

  const row = rows[0] as { salon_id: string; scopes: string[] | null; salon_slug: string };
  const scopes = Array.isArray(row.scopes) ? row.scopes : ['read', 'book'];

  // The key must belong to the salon the request is for AND have the required
  // scope. We collapse both failures into the same "Invalid API key" response
  // as the missing-key case to avoid leaking whether a key is valid-for-another
  // salon or merely lacking scope (enumeration vector).
  const slugMismatch = !safeEqual(row.salon_slug, opts.slug);
  const scopeMissing = !scopes.includes(opts.requiredScope);
  if (slugMismatch || scopeMissing) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders },
      ),
    };
  }

  // Fire-and-forget — never block the request on telemetry write.
  sql`UPDATE public_api_keys SET last_used_at = now() WHERE key_hash = ${keyHash}`.catch(() => {});

  return { ok: true, salonId: row.salon_id, scopes };
}

/** Generates a new public API key. Returns the plaintext (show once) and hash (store). */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  // Format: pk_live_<32 random url-safe chars>
  const random = crypto.randomBytes(24).toString('base64url');
  const plaintext = `pk_live_${random}`;
  const hash = sha256(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}
