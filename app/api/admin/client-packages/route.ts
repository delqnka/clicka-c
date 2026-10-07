import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { createClientPackage, deactivateClientPackage, updateClientPackage } from '@/lib/client-packages';
import { runAfterResponse } from '@/lib/run-after-response';
import { sendClientPackageActivatedEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: {
    clientName?: string;
    clientPhone?: string | null;
    clientEmail?: string | null;
    packageName?: string | null;
    totalSessions?: number;
    usedSessions?: number | null;
    price?: number | null;
    validFrom?: string | null;
    validTo?: string | null;
    validityDays?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const clientName = body.clientName?.trim();
  const totalSessions = Math.round(Number(body.totalSessions) || 0);
  const usedSessions = Math.max(0, Math.round(Number(body.usedSessions ?? 0) || 0));
  if (!clientName || totalSessions < 1) {
    return NextResponse.json({ error: 'Изберете клиент и въведете поне 1 кредит.' }, { status: 400 });
  }
  if (usedSessions > totalSessions) {
    return NextResponse.json({ error: 'Използваните кредити не могат да са повече от общите.' }, { status: 400 });
  }

  const pkg = await createClientPackage({
    salonId: auth.salon.salonId,
    clientName,
    clientPhone: body.clientPhone,
    clientEmail: body.clientEmail,
    packageName: body.packageName,
    totalSessions,
    usedSessions,
    price: body.price ?? null,
    validFrom: body.validFrom,
    validTo: body.validTo,
    validityDays: body.validityDays,
    source: 'admin',
  });

  const clientEmail = body.clientEmail?.trim().toLowerCase() || '';
  if (clientEmail) {
    runAfterResponse(sendClientPackageActivatedEmail(clientEmail, {
      salonId: auth.salon.salonId,
      salonName: auth.salon.name,
      clientName,
      packageName: pkg.packageName,
      totalSessions: pkg.totalSessions,
      usedSessions: pkg.usedSessions,
      remainingSessions: pkg.remainingSessions,
      validFrom: body.validFrom ?? pkg.purchasedAt,
      validTo: pkg.expiresAt,
    }));
  }

  return NextResponse.json({ ok: true, packageId: pkg.id, package: pkg, emailSent: Boolean(clientEmail) });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: {
    packageId?: string;
    packageName?: string | null;
    totalSessions?: number;
    usedSessions?: number;
    price?: number | null;
    validTo?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const packageId = body.packageId?.trim();
  const totalSessions = Math.round(Number(body.totalSessions) || 0);
  const usedSessions = Math.max(0, Math.round(Number(body.usedSessions ?? 0) || 0));
  if (!packageId || totalSessions < 1) {
    return NextResponse.json({ error: 'Липсва пакет или кредити.' }, { status: 400 });
  }
  if (usedSessions > totalSessions) {
    return NextResponse.json({ error: 'Използваните кредити не могат да са повече от общите.' }, { status: 400 });
  }

  const pkg = await updateClientPackage({
    salonId: auth.salon.salonId,
    packageId,
    packageName: body.packageName,
    totalSessions,
    usedSessions,
    price: body.price ?? null,
    validTo: body.validTo,
  });

  return NextResponse.json({ ok: true, package: pkg });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const packageId = request.nextUrl.searchParams.get('packageId')?.trim();
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;
  if (!packageId) return NextResponse.json({ error: 'Липсва пакет.' }, { status: 400 });

  await deactivateClientPackage({ salonId: auth.salon.salonId, packageId });
  return NextResponse.json({ ok: true });
}
