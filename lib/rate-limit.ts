import crypto from 'crypto';
import { sql } from '@/lib/db';

// Shared IP-based rate limiter backed by Postgres.
// Creates a lightweight `rate_limit_attempts` table on first use.

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id         bigserial PRIMARY KEY,
      bucket     text        NOT NULL,
      ip_hash    text        NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS rate_limit_attempts_bucket_ip_idx
    ON rate_limit_attempts (bucket, ip_hash, created_at)
  `;
  schemaReady = true;
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function getIp(req: Request): string {
  const h = (req as { headers: { get(k: string): string | null } }).headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check and record an attempt. Returns { limited: true } when the caller
 * should be blocked, { limited: false } otherwise.
 *
 * @param bucket   - namespaced key, e.g. 'admin-sign-in'
 * @param ip       - raw IP string
 * @param max      - max attempts allowed within the window
 * @param windowMs - rolling window in milliseconds
 */
export async function checkRateLimit(
  bucket: string,
  ip: string,
  max: number,
  windowMs: number,
): Promise<{ limited: boolean; remaining: number }> {
  await ensureSchema();

  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - windowMs).toISOString();

  // Clean old entries for this bucket/ip
  await sql`
    DELETE FROM rate_limit_attempts
    WHERE bucket = ${bucket} AND ip_hash = ${ipHash} AND created_at < ${since}
  `;

  const rows = await sql`
    SELECT COUNT(*) AS cnt
    FROM rate_limit_attempts
    WHERE bucket = ${bucket} AND ip_hash = ${ipHash}
  `;

  const count = Number((rows[0] as Record<string, unknown>).cnt ?? 0);

  if (count >= max) {
    return { limited: true, remaining: 0 };
  }

  await sql`
    INSERT INTO rate_limit_attempts (bucket, ip_hash) VALUES (${bucket}, ${ipHash})
  `;

  return { limited: false, remaining: max - count - 1 };
}

export function getClientIp(req: Request): string {
  return getIp(req);
}
