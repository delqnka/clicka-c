import { sql } from '@/lib/db';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

export async function upsertSalonClient(
  salonId: string,
  name: string,
  fields: { phone?: string; email?: string; notes?: string },
): Promise<void> {
  await ensureSalonClientsSchema();

  await sql`
    INSERT INTO salon_clients (salon_id, name, phone, email, notes)
    VALUES (${salonId}, ${name}, ${fields.phone ?? null}, ${fields.email ?? null}, ${fields.notes ?? null})
    ON CONFLICT (salon_id, name) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, salon_clients.phone),
      email = COALESCE(EXCLUDED.email, salon_clients.email),
      notes = COALESCE(EXCLUDED.notes, salon_clients.notes),
      updated_at = now()
  `;
}
