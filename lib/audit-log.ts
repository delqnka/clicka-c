import { sql } from '@/lib/db';

export type AuditAction =
  | 'sign_in'
  | 'sign_in_failed'
  | 'sign_out'
  | 'profile_updated'
  | 'password_changed'
  | 'email_change_requested'
  | 'email_changed'
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_status_changed'
  | 'site_settings_updated'
  | 'domain_connected'
  | 'domain_disconnected'
  | 'image_uploaded'
  | 'magic_link_used';

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id          bigserial    PRIMARY KEY,
      salon_id    text         NOT NULL,
      owner_id    text,
      action      text         NOT NULL,
      detail      jsonb,
      ip_hash     text,
      created_at  timestamptz  NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS admin_audit_log_salon_id_idx
    ON admin_audit_log (salon_id, created_at DESC)
  `;
  schemaReady = true;
}

import crypto from 'crypto';

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function writeAuditLog({
  salonId,
  ownerId,
  action,
  detail,
  ip,
}: {
  salonId: string;
  ownerId?: string | null;
  action: AuditAction;
  detail?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await ensureSchema();
    await sql`
      INSERT INTO admin_audit_log (salon_id, owner_id, action, detail, ip_hash)
      VALUES (
        ${salonId},
        ${ownerId ?? null},
        ${action},
        ${detail ? JSON.stringify(detail) : null},
        ${hashIp(ip)}
      )
    `;
  } catch {
    // Audit logging is best-effort — never block the main operation
  }
}
