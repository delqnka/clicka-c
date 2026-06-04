import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { telegramPost } from '@/lib/telegram';

// POST — create session + send first message, or continue existing session
export async function POST(req: NextRequest) {
  try {
    const { salonId, sessionId, clientName, message } = await req.json();

    if (!salonId || !message?.trim()) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    // Get salon telegram chat id
    const salonRows = await sql`
      SELECT CAST(id AS text) AS id, name, telegram_chat_id
      FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as { id: string; name: string; telegram_chat_id: string | null }[];

    if (salonRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const salon = salonRows[0]!;

    // Create or reuse session
    let activeSessionId = sessionId as string | null;
    let isNew = false;

    if (!activeSessionId) {
      const sessRows = await sql`
        INSERT INTO salon_chat_sessions (salon_id, client_name)
        VALUES (${salonId}, ${clientName ?? 'Клиент'})
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

    // Save client message
    await sql`
      INSERT INTO salon_chat_messages (session_id, role, content)
      VALUES (${activeSessionId}, 'client', ${message.trim()})
    `;

    // Forward to Telegram if salon has it connected
    if (salon.telegram_chat_id) {
      const header = isNew
        ? `💬 Имате нов чат с <b>${clientName ?? 'Клиент'}</b>\n\n`
        : `💬 <b>${clientName ?? 'Клиент'}:</b>\n`;

      const text = `${header}${message.trim()}\n\n<i>↩️ Reply на това съобщение за да отговориш на клиента</i>`;

      const result = await telegramPost('sendMessage', {
        chat_id: salon.telegram_chat_id,
        text,
        parse_mode: 'HTML',
      }) as { ok: boolean; result?: { message_id: number } };

      // Save telegram message_id so we can match replies
      if (result?.ok && result.result?.message_id) {
        await sql`
          UPDATE salon_chat_messages
          SET telegram_message_id = ${result.result.message_id}
          WHERE session_id = ${activeSessionId} AND role = 'client'
          ORDER BY created_at DESC
          LIMIT 1
        `;
      }
    }

    return NextResponse.json({ sessionId: activeSessionId });
  } catch (e) {
    console.error('[salon-chat POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
