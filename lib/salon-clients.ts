import { sql } from '@/lib/db';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

function toTitleCase(str: string): string {
  return str.trim().replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export async function upsertSalonClient(
  salonId: string,
  name: string,
  fields: { phone?: string; email?: string; notes?: string },
): Promise<{ id: string; isNew: boolean }> {
  await ensureSalonClientsSchema();

  const normalizedName = toTitleCase(name);

  // Find existing client case-insensitively, use their stored name for the upsert key
  const existing = await sql`
    SELECT id, name FROM salon_clients
    WHERE salon_id = ${salonId} AND lower(trim(name)) = lower(trim(${normalizedName}))
    LIMIT 1
  ` as { id: string; name: string }[];

  const isNew = existing.length === 0;
  const upsertName = isNew ? normalizedName : existing[0]!.name;

  const rows = await sql`
    INSERT INTO salon_clients (salon_id, name, phone, email, notes)
    VALUES (${salonId}, ${upsertName}, ${fields.phone ?? null}, ${fields.email ?? null}, ${fields.notes ?? null})
    ON CONFLICT (salon_id, name) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, salon_clients.phone),
      email = COALESCE(EXCLUDED.email, salon_clients.email),
      notes = COALESCE(EXCLUDED.notes, salon_clients.notes),
      updated_at = now()
    RETURNING id
  ` as { id: string }[];

  return { id: rows[0]!.id, isNew };
}
