import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import {
  deleteClassScheduleOverride,
  listClassScheduleOverrides,
  upsertClassScheduleOverride,
} from '@/lib/class-schedule-overrides';
import { normalizeClassScheduleOverrides } from '@/lib/class-schedule';
import { deferRevalidateSalonPublicCache } from '@/lib/defer-revalidate-salon';

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeRangeDate(value: string | null): string {
  const text = String(value ?? '').trim();
  return isIsoDate(text) ? text : '';
}

async function requireAccess(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return { error: auth.response } as const;
  return { auth } as const;
}

export async function GET(request: NextRequest) {
  const access = await requireAccess(request);
  if ('error' in access) return access.error;

  const from = normalizeRangeDate(request.nextUrl.searchParams.get('from'));
  const to = normalizeRangeDate(request.nextUrl.searchParams.get('to'));
  if (!from || !to || from > to) {
    return NextResponse.json({ error: 'Невалиден период.' }, { status: 400 });
  }

  const overrides = await listClassScheduleOverrides(access.auth.salon.salonId, from, to);
  return NextResponse.json({ overrides });
}

export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request);
  if ('error' in access) return access.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
  }

  const [input] = normalizeClassScheduleOverrides([body]);
  if (!input) {
    return NextResponse.json({ error: 'Попълни валидни дата, час, клас и треньор.' }, { status: 400 });
  }

  const override = await upsertClassScheduleOverride(access.auth.salon.salonId, input);
  deferRevalidateSalonPublicCache({
    slug: access.auth.salon.slug,
    customDomain: access.auth.salon.customDomain,
  });

  return NextResponse.json({ success: true, override });
}

export async function DELETE(request: NextRequest) {
  const access = await requireAccess(request);
  if ('error' in access) return access.error;

  const originalDate = normalizeRangeDate(request.nextUrl.searchParams.get('originalDate'));
  const originalTime = String(request.nextUrl.searchParams.get('originalTime') ?? '').trim();
  const originalClassName = String(request.nextUrl.searchParams.get('originalClassName') ?? '').trim();
  const originalTrainer = String(request.nextUrl.searchParams.get('originalTrainer') ?? '').trim();

  if (!originalDate || !/^\d{1,2}:\d{2}$/.test(originalTime)) {
    return NextResponse.json({ error: 'Невалиден клас за нулиране.' }, { status: 400 });
  }

  await deleteClassScheduleOverride(
    access.auth.salon.salonId,
    originalDate,
    originalTime.length === 4 ? `0${originalTime}` : originalTime,
    originalClassName,
    originalTrainer,
  );
  deferRevalidateSalonPublicCache({
    slug: access.auth.salon.slug,
    customDomain: access.auth.salon.customDomain,
  });

  return NextResponse.json({ success: true });
}
