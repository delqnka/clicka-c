import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { ensureSalonClientsSchema } from '@/lib/ensure-salon-clients-schema';

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const id = request.nextUrl.searchParams.get('id');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  if (!id) return NextResponse.json({ error: 'Липсва id.' }, { status: 400 });

  const salonId = auth.salon.salonId;

  await ensureSalonClientsSchema();
  await sql`
    DELETE FROM salon_clients
    WHERE id = ${id} AND salon_id = ${salonId}
  `;

  return NextResponse.json({ ok: true });
}

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

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  let body: { id?: string; name?: string; phone?: string; email?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const { id, name, phone, email } = body;
  if (!id || !name?.trim()) return NextResponse.json({ error: 'Липсва id или иМЕ.' }, { status: 400 });

  await ensureSalonClientsSchema();

  const rows = await sql`
    UPDATE salon_clients
    SET
      name  = ${name.trim()},
      phone = ${phone?.trim() || null},
      email = ${email?.trim() || null}
    WHERE id = ${id} AND salon_id = ${salonId}
    RETURNING id, name, phone, email
  `;

  return NextResponse.json({ client: rows[0] ?? null });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const salonId = auth.salon.salonId;

  let body: { name?: string; phone?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim() || null;
  const email = body.email?.trim().toLowerCase() || null;
  if (!name) {
    return NextResponse.json({ error: 'Името е задължително.' }, { status: 400 });
  }

  await ensureSalonClientsSchema();

  const rows = await sql`
    INSERT INTO salon_clients (salon_id, name, phone, email)
    VALUES (${salonId}, ${name}, ${phone}, ${email})
    ON CONFLICT (salon_id, name) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, salon_clients.phone),
      email = COALESCE(EXCLUDED.email, salon_clients.email)
    RETURNING id, name, phone, email
  `;

  return NextResponse.json({ client: rows[0] });
}
