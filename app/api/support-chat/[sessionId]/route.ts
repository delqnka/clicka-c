import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params;
    const after = _req.nextUrl.searchParams.get('after') ?? '1970-01-01';

    const rows = await sql`
      SELECT id, role, content, image_url, created_at
      FROM salon_chat_messages
      WHERE session_id = ${sessionId}
        AND created_at > ${after}::timestamptz
      ORDER BY created_at ASC
      LIMIT 200
    ` as { id: string; role: string; content: string; image_url: string | null; created_at: string }[];

    return NextResponse.json({ messages: rows });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
