import { sql } from '@/lib/db';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

function toTitleCase(str: string): string {
  return str.trim().replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Compares Bulgarian local and international phone formats as one number.
 * Strips the country code (00359 / 359) and then every leading zero, so
 * "+359885…", "0885…" and even a mistyped "00885…" all resolve to the same
 * national number. */
export function normalizePhoneForMatch(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  const national = digits.startsWith('00359')
    ? digits.slice(5)
    : digits.startsWith('359')
      ? digits.slice(3)
      : digits;
  return national.replace(/^0+/, '');
}

export async function upsertSalonClient(
  salonId: string,
  name: string,
  fields: { phone?: string; email?: string; notes?: string },
): Promise<{ id: string; isNew: boolean }> {
  await ensureSalonClientsSchema();

  const normalizedName = toTitleCase(name);
  const normalizedPhone = normalizePhoneForMatch(fields.phone);

  // A phone is the durable identity. Shared household emails must never merge
  // two people into one client profile.
  const existing = await sql`
    SELECT id, name FROM salon_clients
    WHERE salon_id = ${salonId}
      AND (
        (${normalizedPhone} <> ''
          AND regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${normalizedPhone})
        OR (${normalizedPhone} = '' AND ${fields.email?.trim().toLowerCase() || ''} <> ''
          AND lower(trim(coalesce(email, ''))) = ${fields.email?.trim().toLowerCase() || ''})
        OR (${normalizedPhone} = '' AND ${fields.email?.trim().toLowerCase() || ''} = ''
          AND lower(trim(name)) = lower(trim(${normalizedName})))
      )
    ORDER BY
      CASE
        WHEN ${normalizedPhone} <> ''
          AND regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^(?:00359|359)?0*', '') = ${normalizedPhone} THEN 0
        WHEN ${normalizedPhone} = '' AND ${fields.email?.trim().toLowerCase() || ''} <> ''
          AND lower(trim(coalesce(email, ''))) = ${fields.email?.trim().toLowerCase() || ''} THEN 1
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
