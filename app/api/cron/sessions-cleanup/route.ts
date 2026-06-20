import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = await sql`
    DELETE FROM owner_sessions
    WHERE expires_at < now()
  `;
  const tokens = await sql`
    DELETE FROM admin_login_tokens
    WHERE expires_at < now() - INTERVAL '7 days'
  `;
  const otps = await sql`
    DELETE FROM salon_claim_otp
    WHERE expires_at < now() - INTERVAL '1 day'
  `;
  const sessionsDeleted = (sessions as unknown as { count?: number }).count ?? 0;
  const tokensDeleted = (tokens as unknown as { count?: number }).count ?? 0;
  const otpsDeleted = (otps as unknown as { count?: number }).count ?? 0;
  console.log(
    `[sessions-cleanup] sessions=${sessionsDeleted} login_tokens=${tokensDeleted} otps=${otpsDeleted}`,
  );
  return NextResponse.json({
    sessionsDeleted,
    tokensDeleted,
    otpsDeleted,
  });
}
