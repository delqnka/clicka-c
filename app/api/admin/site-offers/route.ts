import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureOffersSchema } from '@/lib/ensure-offers-schema';
import {
  mapAdminOfferToDb,
  mapDbOfferRow,
  newEmptyOffer,
  normalizeOfferImages,
  type AdminSalonOffer,
} from '@/lib/salon-offers';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

function normalizeOffersInput(raw: unknown): AdminSalonOffer[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const base = newEmptyOffer();
    const maxClaimsRaw = row.maxClaims ?? row.max_claims;
    const discountRaw = row.discount;
    return {
      id: String(row.id ?? '').trim(),
      title: String(row.title ?? '').trim() || `Оферта ${index + 1}`,
      description: String(row.description ?? '').trim(),
      discount:
        discountRaw != null && discountRaw !== '' && Number.isFinite(Number(discountRaw))
          ? Number(discountRaw)
          : null,
      images: normalizeOfferImages(row.images),
      isActive: row.isActive !== false && row.is_active !== false,
      validUntil: row.validUntil ? String(row.validUntil) : row.valid_until ? String(row.valid_until) : null,
      campaignValidFrom: row.campaignValidFrom
        ? String(row.campaignValidFrom)
        : row.campaign_valid_from
          ? String(row.campaign_valid_from)
          : null,
      campaignValidUntil: row.campaignValidUntil
        ? String(row.campaignValidUntil)
        : row.campaign_valid_until
          ? String(row.campaign_valid_until)
          : null,
      maxClaims:
        maxClaimsRaw != null && maxClaimsRaw !== '' && Number.isFinite(Number(maxClaimsRaw))
          ? Math.max(1, Math.round(Number(maxClaimsRaw)))
          : null,
      totalClaims: Math.max(0, Number(row.totalClaims ?? row.total_claims ?? 0) || 0),
      durationMin: Math.max(15, Number(row.durationMin ?? row.duration_min ?? 60) || 60),
    };
  });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await ensureOffersSchema();

  const rows = await sql`
    SELECT *
    FROM salon_offers
    WHERE salon_id = ${auth.salon.salonId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({
    offers: (rows as Record<string, unknown>[]).map(mapDbOfferRow),
  });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: { offers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const offers = normalizeOffersInput(body.offers);
  await ensureOffersSchema();

  const existing = await sql`
    SELECT id::text AS id, total_claims
    FROM salon_offers
    WHERE salon_id = ${auth.salon.salonId}
  `;
  const claimsById = new Map(
    (existing as { id: string; total_claims: number }[]).map((r) => [r.id, Number(r.total_claims) || 0]),
  );

  const keepIds: string[] = [];

  for (const offer of offers) {
    const mapped = mapAdminOfferToDb(offer, auth.salon.salonId);
    const preservedClaims = offer.id ? (claimsById.get(offer.id) ?? offer.totalClaims) : 0;

    if (offer.id && claimsById.has(offer.id)) {
      await sql`
        UPDATE salon_offers
        SET
          title = ${mapped.title},
          description = ${mapped.description},
          discount = ${mapped.discount},
          images = ${mapped.images}::jsonb,
          is_active = ${mapped.is_active},
          valid_until = ${mapped.valid_until},
          campaign_valid_from = ${mapped.campaign_valid_from},
          campaign_valid_until = ${mapped.campaign_valid_until},
          max_claims = ${mapped.max_claims},
          duration_min = ${mapped.duration_min}
        WHERE id = ${offer.id}::uuid AND salon_id = ${auth.salon.salonId}
      `;
      keepIds.push(offer.id);
    } else {
      const inserted = await sql`
        INSERT INTO salon_offers (
          salon_id, title, description, discount, images, is_active,
          valid_until, campaign_valid_from, campaign_valid_until,
          max_claims, total_claims, duration_min
        )
        VALUES (
          ${mapped.salon_id},
          ${mapped.title},
          ${mapped.description},
          ${mapped.discount},
          ${mapped.images}::jsonb,
          ${mapped.is_active},
          ${mapped.valid_until},
          ${mapped.campaign_valid_from},
          ${mapped.campaign_valid_until},
          ${mapped.max_claims},
          ${preservedClaims},
          ${mapped.duration_min}
        )
        RETURNING id::text AS id
      `;
      const newId = String((inserted[0] as { id: string }).id ?? '');
      if (newId) keepIds.push(newId);
    }
  }

  if (keepIds.length > 0) {
    await sql`
      DELETE FROM salon_offers
      WHERE salon_id = ${auth.salon.salonId}
        AND NOT (id::text = ANY(${keepIds}))
    `;
  } else {
    await sql`DELETE FROM salon_offers WHERE salon_id = ${auth.salon.salonId}`;
  }

  const rows = await sql`
    SELECT *
    FROM salon_offers
    WHERE salon_id = ${auth.salon.salonId}
    ORDER BY created_at DESC
  `;

  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({
    success: true,
    offers: (rows as Record<string, unknown>[]).map(mapDbOfferRow),
  });
}
