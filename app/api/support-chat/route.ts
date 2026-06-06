import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { telegramPost } from '@/lib/telegram';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const OWNER_CHAT_ID = process.env.CLICKA_OWNER_CHAT_ID ?? '';
const SUPPORT_SALON_ID = 'clicka_support';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('support-chat', ip, 10, 60 * 1000);
  if (rl.limited) return NextResponse.json({ error: 'Твърде много заявки.' }, { status: 429 });

  try {
    const { sessionId, clientName, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    let activeSessionId = sessionId as string | null;
    let isNew = false;

    if (!activeSessionId) {
      const sessRows = await sql`
        INSERT INTO salon_chat_sessions (salon_id, client_name)
        VALUES (${SUPPORT_SALON_ID}, ${clientName ?? 'Посетител'})
        RETURNING id
      ` as { id: string }[];
      activeSessionId = sessRows[0]!.id;
      isNew = true;
    } else {
      await sql`
        UPDATE salon_chat_sessions SET last_message_at = now()
        WHERE id = ${activeSessionId}
      `;
    }

    await sql`
      INSERT INTO salon_chat_messages (session_id, role, content)
      VALUES (${activeSessionId}, 'client', ${message.trim()})
    `;

    if (OWNER_CHAT_ID) {
      const header = isNew
        ? `💬 Нов чат от <b>${clientName ?? 'Посетител'}</b> на clicka.bg\n\n`
        : `💬 <b>${clientName ?? 'Посетител'}:</b>\n`;

      const result = await telegramPost('sendMessage', {
        chat_id: OWNER_CHAT_ID,
        text: `${header}${message.trim()}`,
        parse_mode: 'HTML',
      }) as { ok: boolean; result?: { message_id: number } };

      if (result?.ok && result.result?.message_id) {
        await sql`
          UPDATE salon_chat_messages
          SET telegram_message_id = ${result.result.message_id}
          WHERE id = (
            SELECT id FROM salon_chat_messages
            WHERE session_id = ${activeSessionId} AND role = 'client'
            ORDER BY created_at DESC
            LIMIT 1
          )
        `;
      }
    }

    return NextResponse.json({ sessionId: activeSessionId });
  } catch (e) {
    console.error('[support-chat POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
