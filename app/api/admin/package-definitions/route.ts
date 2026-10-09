import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  deleteClientPackageDefinition,
  listClientPackageDefinitions,
  upsertClientPackageDefinition,
} from '@/lib/client-package-definitions';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

type PackageDefinitionBody = {
  id?: string;
  name?: string;
  description?: string | null;
  totalSessions?: number;
  price?: number | null;
  validityDays?: number;
  serviceIds?: string[];
  isActive?: boolean;
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const packages = await listClientPackageDefinitions(auth.salon.salonId);
  return NextResponse.json({ packages });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: PackageDefinitionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Името на пакета е задължително.' }, { status: 400 });

  const pkg = await upsertClientPackageDefinition({
    salonId: auth.salon.salonId,
    name,
    description: body.description ?? null,
    totalSessions: Number(body.totalSessions ?? 1),
    price: body.price == null ? null : Number(body.price),
    validityDays: Number(body.validityDays ?? 30),
    serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : [],
    isActive: body.isActive !== false,
  });
  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({ package: pkg });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  let body: PackageDefinitionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!id || !name) return NextResponse.json({ error: 'Липсва id или име на пакет.' }, { status: 400 });

  const pkg = await upsertClientPackageDefinition({
    id,
    salonId: auth.salon.salonId,
    name,
    description: body.description ?? null,
    totalSessions: Number(body.totalSessions ?? 1),
    price: body.price == null ? null : Number(body.price),
    validityDays: Number(body.validityDays ?? 30),
    serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : [],
    isActive: body.isActive !== false,
  });
  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });

  return NextResponse.json({ package: pkg });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Липсва id.' }, { status: 400 });

  await deleteClientPackageDefinition({ salonId: auth.salon.salonId, id });
  deferRevalidateSalonPublicCache({
    slug: auth.salon.slug,
    customDomain: auth.salon.customDomain,
  });
  return NextResponse.json({ ok: true });
}
