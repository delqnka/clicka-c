import { sql } from '@/lib/db';
import { ensureAdminAuthSchema } from '@/lib/admin-auth';

export async function loadAdminAccountHasPassword(ownerId: string): Promise<boolean> {
  await ensureAdminAuthSchema();
  const rows = await sql`
    SELECT password_hash FROM site_owners WHERE id = ${ownerId} LIMIT 1
  `;
  return Boolean(String((rows[0] as Record<string, unknown> | undefined)?.password_hash ?? ''));
}
