import { sql } from '@/lib/db';
import { ensureOffersSchema } from '@/lib/ensure-offers-schema';
import { mapDbOfferRow, type AdminSalonOffer } from '@/lib/salon-offers';

export async function loadAdminOffersBySalonId(salonId: string): Promise<AdminSalonOffer[]> {
  await ensureOffersSchema();
  const rows = await sql`
    SELECT *
    FROM salon_offers
    WHERE salon_id = ${salonId}
    ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapDbOfferRow);
}
