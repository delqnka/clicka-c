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

  // Phone/email are the durable identity. Looking up by name first created
  // separate client rows whenever a typo or nickname was used in a booking.
  const existing = await sql`
    SELECT id, name FROM salon_clients
    WHERE salon_id = ${salonId}
      AND (
        (${fields.email?.trim().toLowerCase() || ''} <> ''
          AND lower(trim(coalesce(email, ''))) = ${fields.email?.trim().toLowerCase() || ''})
        OR (${(fields.phone ?? '').replace(/\D/g, '')} <> ''
          AND regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${(fields.phone ?? '').replace(/\D/g, '')})
        OR lower(trim(name)) = lower(trim(${normalizedName}))
      )
    ORDER BY
      CASE
        WHEN ${fields.email?.trim().toLowerCase() || ''} <> ''
          AND lower(trim(coalesce(email, ''))) = ${fields.email?.trim().toLowerCase() || ''} THEN 0
        WHEN ${(fields.phone ?? '').replace(/\D/g, '')} <> ''
          AND regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ${(fields.phone ?? '').replace(/\D/g, '')} THEN 1
        ELSE 2
      END,
      updated_at DESC
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
