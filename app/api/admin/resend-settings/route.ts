import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminRequestAccess } from '@/lib/admin-auth';
import { sql } from '@/lib/db';
import { encryptSecret } from '@/lib/encryption';
import { invalidateSalonResend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

type Row = {
  email_from: string | null;
  email_from_name: string | null;
  resend_verified_at: string | null;
  has_key: boolean;
};

async function loadSettings(salonId: string): Promise<Row> {
  const rows = (await sql`
    SELECT
      email_from,
      email_from_name,
      resend_verified_at,
      (resend_api_key_encrypted IS NOT NULL) AS has_key
    FROM salons WHERE id = ${salonId} LIMIT 1
  `) as Row[];
  return rows[0] ?? { email_from: null, email_from_name: null, resend_verified_at: null, has_key: false };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;
  const settings = await loadSettings(auth.salon.salonId);
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    apiKey?: string | null;
    emailFrom?: string | null;
    emailFromName?: string | null;
  };

  const apiKey = (body.apiKey ?? '').trim();
  const emailFrom = (body.emailFrom ?? '').trim().toLowerCase();
  const emailFromName = (body.emailFromName ?? '').trim();

  if (!apiKey || !emailFrom) {
    return NextResponse.json({ error: 'API ключ и подател са задължителни' }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(emailFrom)) {
    return NextResponse.json({ error: 'Невалиден имейл за подател' }, { status: 400 });
  }

  // Verify key by hitting Resend's domains endpoint (cheap, no email sent).
  try {
    const verify = new Resend(apiKey);
    const res = await verify.domains.list();
    if (res.error) {
      return NextResponse.json(
        { error: `Resend отхвърли ключа: ${res.error.message ?? 'unknown'}` },
        { status: 400 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Verify failed: ${msg}` }, { status: 400 });
  }

  const encrypted = encryptSecret(apiKey);
  await sql`
    UPDATE salons SET
      resend_api_key_encrypted = ${encrypted},
      email_from = ${emailFrom},
      email_from_name = ${emailFromName || null},
      resend_verified_at = now()
    WHERE id = ${auth.salon.salonId}
  `;
  invalidateSalonResend(auth.salon.salonId);

  const settings = await loadSettings(auth.salon.salonId);
  return NextResponse.json({ ok: true, settings });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const auth = await requireAdminRequestAccess(request, slug);
  if (!auth.ok) return auth.response;

  await sql`
    UPDATE salons SET
      resend_api_key_encrypted = NULL,
      email_from = NULL,
      email_from_name = NULL,
      resend_verified_at = NULL
    WHERE id = ${auth.salon.salonId}
  `;
  invalidateSalonResend(auth.salon.salonId);

  return NextResponse.json({ ok: true });
}
