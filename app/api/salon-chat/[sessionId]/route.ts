import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET — poll for new messages after a given timestamp
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params;
    const after = _req.nextUrl.searchParams.get('after') ?? '1970-01-01';

    const rows = await sql`
      SELECT id, role, content, created_at
      FROM salon_chat_messages
      WHERE session_id = ${sessionId}
        AND created_at > ${after}::timestamptz
      ORDER BY created_at ASC
      LIMIT 50
    ` as { id: string; role: string; content: string; created_at: string }[];

    return NextResponse.json({ messages: rows });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
