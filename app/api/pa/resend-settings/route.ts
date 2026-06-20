/**
 * Platform-admin endpoint for managing per-salon Resend sender settings.
 *
 *   GET    /api/pa/resend-settings?salonId=<id>  → load current settings
 *   POST   /api/pa/resend-settings?salonId=<id>  → verify + save sender
 *   DELETE /api/pa/resend-settings?salonId=<id>  → clear sender
 *
 * Default flow: domain is verified against the central Resend account.
 * Escape hatch: if `apiKey` is provided in POST body, verification runs
 * against the salon's own Resend account and the key is stored encrypted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isPlatformAdminRequest } from '@/lib/platform-admin-auth';
import { sql } from '@/lib/db';
import { invalidateSalonResend } from '@/lib/resend';
import { encryptSecret } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

type Row = {
  salon_id: string;
  salon_name: string | null;
  email_from: string | null;
  email_from_name: string | null;
  resend_domain: string | null;
  resend_verified_at: string | null;
  uses_own_key: boolean;
  has_global_key: boolean;
};

const centralResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function extractDomainFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  return at === -1 ? '' : normalized.slice(at + 1);
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

async function loadSettings(salonId: string): Promise<Row | null> {
  const rows = (await sql`
    SELECT
      CAST(id AS text) AS salon_id,
      name AS salon_name,
      email_from,
      email_from_name,
      resend_domain,
      resend_verified_at,
      (resend_api_key_encrypted IS NOT NULL) AS uses_own_key,
      ${Boolean(centralResend)} AS has_global_key
    FROM salons WHERE id = ${salonId} LIMIT 1
  `) as Row[];
  return rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }
  const salonId = new URL(request.url).searchParams.get('salonId')?.trim();
  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }
  const settings = await loadSettings(salonId);
  if (!settings) {
    return NextResponse.json({ error: 'Салонът не е намерен' }, { status: 404 });
  }
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }
  const salonId = new URL(request.url).searchParams.get('salonId')?.trim();
  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    emailFrom?: string | null;
    emailFromName?: string | null;
    resendDomain?: string | null;
    apiKey?: string | null;
  };

  const emailFrom = (body.emailFrom ?? '').trim().toLowerCase();
  const emailFromName = (body.emailFromName ?? '').trim();
  const resendDomain = normalizeDomain(body.resendDomain ?? extractDomainFromEmail(emailFrom));
  const ownApiKey = (body.apiKey ?? '').trim();

  if (!ownApiKey && !centralResend) {
    return NextResponse.json({ error: 'Липсва централен Resend API ключ.' }, { status: 503 });
  }
  if (!emailFrom) {
    return NextResponse.json({ error: 'Подателят е задължителен' }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(emailFrom)) {
    return NextResponse.json({ error: 'Невалиден имейл за подател' }, { status: 400 });
  }
  if (!resendDomain) {
    return NextResponse.json({ error: 'Липсва домейн за изпращане' }, { status: 400 });
  }
  if (extractDomainFromEmail(emailFrom) !== resendDomain) {
    return NextResponse.json(
      { error: 'Имейлът на подателя трябва да е от същия verified домейн.' },
      { status: 400 },
    );
  }

  const verifyClient = ownApiKey ? new Resend(ownApiKey) : centralResend!;
  const accountLabel = ownApiKey ? 'акаунта на клиента' : 'централния Resend акаунт';

  try {
    const res = await verifyClient.domains.list();
    if (res.error) {
      return NextResponse.json(
        { error: `Resend върна грешка: ${res.error.message ?? 'unknown'}` },
        { status: 400 },
      );
    }
    const domains = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    const match = domains.find((entry: Record<string, unknown>) => {
      const name = normalizeDomain(String(entry.name ?? ''));
      return name === resendDomain;
    });
    const status = String((match as Record<string, unknown> | undefined)?.status ?? '').toLowerCase();
    if (!match) {
      return NextResponse.json(
        { error: `Домейнът ${resendDomain} не е добавен в ${accountLabel}.` },
        { status: 400 },
      );
    }
    if (!['verified', 'active'].includes(status)) {
      return NextResponse.json(
        { error: `Домейнът ${resendDomain} още не е verified в Resend.` },
        { status: 400 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Проверката в Resend не успя: ${msg}` }, { status: 400 });
  }

  const encryptedKey = ownApiKey ? encryptSecret(ownApiKey) : null;

  await sql`
    UPDATE salons SET
      resend_api_key_encrypted = ${encryptedKey},
      email_from = ${emailFrom},
      email_from_name = ${emailFromName || null},
      resend_domain = ${resendDomain},
      resend_verified_at = now()
    WHERE id = ${salonId}
  `;
  invalidateSalonResend(salonId);

  const settings = await loadSettings(salonId);
  return NextResponse.json({ ok: true, settings });
}

export async function DELETE(request: NextRequest) {
  if (!(await isPlatformAdminRequest(request))) {
    return NextResponse.json({ error: 'Нямате достъп' }, { status: 401 });
  }
  const salonId = new URL(request.url).searchParams.get('salonId')?.trim();
  if (!salonId) {
    return NextResponse.json({ error: 'Липсва salonId' }, { status: 400 });
  }

  await sql`
    UPDATE salons SET
      resend_api_key_encrypted = NULL,
      email_from = NULL,
      email_from_name = NULL,
      resend_domain = NULL,
      resend_verified_at = NULL
    WHERE id = ${salonId}
  `;
  invalidateSalonResend(salonId);

  return NextResponse.json({ ok: true });
}
