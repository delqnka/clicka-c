import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const { salonId, clientName, clientPhone, reason } = await req.json() as {
      salonId: string;
      clientName: string;
      clientPhone: string;
      reason?: string;
    };

    if (!salonId || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    const rows = await sql`
      SELECT telegram_chat_id, name FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as { telegram_chat_id: string | null; name: string }[];

    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const salon = rows[0]!;
    const chatId = salon.telegram_chat_id;

    if (chatId) {
      // Look up upcoming bookings for this client by name (case-insensitive partial match)
      const bookings = await sql`
        SELECT service_name, date, time, staff_name
        FROM bookings
        WHERE salon_id = ${salonId}
          AND LOWER(client_name) LIKE ${'%' + clientName.toLowerCase() + '%'}
          AND date >= CURRENT_DATE
          AND status NOT IN ('cancelled', 'completed')
        ORDER BY date ASC
        LIMIT 3
      ` as { service_name: string; date: string; time: string; staff_name: string | null }[];

      const lines = [
        `📞 <b>Клиент иска обратна връзка</b>`,
        ``,
        `👤 Име: <b>${clientName}</b>`,
        `📱 Телефон: <b>${clientPhone}</b>`,
      ];

      if (bookings.length > 0) {
        lines.push(``, `📅 <b>Намерени резервации:</b>`);
        for (const b of bookings) {
          const dateParts = b.date.split('-');
          const dateLabel = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}` : b.date;
          const staffPart = b.staff_name ? ` @ ${b.staff_name}` : '';
          lines.push(`• ${b.service_name}${staffPart} — ${dateLabel} в ${b.time}`);
        }
      }

      if (reason) lines.push(``, `💬 Повод: ${reason}`);
      lines.push(``, `⬆️ Обади се на клиента`);
      await sendTelegramMessage(chatId, lines.join('\n'));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[salon-ai-chat/contact]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
