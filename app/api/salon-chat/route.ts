import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { telegramPost } from '@/lib/telegram';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clicka.bg';

// POST — create session + send first message, or continue existing session
export async function POST(req: NextRequest) {
  try {
    const { salonId, sessionId, clientName, message } = await req.json();

    if (!salonId || !message?.trim()) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    // Get salon telegram chat id
    const salonRows = await sql`
      SELECT CAST(id AS text) AS id, name, slug, custom_domain, telegram_chat_id
      FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as { id: string; name: string; slug: string; custom_domain: string | null; telegram_chat_id: string | null }[];

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

    // Auto-reply with booking link on every client message
    const bookingUrl = salon.custom_domain
      ? `https://${salon.custom_domain}/#rezerviraj`
      : `https://${salon.slug}.${ROOT_DOMAIN}/#rezerviraj`;
    const autoReply = `Свободните часове и записването можете да направите директно тук:\n${bookingUrl}`;
    await sql`
      INSERT INTO salon_chat_messages (session_id, role, content)
      VALUES (${activeSessionId}, 'salon', ${autoReply})
    `;

    // Forward to Telegram if salon has it connected
    if (salon.telegram_chat_id) {
      const header = isNew
        ? `💬 Имате нов чат с <b>${clientName ?? 'Клиент'}</b>\n\n`
        : `💬 <b>${clientName ?? 'Клиент'}:</b>\n`;

      const text = `${header}${message.trim()}`;

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
          WHERE id = (
            SELECT id FROM salon_chat_messages
            WHERE session_id = ${activeSessionId} AND role = 'client'
            ORDER BY created_at DESC
            LIMIT 1
          )
        `;
      }

      // Mark this session as the active one so owner can reply without using Telegram Reply
      await sql`
        UPDATE salons
        SET bot_conversation_state = ${JSON.stringify({ type: 'waiting_chat_reply', session_id: activeSessionId })}::jsonb
        WHERE telegram_chat_id = ${salon.telegram_chat_id}
      `.catch(() => {});
    }

    return NextResponse.json({ sessionId: activeSessionId });
  } catch (e) {
    console.error('[salon-chat POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
