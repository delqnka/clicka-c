import { NextRequest, NextResponse } from 'next/server';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import crypto from 'crypto';

const ALLOWED_PLANS = ['solo_bonus_12m', 'solo_bonus_6m', 'team_bonus_12m', 'team_bonus_6m'];

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const grants = await sql`
    SELECT id, email, plan_type, token, created_at, used_at, salon_id
    FROM plan_grants
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({ grants });
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, planType } = body as { email?: string; planType?: string };

  if (!email || !planType) {
    return NextResponse.json({ error: 'Липсва email или planType' }, { status: 400 });
  }
  if (!ALLOWED_PLANS.includes(planType)) {
    return NextResponse.json({ error: 'Невалиден план' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const token = crypto.randomBytes(16).toString('hex');

  await sql`
    INSERT INTO plan_grants (email, plan_type, token)
    VALUES (${normalizedEmail}, ${planType}, ${token})
  `;

  return NextResponse.json({ ok: true, token });
}

export async function DELETE(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: 'Липсва id' }, { status: 400 });
  }

  await sql`DELETE FROM plan_grants WHERE id = ${id} AND used_at IS NULL`;

  return NextResponse.json({ ok: true });
}
