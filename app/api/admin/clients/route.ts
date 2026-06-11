import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  try {
    await ensureSalonClientsSchema();
    const rows = await sql`
      SELECT id, name, phone, email, created_at
      FROM salon_clients
      WHERE salon_id = ${salonId}
      ORDER BY name ASC
    ` as { id: string; name: string; phone: string | null; email: string | null; created_at: string }[];
    return NextResponse.json({ clients: rows });
  } catch {
    return NextResponse.json({ clients: [] });
  }
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  let body: { name?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim() || null;
  if (!name) {
    return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
  }

  await ensureSalonClientsSchema();

  const rows = await sql`
    INSERT INTO salon_clients (salon_id, name, phone)
    VALUES (${salonId}, ${name}, ${phone})
    ON CONFLICT (salon_id, name) DO UPDATE SET phone = COALESCE(EXCLUDED.phone, salon_clients.phone)
    RETURNING id, name, phone
  `;

  return NextResponse.json({ client: rows[0] });
}
