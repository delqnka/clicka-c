import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureMarketingSchema } from '@/lib/ensure-marketing-schema';

const GA4_RE = /^G-[A-Z0-9]{4,20}$/;
const PIXEL_RE = /^\d{10,20}$/;
const CLARITY_RE = /^[a-z0-9]{5,20}$/i;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await ensureMarketingSchema();

  const rows = await sql`
    SELECT ga4_id, meta_pixel_id, clarity_id
    FROM salons
    WHERE slug = ${auth.salon.slug}
    LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Не е намерен.' }, { status: 404 });

  const row = rows[0] as Record<string, unknown>;
  return NextResponse.json({
    ga4Id: String(row.ga4_id ?? ''),
    metaPixelId: String(row.meta_pixel_id ?? ''),
    clarityId: String(row.clarity_id ?? ''),
  });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await ensureMarketingSchema();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const ga4Id = typeof body.ga4Id === 'string' ? body.ga4Id.trim() : '';
  const metaPixelId = typeof body.metaPixelId === 'string' ? body.metaPixelId.trim() : '';
  const clarityId = typeof body.clarityId === 'string' ? body.clarityId.trim() : '';

  if (ga4Id && !GA4_RE.test(ga4Id)) {
    return NextResponse.json({ error: 'Невалиден GA4 Measurement ID. Формат: G-XXXXXXXXXX' }, { status: 400 });
  }
  if (metaPixelId && !PIXEL_RE.test(metaPixelId)) {
    return NextResponse.json({ error: 'Невалиден Meta Pixel ID. Трябва да съдържа само цифри (10-20 знака).' }, { status: 400 });
  }
  if (clarityId && !CLARITY_RE.test(clarityId)) {
    return NextResponse.json({ error: 'Невалиден Clarity Project ID.' }, { status: 400 });
  }

  await sql`
    UPDATE salons
    SET
      ga4_id = ${ga4Id || null},
      meta_pixel_id = ${metaPixelId || null},
      clarity_id = ${clarityId || null},
      updated_at = now()
    WHERE slug = ${auth.salon.slug}
  `;

  return NextResponse.json({ success: true, ga4Id, metaPixelId, clarityId });
}
