import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { createClientPackage } from '@/lib/client-packages';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: {
    clientName?: string;
    clientPhone?: string | null;
    clientEmail?: string | null;
    totalSessions?: number;
    price?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const clientName = body.clientName?.trim();
  const totalSessions = Math.round(Number(body.totalSessions) || 0);
  if (!clientName || ![4, 8].includes(totalSessions)) {
    return NextResponse.json({ error: 'Изберете клиент и пакет 4 или 8 тренировки.' }, { status: 400 });
  }

  const pkg = await createClientPackage({
    salonId: auth.salon.salonId,
    clientName,
    clientPhone: body.clientPhone,
    clientEmail: body.clientEmail,
    totalSessions,
    price: body.price ?? null,
    source: 'admin',
  });

  return NextResponse.json({ ok: true, packageId: pkg.id });
}
