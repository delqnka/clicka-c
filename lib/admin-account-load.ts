import { sql } from '@/lib/db';
import { ensureAdminAuthSchema } from '@/lib/admin-auth';

export type AdminAccountInfo = {
  displayName: string | null;
  hasPassword: boolean;
  pendingEmail: string | null;
};

export async function loadAdminAccountInfo(ownerId: string): Promise<AdminAccountInfo> {
  await ensureAdminAuthSchema();
  const rows = await sql`
    SELECT password_hash, pending_email, pending_email_expires_at, display_name
    FROM site_owners WHERE id = ${ownerId} LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  const displayName = String(row?.display_name ?? '').trim() || null;
  const hasPassword = Boolean(String(row?.password_hash ?? ''));

  // Only show pending email if not expired
  let pendingEmail: string | null = null;
  if (row?.pending_email) {
    const expires = new Date(String(row.pending_email_expires_at ?? ''));
    if (!Number.isNaN(expires.getTime()) && expires.getTime() > Date.now()) {
      pendingEmail = String(row.pending_email);
    }
  }

  return { displayName, hasPassword, pendingEmail };
}

/** @deprecated use loadAdminAccountInfo */
export async function loadAdminAccountHasPassword(ownerId: string): Promise<boolean> {
  return (await loadAdminAccountInfo(ownerId)).hasPassword;
}
