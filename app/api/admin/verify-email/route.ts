import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sha256 } from '@/lib/admin-auth';
import { sendEmailChangedConfirmation } from '@/lib/resend';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const ownerId = request.nextUrl.searchParams.get('owner') ?? '';

  if (!token || !ownerId) {
    return new NextResponse(errorPage('Невалиден линк.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const tokenHash = sha256(token);

  const rows = await sql`
    SELECT pending_email, pending_email_token_hash, pending_email_expires_at
    FROM site_owners
    WHERE id = ${ownerId}
    LIMIT 1
  `;

  const row = rows[0] as Record<string, unknown> | undefined;

  if (!row || !row.pending_email || row.pending_email_token_hash !== tokenHash) {
    return new NextResponse(errorPage('Линкът е невалиден или вече е използван.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const expiresAt = new Date(String(row.pending_email_expires_at ?? ''));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return new NextResponse(
      errorPage('Линкът е изтекъл. Заявете нова смяна на имейл от панела.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const newEmail = String(row.pending_email);

  // Check not taken by someone else in the meantime
  const taken = await sql`
    SELECT id FROM site_owners WHERE email_norm = ${newEmail} AND id <> ${ownerId} LIMIT 1
  `;
  if (taken.length > 0) {
    await sql`
      UPDATE site_owners
      SET pending_email = null, pending_email_token_hash = null, pending_email_expires_at = null
      WHERE id = ${ownerId}
    `;
    return new NextResponse(
      errorPage('Този имейл вече се използва от друг акаунт. Заявете нова смяна.'),
      { status: 409, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // Apply the email change
  await sql`
    UPDATE site_owners
    SET email = ${newEmail},
        email_norm = ${newEmail},
        pending_email = null,
        pending_email_token_hash = null,
        pending_email_expires_at = null,
        updated_at = now()
    WHERE id = ${ownerId}
  `;

  try {
    await sendEmailChangedConfirmation(newEmail);
  } catch {
    // non-fatal
  }

  return new NextResponse(successPage(newEmail), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function successPage(email: string) {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Имейлът е потвърден — Clicka.bg</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 16px; padding: 40px 32px; max-width: 440px;
            width: 100%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    h1 { font-size: 22px; margin: 0 0 12px; color: #000; }
    p  { color: #555; line-height: 1.7; margin: 0 0 24px; font-size: 15px; }
    a  { display: inline-block; background: #000; color: #fff; padding: 12px 24px;
         border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ Имейлът е потвърден</h1>
    <p>Новият ви имейл за вход е:<br /><strong>${email}</strong></p>
    <a href="/admin">Към панела</a>
  </div>
</body>
</html>`;
}

function errorPage(message: string) {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Грешка — Clicka.bg</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 16px; padding: 40px 32px; max-width: 440px;
            width: 100%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    h1 { font-size: 22px; margin: 0 0 12px; color: #c00; }
    p  { color: #555; line-height: 1.7; margin: 0 0 24px; font-size: 15px; }
    a  { display: inline-block; background: #000; color: #fff; padding: 12px 24px;
         border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Грешка</h1>
    <p>${message}</p>
    <a href="/admin">Към панела</a>
  </div>
</body>
</html>`;
}
