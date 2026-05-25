import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify secret token sent by Telegram via X-Telegram-Bot-Api-Secret-Token header
  if (WEBHOOK_SECRET) {
    const incoming = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
    if (incoming !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();
  const firstName = message.from?.first_name ?? '';

  if (!text.startsWith('/start')) {
    await sendTelegramMessage(
      chatId,
      'Изпрати <b>/start КОД</b>, за да свържеш Telegram с твоя Clicka салон.\n\nКода намираш в Настройки → Известия.'
    );
    return NextResponse.json({ ok: true });
  }

  // /start ABCD1234 (code is everything after "/start ")
  const parts = text.split(/\s+/);
  const code = parts[1]?.trim().toUpperCase() ?? '';

  if (!code) {
    await sendTelegramMessage(
      chatId,
      'Изпрати <b>/start КОД</b>, за да свържеш акаунта си.\n\nКода намираш в раздел Известия в Clicka.'
    );
    return NextResponse.json({ ok: true });
  }

  const salons = await sql`
    SELECT CAST(id AS text) AS salon_id, name, slug
    FROM salons
    WHERE upper(onboarding_code) = ${code}
    LIMIT 1
  `;

  if (salons.length === 0) {
    await sendTelegramMessage(
      chatId,
      `Кодът <b>${code}</b> не е намерен. Провери в Настройки → Известия и пробвай отново.`
    );
    return NextResponse.json({ ok: true });
  }

  const salon = salons[0] as Record<string, unknown>;

  await sql`
    UPDATE salons
    SET telegram_chat_id = ${String(chatId)}
    WHERE CAST(id AS text) = ${String(salon.salon_id ?? '')}
  `;

  await sendTelegramMessage(
    chatId,
    `✅ <b>${String(salon.name ?? '')}</b> е свързан успешно${firstName ? `, ${firstName}` : ''}!\n\nОтсега насетне ще получаваш известия за нови резервации тук.`
  );

  return NextResponse.json({ ok: true });
}
